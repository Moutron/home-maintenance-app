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

## 6. Related Docs

- **Build & deploy:** `docs/VERCEL_SETUP.md` (includes “Why Vercel build can fail”).
- **Architecture:** `docs/ARCHITECTURE.md`.
- **Production:** `docs/PRODUCTION_READINESS.md`, `docs/DEPLOY.md`.
