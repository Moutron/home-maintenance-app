import * as Sentry from "@sentry/nextjs";

/** Required by Sentry for navigation instrumentation (Next.js App Router). */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
    integrations:
      process.env.NODE_ENV === "production"
        ? [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true })]
        : [],
  });
}
