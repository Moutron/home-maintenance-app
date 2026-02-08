import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sendWarrantyExpirationEmail } from "@/lib/notifications/warranty-emails";
import { addDays } from "date-fns";

/**
 * Test endpoint to send a warranty expiration email to the current user
 * Useful for testing email templates
 */
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

    // Create sample warranty data for testing
    const testWarranties = [
      {
        name: "HVAC System (Trane)",
        type: "appliance",
        expiryDate: addDays(new Date(), 5), // Expires in 5 days
        daysUntilExpiry: 5,
        home: "123 Main St, Anytown, CA",
      },
      {
        name: "Refrigerator (Samsung)",
        type: "appliance",
        expiryDate: addDays(new Date(), 25), // Expires in 25 days
        daysUntilExpiry: 25,
        home: "123 Main St, Anytown, CA",
      },
      {
        name: "Roof (Asphalt Shingle)",
        type: "exterior feature",
        expiryDate: addDays(new Date(), 60), // Expires in 60 days
        daysUntilExpiry: 60,
        home: "123 Main St, Anytown, CA",
      },
    ];

    await sendWarrantyExpirationEmail(email, testWarranties);

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      email,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

