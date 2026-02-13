# Implicit `any` Type Fix Checklist (Deploy)

Use this checklist to avoid **"Parameter 'X' implicitly has an 'any' type"** (and similar) TypeScript errors during `next build` / Vercel deploy.

## Why This Matters

- Vercel runs **strict TypeScript** (`next build` → "Running TypeScript").
- Callback parameters in `.map()`, `.reduce()`, `.filter()`, `.forEach()`, `.find()`, `.some()`, `.every()` can become implicit `any` when types don’t fully infer (e.g. Prisma results, Zod-parsed data).
- **Fix:** Add an explicit type for the callback parameter(s), e.g. `(task: SomeType) => ...` or `(task: (typeof array)[number]) => ...`.

---

## 1. Run Build Locally First

Before pushing to Vercel, always run:

```bash
npm run build
```

Fix any reported file/line. Common patterns:

- `Parameter 'task' implicitly has an 'any' type` → add type to the callback, e.g. `(task: YourTaskType) => ...`
- `Parameter 'sum' implicitly has an 'any' type` (in `reduce`) → e.g. `(sum: number, item: ItemType) => ...`
- Same for `h`, `t`, `w`, `reg`, `issue`, etc. in other callbacks.

---

## 2. Files Already Fixed (Reference)

These were updated to use explicit callback parameter types so the build passes.

### app/api

| File | Callbacks typed |
|------|------------------|
| `app/api/budget/plans/[id]/route.ts` | `homes.map((h: { id: string }) => ...)`, `reduce((sum, task)`, `reduce((sum, project)` |
| `app/api/dashboard/route.ts` | homeIds, reduce/filter/forEach/sort, `map(task)` x6, `forEach(item)` |
| `app/api/tasks/route.ts` | `homeIds`, `some(h)` |
| `app/api/budget/route.ts` | callback params |
| `app/api/budget/projects/route.ts` | callback params |
| `app/api/diy-projects/[id]/steps/[stepId]/route.ts` | callback params |
| `app/api/notifications/send-reminders/route.ts` | callback params |
| `app/api/homes/route.ts` | `find(h)` x2 |
| `app/api/warranties/check-expiring/route.ts` | `forEach` appliance/feature x2 |
| `app/api/tasks/generate/route.ts` | `find(s)`, `filter`/`map` task, `map(task, index)`, complianceTasks filter/map |
| `app/api/tasks/generate-ai/route.ts` | home.systems/appliances/exteriorFeatures/interiorFeatures `.map((s|a|e|i) => ...)` |
| `app/api/tasks/generate-compliance/route.ts` | `existingTasks.map((t) => ...)`, `filter(task)`, `map(task)` |
| `app/api/tools/check-owned/route.ts` | `userTools.map((tool) => ...)`, `userTools.find((tool) => ...)` x2 |
| `app/api/inventory/route.ts` | `validatedData.appliances/exteriorFeatures/interiorFeatures.map(...)` |
| `app/api/tasks/test-validation/route.ts` | `templates.map((t) => ...)` |
| `app/api/homes/[id]/systems/route.ts` | `validatedData.systems.map((system) => ...)`, `error.issues.map((issue) => ...)` |

### lib

| File | Callbacks typed |
|------|------------------|
| `lib/budget/alerts.ts` | `map(h)`, `reduce(sum, m)`, `filter(t)`, `reduce(sum, t)` |
| `lib/notifications/email.ts` | `tasks.filter((t) => ...)`, `criticalTasks/highPriorityTasks/otherTasks.map((task) => ...)` |
| `lib/notifications/warranty-emails.ts` | `warranties.filter((w) => ...)` |
| `lib/utils/local-regulations.ts` | `tasks.filter((task) => ...)`, `matchingTasks.forEach((task) => ...)`, `regulations.filter((reg) => ...)`, `applicableRegulations.filter((r) => ...)` x3 |

---

## 3. Patterns to Use When Adding Types

