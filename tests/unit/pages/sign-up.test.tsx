/**
 * Tests for Sign-up page (terms acceptance + Clerk SignUp)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUpPage from "@/app/sign-up/[[...sign-up]]/page";

vi.mock("@clerk/nextjs", () => ({
  SignUp: () => <div data-testid="clerk-sign-up">Clerk Sign Up</div>,
}));

describe("Sign-up Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render terms acceptance step first", () => {
    render(<SignUpPage />);
    expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    expect(screen.getByText(/continue to sign up/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue to sign up/i })).toBeInTheDocument();
  });

  it("should show links to Terms and Privacy", () => {
    render(<SignUpPage />);
    const termsLinks = screen.getAllByRole("link", { name: /terms of service/i });
    const privacyLinks = screen.getAllByRole("link", { name: /privacy policy/i });
    expect(termsLinks.length).toBeGreaterThan(0);
    expect(privacyLinks.length).toBeGreaterThan(0);
    expect(termsLinks[0]).toHaveAttribute("href", "/terms");
    expect(privacyLinks[0]).toHaveAttribute("href", "/privacy");
  });

  it("should have Continue button disabled when terms not accepted", () => {
    render(<SignUpPage />);
    const continueBtn = screen.getByRole("button", { name: /continue to sign up/i });
    expect(continueBtn).toBeDisabled();
  });

  it("should enable Continue when checkbox is checked and show Clerk SignUp on click", async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);
    const checkbox = screen.getByRole("checkbox", { name: /i agree to the/i });
    const continueBtn = screen.getByRole("button", { name: /continue to sign up/i });

    await user.click(checkbox);
    expect(continueBtn).not.toBeDisabled();

    await user.click(continueBtn);
    expect(screen.getByTestId("clerk-sign-up")).toBeInTheDocument();
    expect(screen.getByText("Clerk Sign Up")).toBeInTheDocument();
  });

  it("should link to sign-in for existing users", () => {
    render(<SignUpPage />);
    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/sign-in");
  });
});
