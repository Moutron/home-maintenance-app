import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification, createTaskReminderPush, createWarrantyExpirationPush } from "@/lib/notifications/push";

/**
 * API route to send push notifications
 * Can be called internally or by cron jobs
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    const body = await request.json();
    const { type, taskId, warrantyId, playerId } = body;

    // For cron jobs, allow without auth if CRON_SECRET is provided
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!clerkId && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!playerId && !clerkId) {
      return NextResponse.json(
        { error: "Player ID or user ID is required" },
        { status: 400 }
      );
    }

    // If playerId is provided, send directly
    if (playerId) {
      let notification;
      
      if (type === "task_reminder" && taskId) {
        const task = await prisma.maintenanceTask.findUnique({
          where: { id: taskId },
          include: { home: true },
        });
        
        if (task) {
          const daysUntilDue = Math.ceil(
            (new Date(task.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          notification = createTaskReminderPush(
            task.name,
            daysUntilDue,
            task.id,
            `${task.home.address}, ${task.home.city}`
          );
        }
      } else if (type === "warranty_expiration" && warrantyId) {
        // Handle warranty expiration
        // You'll need to fetch warranty data based on warrantyId
        // For now, this is a placeholder
        notification = {
          title: "Warranty Expiring",
          message: "A warranty is expiring soon",
          url: "/warranties",
        };
      }

      if (notification) {
        await sendPushNotification(playerId, notification);
        return NextResponse.json({ success: true });
      }
    }

    // If clerkId is provided, get player ID from user
    if (clerkId) {
      // TODO: Get player ID from user's OneSignal subscription
      // This requires adding oneSignalPlayerId to User model
      return NextResponse.json(
        { error: "User push subscription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    return NextResponse.json(
      { error: "Failed to send push notification" },
      { status: 500 }
    );
  }
}

