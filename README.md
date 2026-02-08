# Home Maintenance Pro

A comprehensive home maintenance management application built with Next.js, featuring AI-powered task generation, predictive maintenance, and intelligent scheduling.

---

## Requirements

To run the application, you need the following.

### Required

| Requirement | Version / Notes |
|-------------|-----------------|
| **Node.js** | 18.x or later (LTS recommended) |
| **npm** | 9.x or later (or yarn/pnpm) |
| **PostgreSQL** | 14+ (local or hosted) |
| **Clerk** | Account at [clerk.com](https://clerk.com) for auth |
| **OpenAI** | API key for AI task generation and photo analysis |

### Environment variables (required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/home_maintenance?schema=public` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_...`) |
| `CLERK_SECRET_KEY` | Clerk secret key (`sk_...`) |
| `OPENAI_API_KEY` | OpenAI API key (`sk-...`) for task generation and system/tool photo analysis |

### Optional (features work without these)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | Google Maps/Places for address autocomplete (fallback: free Nominatim geocoding) |
| `RESEND_API_KEY` | Resend for email (warranty alerts, task reminders) |
| `RESEND_FROM_EMAIL` | From address for emails |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app, e.g. `http://localhost:3000` |
| `RENTCAST_API_KEY` | RentCast for property enrichment |
| `CENSUS_API_KEY` | Census Bureau for demographics |
| `USPS_API_KEY` | USPS for address validation |
| `OPENWEATHER_API_KEY` | OpenWeather for climate data |
| `VISUAL_CROSSING_API_KEY` | Historical weather |
| `RAPIDAPI_KEY` | RapidAPI for Zillow/Redfin-style lookups |
| `ENABLE_WEB_SCRAPING` | `true` to allow web scraping fallback for property data |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for file uploads |
| `CLOUDINARY_URL` / `CLOUDINARY_UPLOAD_PRESET` | Cloudinary for uploads (alternative to Blob) |
| `STRIPE_*` | Stripe keys and price IDs for subscriptions |
| `ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY` | OneSignal for push notifications |
| `CRON_SECRET` | Secret for cron/webhook endpoints |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | [Sentry](https://sentry.io) for error tracking (optional; leave unset to disable) |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Sentry org, project, and auth token for source maps/releases (optional) |
| `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | Override per-IP rate limit (default: 60 requests per minute); set `RATE_LIMIT_DISABLED=1` to disable |

---

## How to Get It Running

### 1. Clone and install

```bash
git clone <repository-url>
cd home-maintenance-app
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and set at least:

- `DATABASE_URL` (PostgreSQL)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
- `OPENAI_API_KEY`

### 3. Database

**Option A – Local PostgreSQL**

```bash
# Ensure PostgreSQL is running, then:
npx prisma migrate dev
npm run db:seed
```

**Option B – Docker**

```bash
docker-compose up -d
npx prisma migrate dev
npm run db:seed
```

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in is handled by Clerk (configure sign-in/sign-up in the Clerk dashboard).

### 5. Other useful commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run test` | Run tests (Vitest) |
| `npm run test:run` | Single test run |
| `npm run test:e2e` | Playwright E2E tests |
| `npx prisma studio` | Open Prisma Studio for the database |

### Deploying to production

For production deploys (Vercel, Docker), env setup, migrations, health checks, rollback, and where to find logs and errors, see the **[Deploy runbook](docs/DEPLOY.md)**. It also covers optional third parties such as **Sentry** (error tracking): set `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` in production to enable.

---

## Features

This section describes feature areas: endpoints, architecture (third-party, caching), and API contracts/data types.

---

### Authentication

- **Provider:** Clerk. All API routes that need a user resolve `auth()` and optionally `currentUser()`; many use a shared **get-or-create user** pattern (lookup by `clerkId`, then by email, then create).
- **No dedicated auth API.** Frontend uses Clerk SDK; backend reads `userId` and email from Clerk in each route.

---

### Homes

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/homes` | List homes for the current user |
| `POST` | `/api/homes` | Create or update a home (upsert by address/city/state/zip) |
| `GET` | `/api/homes/[id]` | Get one home by id |

**Architecture**

- Uses Prisma only; no third-party calls in the route.
- State and ZIP are normalized (e.g. 2-letter state, 5/9-digit ZIP) before validation.

**API contract – POST /api/homes**

- **Request body:** JSON matching `createHomeSchema` (see below).
- **Response:** `201` or `200` with `{ home, isUpdate?, message }`.
- **Errors:** `401` Unauthorized, `400` validation/user email, `409` duplicate, `500` server error.

**Data types (Zod / Prisma)**

- **Create home (body):** `address` (string, required), `city`, `state`, `zipCode`, `yearBuilt` (1800–current+1), `squareFootage?`, `lotSize?`, `homeType` (enum: single-family, townhouse, condo, apartment, mobile-home, other), `systems` (array of home system objects).
- **Home system:** `systemType` (HVAC, ROOF, WATER_HEATER, PLUMBING, ELECTRICAL, APPLIANCE, EXTERIOR, LANDSCAPING, POOL, DECK, FENCE, OTHER), `brand?`, `model?`, `installDate?`, `expectedLifespan?`, `material?`, `capacity?`, `condition?`, `lastInspection?`, `stormResistance?`, `notes?`.

---

### Property lookup

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/property/lookup` | Look up property details by address |

**Architecture**

- **Property enrichment** (`lib/utils/property-enrichment`): Tries RentCast, Census, USPS, geocoding. Requires `RENTCAST_API_KEY`, optionally `CENSUS_API_KEY`, `USPS_API_KEY`.
- **Property cache:** `PropertyCache` in PostgreSQL; key = normalized address+city+state+zip; TTL 30 days to reduce external calls.
- **Fallback:** Optional Zillow/Redfin via RapidAPI or web scraping (`RAPIDAPI_KEY`, `ENABLE_WEB_SCRAPING`).

**API contract – POST /api/property/lookup**

- **Request:** `{ address, city, state, zipCode }` (all required).
- **Response:** `200` with `found`, `data` (yearBuilt, squareFootage, lotSize, bedrooms, etc.), `sources`; or `found: false` with message when no data/keys.

---

### Climate lookup

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/climate/lookup` | Get climate/storm data for a location |

**Architecture**

- **Climate data:** `lib/utils/climate-data` – can use OpenWeather (`OPENWEATHER_API_KEY`) or built-in estimates.
- **ZIP code cache:** `ZipCodeCache` in PostgreSQL; key = ZIP; TTL 90 days. `getCachedZipCodeData` / `setCachedZipCodeData` in `lib/utils/zipcode-cache`.

**API contract – POST /api/climate/lookup**

- **Request:** `{ city, state, zipCode }` (all required).
- **Response:** `200` with `{ success: true, data: ClimateData, recommendations }` or `500` with error message.
- **ClimateData:** `stormFrequency`, `averageRainfall`, `averageSnowfall`, `hurricaneRisk`, `tornadoRisk`, `hailRisk`, `source`, etc.

---

### Compliance lookup

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/compliance/lookup` | Look up local compliance/regulations by location |

**Architecture**

- Uses local regulations / compliance utilities; may call external or static data by zip/state/city.

---

### Dashboard

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Aggregated stats and alerts for the current user |

**Architecture**

- Prisma only. Aggregates tasks (overdue, due today, upcoming), completed tasks, spending, warranties expiring (30/60/90 days), budget alerts.

**API contract – GET /api/dashboard**

- **Response:** `200` with `stats` (counts, spending, completion rate) and `alerts` (overdueTasks, tasksDueToday, warrantiesExpiring30/60/90, budgetAlerts), plus supporting lists (e.g. tasks, homes).

---

### Tasks

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tasks` | List tasks (optional query: `homeId`, `completed`, `category`) |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/templates` | List task templates (optional: `category`, `isActive`) |
| `POST` | `/api/tasks/generate` | Generate tasks for a home from templates |
| `POST` | `/api/tasks/generate-ai` | Generate tasks using OpenAI |
| `POST` | `/api/tasks/generate-compliance` | Generate compliance-related tasks |

**Architecture**

- **AI:** OpenAI used in generate-ai and in photo analysis; requires `OPENAI_API_KEY`.
- **Templates:** Stored in DB (`TaskTemplate`); generation uses Prisma and optional OpenAI.

**API contract – POST /api/tasks**

- **Request body:** `homeId`, `name`, `description`, `category` (enum), `frequency` (enum), `nextDueDate`, optional `templateId`, `costEstimate`, `notes`, `snoozedUntil`, `customRecurrence`.
- **Categories:** HVAC, PLUMBING, EXTERIOR, STRUCTURAL, LANDSCAPING, APPLIANCE, SAFETY, ELECTRICAL, OTHER.
- **Frequencies:** WEEKLY, MONTHLY, QUARTERLY, BIANNUAL, ANNUAL, SEASONAL, AS_NEEDED.

**API contract – POST /api/tasks/generate**

- **Request:** e.g. `{ homeId }`. Uses templates and home data to create tasks.
- **Response:** Created tasks or error.

---

### Inventory

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/inventory` | Get inventory for a home (query: `homeId`) |
| `POST` | `/api/inventory` | Create/update inventory (appliances, exterior/interior features) |

**Architecture**

- Prisma only. Writes in a transaction for consistency.

**API contract – POST /api/inventory**

- **Request:** `homeId`, `appliances[]`, `exteriorFeatures[]`, `interiorFeatures[]` (arrays can be empty).
- **Appliance:** `applianceType` (enum: REFRIGERATOR, DISHWASHER, WASHER, DRYER, OVEN, RANGE, MICROWAVE, etc.), `brand?`, `model?`, `serialNumber?`, `installDate?`, `warrantyExpiry?`, `expectedLifespan?`, `lastServiceDate?`, `usageFrequency?`, `notes?`.
- **Exterior/Interior:** Similar shape with `featureType`, `material`, `brand`, dates, `squareFootage?`, `room?` (interior).

---

### Budget

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/budget` | Budget summary for user |
| `GET` | `/api/budget/plans` | List budget plans |
| `POST` | `/api/budget/plans` | Create a budget plan |
| `GET` | `/api/budget/plans/[id]` | Get one plan |
| `GET` | `/api/budget/projects` | Budget-related projects |
| `GET` | `/api/budget/alerts` | Budget alerts |

**Architecture**

- Prisma only. Budget plans and projects drive alerts and dashboard.

---

### Maintenance history

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/maintenance/history` | List maintenance records (query: `homeId`, etc.) |
| `POST` | `/api/maintenance/history` | Create a maintenance record |
| `GET` | `/api/maintenance/predictive` | Predictive maintenance data |

**Architecture**

- Prisma only. Records can link to home, appliance, exterior/interior feature, or system.

**Data types**

- **Create record:** `homeId`, `serviceDate`, `serviceType`, `description`, `cost?`, `contractorName?`, `photos?`, `receipts?`, optional link to appliance/feature/system.

---

### DIY projects

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/diy-projects` | List DIY projects (optional `homeId`) |
| `POST` | `/api/diy-projects` | Create project (can use OpenAI for generation) |
| `GET` | `/api/diy-projects/[id]` | Get one project |
| `GET` | `/api/diy-projects/templates` | List project templates |
| `POST` | `/api/diy-projects/[id]/materials` | Add materials |
| `POST` | `/api/diy-projects/[id]/steps` | Add steps |
| `POST` | `/api/diy-projects/[id]/tools` | Add tools |
| `POST` | `/api/diy-projects/[id]/photos` | Add photos |
| `POST` | `/api/diy-projects/generate-plan` | Generate plan with OpenAI |

**Architecture**

- **AI:** OpenAI used for plan generation; requires `OPENAI_API_KEY`.
- **Templates:** Stored in DB (`ProjectTemplate`).

---

### Upload (photos & receipts)

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload a file (photo or receipt) |

**Architecture**

- **Storage:** Vercel Blob (`BLOB_READ_WRITE_TOKEN`) or Cloudinary; dev fallback to data URLs.
- **Validation:** Allowed types: JPEG, PNG, WebP, PDF; max 10 MB. Optional server-side image compression (e.g. Sharp).

**API contract – POST /api/upload**

- **Request:** `multipart/form-data` with `file` and `type` (e.g. "photo" or "receipt").
- **Response:** `200` with `{ url }` or error (400/413/500).

---

### Systems & tools photo analysis

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/systems/analyze-photo` | Analyze a system photo (e.g. HVAC) with OpenAI |
| `POST` | `/api/tools/analyze-photo` | Analyze a tool photo with OpenAI |

**Architecture**

- **OpenAI:** Sends image (base64) and optional hint; returns structured fields (brand, model, condition, etc.).

---

### Warranties

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/warranties/check-expiring` | Check expiring warranties |
| `POST` | `/api/warranties/send-test-email` | Send a test warranty email |

**Architecture**

- **Email:** Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`). Used for warranty alerts and task reminders.

---

### Notifications

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/notifications/push/subscribe` | Subscribe to push (e.g. OneSignal) |
| `POST` | `/api/notifications/push/unsubscribe` | Unsubscribe |
| `POST` | `/api/notifications/push/send` | Send push |
| `GET` | `/api/notifications/push/status` | Push subscription status |
| `POST` | `/api/notifications/send-reminders` | Send task reminder emails |

**Architecture**

- **Push:** OneSignal (`ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`); optional.
- **Reminders:** Resend; builds reminder payload from tasks and sends via `lib/notifications/email`.

---

### Tools inventory

**Endpoints**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/tools/inventory` | List user's tools |
| `POST` | `/api/tools/inventory` | Create tool |
| `GET` | `/api/tools/inventory/[id]` | Get one tool |
| `POST` | `/api/tools/check-owned` | Check if tools are owned (e.g. for DIY) |

**Architecture**

- Prisma only; links to user and optional DIY project.

---

## Architecture & data model

For system architecture, API flow, and PostgreSQL data structure (with Mermaid diagrams), see **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

## Production readiness

For a checklist of what’s done and what’s recommended before production (security, infra, monitoring, CI/CD, legal), see **[docs/PRODUCTION_READINESS.md](./docs/PRODUCTION_READINESS.md)**. For deploy steps, env setup, migrations, rollback, and where logs and errors live, see the **[Deploy runbook](docs/DEPLOY.md)**.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 |
| Database | PostgreSQL + Prisma ORM |
| Auth | Clerk |
| AI | OpenAI (GPT, vision) |
| Error tracking | Sentry (optional) |
| UI | React 19, shadcn/ui, Tailwind CSS |
| Storage | Vercel Blob or Cloudinary |
| Email | Resend |
| Validation | Zod |

---

## License

MIT

---

**Built for homeowners everywhere**
