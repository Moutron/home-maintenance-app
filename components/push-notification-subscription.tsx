"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OneSignal from "react-onesignal";

interface PushSubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
}

export function PushNotificationSubscription() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSubscribed: false,
    isLoading: true,
    error: null,
    isSupported: false,
  });

  useEffect(() => {
    initializeOneSignal();
  }, []);

  const initializeOneSignal = async () => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    
    if (!appId) {
      setState({
        isSubscribed: false,
        isLoading: false,
        error: "OneSignal is not configured",
        isSupported: false,
      });
      return;
    }

    // Check if browser supports push notifications
    const isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    if (!isSupported) {
      setState({
        isSubscribed: false,
        isLoading: false,
        error: null,
        isSupported: false,
      });
      return;
    }

    try {
      // Initialize OneSignal
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: {
          enable: false, // We'll use our own UI
        },
      });

      // Check subscription status
      const isSubscribed = await OneSignal.isPushNotificationsEnabled();
      
      setState({
        isSubscribed,
        isLoading: false,
        error: null,
        isSupported: true,
      });
    } catch (error) {
      console.error("Error initializing OneSignal:", error);
      setState({
        isSubscribed: false,
        isLoading: false,
        error: "Failed to initialize push notifications",
        isSupported: true,
      });
    }
  };

  const subscribeToPush = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await OneSignal.registerForPushNotifications();
      const isSubscribed = await OneSignal.isPushNotificationsEnabled();
      
      setState({
        isSubscribed,
        isLoading: false,
        error: null,
        isSupported: true,
      });

      // Send player ID to server for association with user
      const playerId = await OneSignal.getUserId();
      if (playerId) {
        await fetch("/api/notifications/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ playerId }),
        });
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      setState({
        isSubscribed: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to subscribe",
        isSupported: true,
      });
    }
  };

  const unsubscribeFromPush = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await OneSignal.setSubscription(false);
      
      setState({
        isSubscribed: false,
        isLoading: false,
        error: null,
        isSupported: true,
      });

      // Notify server
      await fetch("/api/notifications/push/unsubscribe", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      setState({
        isSubscribed: true,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to unsubscribe",
        isSupported: true,
      });
    }
  };

  const handleToggle = (checked: boolean) => {
    if (checked) {
      subscribeToPush();
    } else {
      unsubscribeFromPush();
    }
  };

  if (!state.isSupported) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="push-notifications" className="text-sm font-medium">
              Push Notifications
            </Label>
            {state.isSubscribed && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Receive instant browser notifications for urgent alerts (overdue tasks, tasks due today, critical warranties)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state.isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          )}
          <Switch
            id="push-notifications"
            checked={state.isSubscribed}
            onCheckedChange={handleToggle}
            disabled={state.isLoading}
          />
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.isSubscribed && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            You'll receive push notifications for urgent alerts. Make sure notifications are enabled in your browser settings.
          </AlertDescription>
        </Alert>
      )}

      {!state.isSubscribed && !state.isLoading && (
        <div className="text-sm text-muted-foreground">
          <p>Enable push notifications to get instant alerts for:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Overdue tasks</li>
            <li>Tasks due today</li>
            <li>Warranties expiring in 7 days</li>
            <li>Task completion confirmations</li>
          </ul>
        </div>
      )}
    </div>
  );
}

