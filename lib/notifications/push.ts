import OneSignal from "onesignal-node";

// Lazy-load OneSignal client to avoid build-time errors
function getOneSignalClient() {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    throw new Error("OneSignal credentials not configured");
  }

  return new OneSignal.Client(appId, restApiKey);
}

export interface PushNotificationData {
  title: string;
  message: string;
  url?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  playerId: string,
  notification: PushNotificationData
): Promise<void> {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    console.warn("OneSignal credentials not configured. Skipping push notification.");
    return;
  }

  try {
    const client = getOneSignalClient();
    
    await client.createNotification({
      contents: {
        en: notification.message,
      },
      headings: {
        en: notification.title,
      },
      include_player_ids: [playerId],
      url: notification.url,
      chrome_web_icon: notification.icon,
      chrome_web_badge: notification.badge,
      data: notification.data,
    });
  } catch (error) {
    console.error("Failed to send push notification:", error);
    throw error;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendBulkPushNotifications(
  playerIds: string[],
  notification: PushNotificationData
): Promise<void> {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    console.warn("OneSignal credentials not configured. Skipping push notifications.");
    return;
  }

  if (playerIds.length === 0) {
    return;
  }

  try {
    const client = getOneSignalClient();
    
    await client.createNotification({
      contents: {
        en: notification.message,
      },
      headings: {
        en: notification.title,
      },
      include_player_ids: playerIds,
      url: notification.url,
      chrome_web_icon: notification.icon,
      chrome_web_badge: notification.badge,
      data: notification.data,
    });
  } catch (error) {
    console.error("Failed to send bulk push notifications:", error);
    throw error;
  }
}

/**
 * Send push notification to all subscribed users
 */
export async function sendBroadcastPushNotification(
  notification: PushNotificationData
): Promise<void> {
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
    console.warn("OneSignal credentials not configured. Skipping broadcast push notification.");
    return;
  }

  try {
    const client = getOneSignalClient();
    
    await client.createNotification({
      contents: {
        en: notification.message,
      },
      headings: {
        en: notification.title,
      },
      included_segments: ["All"], // Send to all subscribed users
      url: notification.url,
      chrome_web_icon: notification.icon,
      chrome_web_badge: notification.badge,
      data: notification.data,
    });
  } catch (error) {
    console.error("Failed to send broadcast push notification:", error);
    throw error;
  }
}

/**
 * Helper function to create task reminder push notification
 */
export function createTaskReminderPush(
  taskName: string,
  daysUntilDue: number,
  taskId: string,
  homeAddress: string
): PushNotificationData {
  const isOverdue = daysUntilDue < 0;
  const isDueToday = daysUntilDue === 0;
  
  let title: string;
  let message: string;
  
  if (isOverdue) {
    title = "⚠️ Overdue Task";
    message = `${taskName} is ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""} overdue at ${homeAddress}`;
  } else if (isDueToday) {
    title = "⏰ Task Due Today";
    message = `${taskName} is due today at ${homeAddress}`;
  } else {
    title = "📋 Task Reminder";
    message = `${taskName} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} at ${homeAddress}`;
  }

  return {
    title,
    message,
    url: `/tasks?id=${taskId}`,
    icon: "/favicon.ico",
    data: {
      type: "task_reminder",
      taskId,
      daysUntilDue,
    },
  };
}

/**
 * Helper function to create warranty expiration push notification
 */
export function createWarrantyExpirationPush(
  warrantyName: string,
  daysUntilExpiry: number,
  warrantyId: string,
  homeAddress: string
): PushNotificationData {
  const isExpiringSoon = daysUntilExpiry <= 7;
  
  const title = isExpiringSoon ? "🔴 Warranty Expiring Soon" : "⚠️ Warranty Expiring";
  const message = `${warrantyName} warranty expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} at ${homeAddress}`;

  return {
    title,
    message,
    url: `/warranties`,
    icon: "/favicon.ico",
    data: {
      type: "warranty_expiration",
      warrantyId,
      daysUntilExpiry,
    },
  };
}

