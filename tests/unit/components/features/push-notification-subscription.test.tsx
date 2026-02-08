/**
 * Tests for Push Notification Subscription Component
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushNotificationSubscription } from "@/components/push-notification-subscription";

// Mock react-onesignal
vi.mock("react-onesignal", () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    isPushNotificationsEnabled: vi.fn().mockResolvedValue(false),
    registerForPushNotifications: vi.fn().mockResolvedValue(undefined),
    setSubscription: vi.fn().mockResolvedValue(undefined),
    getUserId: vi.fn().mockResolvedValue("user_123"),
  },
}));

// Mock API calls
global.fetch = vi.fn();

describe("PushNotificationSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID = "test-app-id";
    
    // Mock browser APIs (configurable so tests can redefine to simulate unsupported browser)
    Object.defineProperty(navigator, "serviceWorker", {
      value: {},
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "PushManager", {
      value: {},
      writable: true,
      configurable: true,
    });
  });

  it("should render subscription component", async () => {
    render(<PushNotificationSubscription />);
    
    await waitFor(() => {
      expect(screen.getByText(/push notifications/i)).toBeInTheDocument();
    });
  });

  it("should show error when OneSignal not configured", async () => {
    delete process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    
    render(<PushNotificationSubscription />);
    
    // When app id is missing, component sets isSupported: false and shows "not supported in this browser" alert
    await waitFor(() => {
      expect(screen.getByText(/not supported in this browser|onesignal is not configured/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should show error when browser doesn't support push", async () => {
    // Simulate browser without serviceWorker (redefine with configurable: true from beforeEach)
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "PushManager", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<PushNotificationSubscription />);

    // Component shows "not supported in this browser" when isSupported is false
    await waitFor(() => {
      expect(screen.getByText(/not supported in this browser/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("should toggle subscription", async () => {
    const user = userEvent.setup();
    const OneSignal = (await import("react-onesignal")).default;
    vi.mocked(OneSignal.isPushNotificationsEnabled).mockResolvedValueOnce(false);
    
    render(<PushNotificationSubscription />);
    
    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
    
    const toggle = screen.getByRole("switch");
    await user.click(toggle);
    
    await waitFor(() => {
      expect(OneSignal.registerForPushNotifications).toHaveBeenCalled();
    });
  });

  it("should display subscribed state", async () => {
    const OneSignal = (await import("react-onesignal")).default;
    vi.mocked(OneSignal.isPushNotificationsEnabled).mockResolvedValueOnce(true);
    
    render(<PushNotificationSubscription />);
    
    await waitFor(() => {
      expect(screen.getByText(/subscribed|enabled/i)).toBeInTheDocument();
    });
  });
});