- **Array element type:** `(item: (typeof myArray)[number]) => ...`
- **Known shape:** `(task: { name: string; category: string }) => ...`
- **Prisma/Zod type:** Import the type and use it, e.g. `(task: Task) => ...`
- **Reduce:** `(sum: number, item: ItemType) => ...`

---

## 4. Deploy Steps

1. [ ] Run `npm run build` locally and fix any TypeScript errors (especially implicit `any`).
2. [ ] Commit and push. CI (e.g. `.github/workflows/test.yml`) will run `npm run build` on push/PR.
3. [ ] If Vercel fails, check the build log for the exact file and line; add the missing callback type and push again.
4. [ ] Optional: Search for `.map(`, `.reduce(`, `.filter(`, `.forEach(`, `.find(`, `.some(`, `.every(` in `app/api`, `lib`, and fix any remaining untyped callbacks.

---

## 5. Quick Grep for Remaining Callbacks

If you add new API routes or lib code, you can look for untyped callbacks:

```bash
# From project root
rg '\.(map|reduce|filter|forEach|find|some|every)\s*\(\s*[a-z]+\s*\)' app/api lib --type ts
```

Then add explicit parameter types wherever TypeScript reports implicit `any`.

---

## 6. Explicit `any` Removed (Type-Safety Pass)

These files were updated to remove or replace **explicit** `any` (e.g. `catch (e: any)`, `where: any`, `as any`) so the codebase is fully typed. Build passes with no type errors.

- **app/api**: `tasks/route.ts` (where → Prisma), `tasks/generate/route.ts` (TaskFrequency, ComplianceTask[], catch unknown), `tasks/generate-ai/route.ts` (createdTasks typed), `budget/route.ts`, `budget/plans/route.ts`, `budget/plans/[id]/route.ts`, `budget/alerts/route.ts` (Prisma where + enums), `dashboard/route.ts` (WarrantyAlertItem, ItemNeedingAttention, RecentActivityItem), `homes/[id]/systems/route.ts` (z.ZodIssue), **`tools/inventory/route.ts`** (Prisma where/create, catch unknown, body/dbData typed, no `prisma as any`).
- **lib**: `budget/alerts.ts` (TaskCategory/ProjectCategory), `notifications/push.ts` (Record&lt;string, unknown&gt;), `utils/zipcode-cache.ts`, `utils/property-cache.ts` (Prisma.InputJsonValue), `utils/geocoding.ts` (NominatimItem, GeocodeResult), `utils/historical-weather.ts` (WeatherDay).

**Remaining `any` (optional cleanup):** Some API routes still use `catch (error: any)` or `updateData: any` (e.g. diy-projects, homes, tools/check-owned). Dashboard and component code use `useState<any>` or `payload: any` in places. These do not cause build failures; you can replace them over time with proper types using the same patterns above.

---

## 6b. Schema Enums (Best Practice)

**Problem:** Importing enums from `@prisma/client` (e.g. `BudgetAlertStatus`, `TaskCategory`) can fail on Vercel if the generated client isn’t ready when TypeScript runs.

**Best practice:**

1. **Single source of truth** – Use `lib/schema-enums.ts` for all schema enum types (string unions). Keep it in sync with `prisma/schema.prisma`. Import from there in app and lib:
   ```ts
   import type { BudgetAlertStatus, TaskCategory } from "@/lib/schema-enums";
   where.status = status as BudgetAlertStatus;
   ```
2. **Generate before build** – In `package.json`, `"build": "prisma generate && next build"` so the Prisma client is generated before the Next build (local and Vercel). Ensure `DATABASE_URL` is set (e.g. in `.env` or Vercel env) when running `npm run build`.

This keeps enum values in one place, avoids depending on Prisma’s export order, and makes builds reliable.

---

## 7. Related Docs

- **Build & deploy:** `docs/VERCEL_SETUP.md` (includes “Why Vercel build can fail”).
- **Architecture:** `docs/ARCHITECTURE.md`.
- **Production:** `docs/PRODUCTION_READINESS.md`, `docs/DEPLOY.md`.
