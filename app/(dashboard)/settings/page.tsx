"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Calendar, CreditCard, Bell } from "lucide-react";
import { PushNotificationSubscription } from "@/components/push-notification-subscription";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [subscriptionTier, setSubscriptionTier] = useState<string>("FREE");

  useEffect(() => {
    // In a real app, you'd fetch this from your API
    // For now, we'll just show FREE
    setSubscriptionTier("FREE");
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">
                {user?.fullName || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">
                  {user?.emailAddresses[0]?.emailAddress || "Not set"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>Manage your subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Plan</p>
              <Badge
                variant={subscriptionTier === "PREMIUM" ? "default" : "outline"}
                className="mt-2"
              >
                {subscriptionTier}
              </Badge>
            </div>
            {subscriptionTier === "FREE" && (
              <div className="text-sm text-muted-foreground">
                <p>Upgrade to Premium for advanced features</p>
              </div>
            )}
          </div>
          {subscriptionTier === "PREMIUM" && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Premium Benefits</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Unlimited homes</li>
                <li>Advanced task scheduling</li>
                <li>Priority contractor matching</li>
                <li>Detailed analytics</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Customize your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <PushNotificationSubscription />
          
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email reminders for upcoming tasks and warranties
                </p>
              </div>
              <Badge variant="outline">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Task Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get notified 7 days before tasks are due
                </p>
              </div>
              <Badge variant="outline">Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <button className="text-sm text-destructive hover:underline">
              Delete Account
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

