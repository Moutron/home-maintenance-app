import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Home Maintenance Pro",
  description: "Privacy policy for Home Maintenance Pro.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to Home
        </Link>
        <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-4 text-muted-foreground">
          <strong>Last updated:</strong> [Placeholder – add date when you publish
          final policy]
        </p>
        <div className="prose prose-gray dark:prose-invert">
          <p className="lead">
            This is a placeholder. Replace with your actual privacy policy
            before launch. Describe what data you collect (e.g. via Clerk:
            email, name; app: homes, tasks, maintenance history), how you use
            it, retention, sharing (e.g. third-party services), and user rights
            (access, deletion, export). If you target EU users, include GDPR
            disclosures.
          </p>
          <p>
            For authentication we use Clerk; review{" "}
            <a
              href="https://clerk.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Clerk&apos;s privacy policy
            </a>{" "}
            for their handling of sign-in data.
          </p>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
