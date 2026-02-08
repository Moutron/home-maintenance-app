"use client";

import { useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const handleContinue = () => {
    if (acceptedTerms) setShowSignUp(true);
  };

  if (showSignUp) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none",
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">Create your account</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/terms" className="font-medium text-primary underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-primary underline">
            Privacy Policy
          </Link>
          . Please read them before continuing.
        </p>
        <div className="mb-6 flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) =>
              setAcceptedTerms(checked === true)
            }
          />
          <label
            htmlFor="terms"
            className="cursor-pointer text-sm leading-tight text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I agree to the{" "}
            <Link href="/terms" className="text-primary underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
          </label>
        </div>
        <Button
          onClick={handleContinue}
          disabled={!acceptedTerms}
          className="w-full"
        >
          Continue to Sign Up
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
