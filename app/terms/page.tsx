import Link from "next/link";

export const metadata = {
  title: "Terms of Service - Home Maintenance Pro",
  description: "Terms of service for Home Maintenance Pro.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Home
        </Link>
        <h1 className="mb-6 text-3xl font-bold">Terms of Service</h1>
        <p className="mb-4 text-muted-foreground">
          <strong>Last updated:</strong> [Placeholder – add date when you
          publish final terms]
        </p>
        <div className="prose prose-gray dark:prose-invert">
          <p className="lead">
            This is a placeholder. Replace with your actual terms of service
            before launch. Cover acceptable use, account responsibilities,
            disclaimers (e.g. maintenance suggestions are not professional
            advice), limitation of liability, and how you may change the terms.
          </p>
          <p>
            By creating an account you agree to these terms and our{" "}
            <Link href="/privacy" className="text-primary underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
