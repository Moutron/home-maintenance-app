"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();
  const { isSignedIn, isLoaded, user } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Check if user has homes and redirect accordingly
      fetch("/api/homes")
        .then((res) => {
          if (!res.ok) {
            // If API returns error, redirect to onboarding
            console.warn("API error:", res.status, res.statusText);
            router.push("/onboarding");
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.homes && data.homes.length > 0) {
            router.push("/homes");
          } else {
            router.push("/onboarding");
          }
        })
        .catch((error) => {
          // If API fails, still redirect to onboarding
          console.error("Error fetching homes:", error);
          router.push("/onboarding");
        });
    }
  }, [isSignedIn, isLoaded, router]);

  // Show loading state while checking auth
  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Home Maintenance Pro
          </Link>
          <div className="flex gap-4">
            {!isLoaded || !isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100">
                    Sign In
                  </button>
                </SignInButton>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <Link
                href="/homes"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-5xl font-bold">
            Never Miss Home Maintenance Again
          </h1>
          <p className="mb-8 text-xl text-gray-600">
            Get personalized maintenance schedules based on your location, house
            age, and systems. Stay ahead of costly repairs.
          </p>
          <Link
            href="/sign-up"
            className="inline-block rounded-md bg-blue-600 px-8 py-3 text-lg font-medium text-white hover:bg-blue-700"
          >
            Start Free
          </Link>
        </section>

        <section className="bg-gray-50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-xl font-semibold">1. Tell Us About Your Home</h3>
                <p className="text-gray-600">
                  Enter your address, year built, and major systems. We use AI
                  to understand your specific needs.
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-xl font-semibold">2. Get Personalized Schedule</h3>
                <p className="text-gray-600">
                  Receive a customized maintenance calendar based on your
                  location, climate, and home age.
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-xl font-semibold">3. Stay on Track</h3>
                <p className="text-gray-600">
                  Get reminders, track costs, and connect with local
                  professionals when you need help.
                </p>
              </div>
        </div>
        </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-center gap-2 px-4 text-center text-gray-600 sm:flex-row sm:gap-6">
          <p>&copy; 2024 Home Maintenance Pro. All rights reserved.</p>
          <span className="hidden sm:inline">·</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-900 underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
