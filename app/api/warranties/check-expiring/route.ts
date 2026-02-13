import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { addDays, differenceInDays } from "date-fns";
import { sendWarrantyExpirationEmail } from "@/lib/notifications/warranty-emails";
import { sendPushNotification, createWarrantyExpirationPush } from "@/lib/notifications/push";

// Helper function to get or create user from Clerk
async function getOrCreateUser(clerkId: string, email: string) {
  let user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId,
        email,
      },
    });
  }

  return user;
}

/**
 * API route to check for expiring warranties and send email notifications
 * This can be called by a cron job or scheduled task
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add API key authentication for cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);
    const sixtyDaysFromNow = addDays(now, 60);
    const ninetyDaysFromNow = addDays(now, 90);

    // Get all users
    const users = await prisma.user.findMany({
      include: {
        homes: {
          include: {
            appliances: {
              where: {
                warrantyExpiry: {
                  not: null,
                },
              },
            },
            exteriorFeatures: {
              where: {
                warrantyExpiry: {
                  not: null,
                },
              },
            },
            interiorFeatures: {
              where: {
                warrantyExpiry: {
                  not: null,
                },
              },
            },
          },
        },
      },
    });

    const notificationsSent: Array<{
      userId: string;
      email: string;
      count: number;
    }> = [];

    for (const user of users) {
      const expiringWarranties: Array<{
        name: string;
        type: string;
        expiryDate: Date;
        daysUntilExpiry: number;
        home: string;
      }> = [];

      for (const home of user.homes) {
        // Check appliances
        for (const appliance of home.appliances) {
          if (appliance.warrantyExpiry) {
            const expiry = new Date(appliance.warrantyExpiry);
            const daysUntilExpiry = differenceInDays(expiry, now);

            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
              expiringWarranties.push({
                name: `${appliance.applianceType}${appliance.brand ? ` (${appliance.brand})` : ""}`,
                type: "appliance",
                expiryDate: expiry,
                daysUntilExpiry,
                home: `${home.address}, ${home.city}`,
              });
            }
          }
        }

        // Check exterior features
        for (const feature of home.exteriorFeatures) {
          if (feature.warrantyExpiry) {
            const expiry = new Date(feature.warrantyExpiry);
            const daysUntilExpiry = differenceInDays(expiry, now);

            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
              expiringWarranties.push({
                name: `${feature.featureType}${feature.material ? ` (${feature.material})` : ""}`,
                type: "exterior feature",
                expiryDate: expiry,
                daysUntilExpiry,
                home: `${home.address}, ${home.city}`,
              });
            }
          }
        }

        // Check interior features
        for (const feature of home.interiorFeatures) {
          if (feature.warrantyExpiry) {
            const expiry = new Date(feature.warrantyExpiry);
            const daysUntilExpiry = differenceInDays(expiry, now);

            if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
              expiringWarranties.push({
                name: `${feature.featureType}${feature.material ? ` (${feature.material})` : ""}`,
                type: "interior feature",
                expiryDate: expiry,
                daysUntilExpiry,
                home: `${home.address}, ${home.city}`,
              });
            }
          }
        }
      }

      // Send email if there are expiring warranties
      if (expiringWarranties.length > 0) {
        try {
          await sendWarrantyExpirationEmail(user.email, expiringWarranties);
          notificationsSent.push({
            userId: user.id,
            email: user.email,
            count: expiringWarranties.length,
          });
        } catch (error) {
          console.error(`Failed to send email to ${user.email}:`, error);
        }

        // Send push notifications for critical warranties (expiring in 7 days or less)
        // Note: This requires oneSignalPlayerId field in User model
        // For now, we'll try to get it if it exists
        const criticalWarranties = expiringWarranties.filter(
          (w) => w.daysUntilExpiry <= 7
        );

        if (criticalWarranties.length > 0) {
          try {
            // Get user's OneSignal player ID
            // TODO: Uncomment after adding oneSignalPlayerId to User model
            // const userWithPush = await prisma.user.findUnique({
            //   where: { id: user.id },
            //   select: { oneSignalPlayerId: true },
            // });

            // if (userWithPush?.oneSignalPlayerId) {
            //   // Send push for the most urgent warranty
            //   const mostUrgent = criticalWarranties[0];
            //   const pushNotification = createWarrantyExpirationPush(
            //     mostUrgent.name,
            //     mostUrgent.daysUntilExpiry,
            //     mostUrgent.name, // Using name as ID for now
            //     mostUrgent.home
            //   );
            //   await sendPushNotification(userWithPush.oneSignalPlayerId, pushNotification);
            // }
          } catch (error) {
            console.error(`Failed to send push notification to user ${user.id}:`, error);
            // Don't fail the whole request if push fails
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent: notificationsSent.length,
      details: notificationsSent,
      message: `Sent ${notificationsSent.length} warranty expiration notification(s)`,
    });
  } catch (error) {
    console.error("Error checking expiring warranties:", error);
    return NextResponse.json(
      { error: "Failed to check warranties" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser?.emailAddresses?.[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const user = await getOrCreateUser(clerkId, email);

    const now = new Date();
    const ninetyDaysFromNow = addDays(now, 90);

    const home = await prisma.home.findFirst({
      where: {
        userId: user.id,
      },
      include: {
        appliances: {
          where: {
            warrantyExpiry: {
              not: null,
              lte: ninetyDaysFromNow,
            },
          },
        },
        exteriorFeatures: {
          where: {
            warrantyExpiry: {
              not: null,
              lte: ninetyDaysFromNow,
            },
          },
        },
        interiorFeatures: {
          where: {
            warrantyExpiry: {
              not: null,
              lte: ninetyDaysFromNow,
            },
          },
        },
      },
    });

    if (!home) {
      return NextResponse.json({
        message: "No expiring warranties found",
        expiringWarranties: [],
      });
    }

    const expiringWarranties: Array<{
      name: string;
      type: string;
      expiryDate: Date;
      daysUntilExpiry: number;
    }> = [];

    home.appliances.forEach((appliance: { warrantyExpiry: Date | null; applianceType: string; brand?: string | null }) => {
      if (appliance.warrantyExpiry) {
        const expiry = new Date(appliance.warrantyExpiry);
        const daysUntilExpiry = differenceInDays(expiry, now);
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
          expiringWarranties.push({
            name: `${appliance.applianceType}${appliance.brand ? ` (${appliance.brand})` : ""}`,
            type: "appliance",
            expiryDate: expiry,
            daysUntilExpiry,
          });
        }
      }
    });

    home.exteriorFeatures.forEach((feature: { warrantyExpiry: Date | null; featureType: string; material?: string | null }) => {
      if (feature.warrantyExpiry) {
        const expiry = new Date(feature.warrantyExpiry);
        const daysUntilExpiry = differenceInDays(expiry, now);
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
          expiringWarranties.push({
            name: `${feature.featureType}${feature.material ? ` (${feature.material})` : ""}`,
            type: "exterior feature",
            expiryDate: expiry,
            daysUntilExpiry,
          });
        }
      }
    });

    home.interiorFeatures.forEach((feature: { warrantyExpiry: Date | null; featureType: string; material?: string | null }) => {
      if (feature.warrantyExpiry) {
        const expiry = new Date(feature.warrantyExpiry);
        const daysUntilExpiry = differenceInDays(expiry, now);
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
          expiringWarranties.push({
            name: `${feature.featureType}${feature.material ? ` (${feature.material})` : ""}`,
            type: "interior feature",
            expiryDate: expiry,
            daysUntilExpiry,
          });
        }
      }
    });

    return NextResponse.json({
      expiringWarranties,
      count: expiringWarranties.length,
    });
  } catch (error) {
    console.error("Error fetching expiring warranties:", error);
    return NextResponse.json(
      { error: "Failed to fetch warranties" },
      { status: 500 }
    );
  }
}

