import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTaskReminderEmail, sendBulkTaskReminders } from "@/lib/notifications/email";
import { sendPushNotification, createTaskReminderPush } from "@/lib/notifications/push";

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

function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { daysAhead = [30, 14, 7] } = body; // Default: 30, 14, and 7 days ahead

    // Get user's homes
    const homes = await prisma.home.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const homeIds = homes.map((h) => h.id);

    if (homeIds.length === 0) {
      return NextResponse.json({ sent: 0, message: "No homes found" });
    }

    // Find tasks due within the specified days
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + Math.max(...daysAhead));

    const tasks = await prisma.maintenanceTask.findMany({
      where: {
        homeId: { in: homeIds },
        completed: false,
        nextDueDate: {
          gte: now,
          lte: maxDate,
        },
      },
      include: {
        home: {
          select: {
            address: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Group tasks by days until due
    const tasksByDays: Record<number, typeof tasks> = {};
    for (const task of tasks) {
      const days = daysUntil(new Date(task.nextDueDate));
      if (daysAhead.includes(days)) {
        if (!tasksByDays[days]) {
          tasksByDays[days] = [];
        }
        tasksByDays[days].push(task);
      }
    }

    // Send emails for each day threshold
    let totalSent = 0;
    for (const days of daysAhead) {
      const tasksForDay = tasksByDays[days] || [];
      if (tasksForDay.length > 0) {
        const reminderData = tasksForDay.map((task) => ({
          taskName: task.name,
          taskDescription: task.description,
          dueDate: task.nextDueDate.toISOString(),
          homeAddress: `${task.home.address}, ${task.home.city}, ${task.home.state}`,
          category: task.category,
          priority: task.priority || undefined,
          daysUntilDue: days,
        }));

        try {
          // Send email
          if (tasksForDay.length === 1) {
            await sendTaskReminderEmail(email, reminderData[0]);
          } else {
            await sendBulkTaskReminders(email, reminderData);
          }
          totalSent += tasksForDay.length;

          // Send push notifications for urgent tasks (overdue or due today)
          if (days <= 0) {
            try {
              // Get user's OneSignal player ID
              // TODO: Uncomment after adding oneSignalPlayerId to User model
              // const userWithPush = await prisma.user.findUnique({
              //   where: { id: user.id },
              //   select: { oneSignalPlayerId: true },
              // });

              // if (userWithPush?.oneSignalPlayerId) {
              //   // Send push for each urgent task
              //   for (const task of tasksForDay) {
              //     const pushNotification = createTaskReminderPush(
              //       task.name,
              //       days,
              //       task.id,
              //       task.homeAddress
              //     );
              //     await sendPushNotification(userWithPush.oneSignalPlayerId, pushNotification);
              //   }
              // }
            } catch (error) {
              console.error(`Error sending push notifications for ${days} days ahead:`, error);
              // Don't fail the whole request if push fails
            }
          }
        } catch (error) {
          console.error(`Error sending reminders for ${days} days ahead:`, error);
        }
      }
    }

    return NextResponse.json({
      sent: totalSent,
      message: `Sent reminders for ${totalSent} task${totalSent !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("Error sending reminders:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

