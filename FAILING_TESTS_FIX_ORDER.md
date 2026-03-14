# Failing Tests – Fix Order (Easiest → Hardest)

**Total: 61 failing tests across 5 files**

---

## 1. Easiest – Notifications (1 test)

**File:** `tests/unit/api/notifications.test.ts`  
**Failing test:** `POST /api/notifications/send-reminders > should send task reminders`

**Cause:** `send-reminders` route does `Promise.all([home.findMany, vehicle.findMany])` then `homes.map` / `vehicles.map`. The test mocks `home.findMany` but not `vehicle.findMany`, so `vehicles` is `undefined` and `vehicles.map` throws.

**Fix:** In that test (or in `beforeEach` for the send-reminders describe), add:
```ts
mockPrisma.vehicle.findMany.mockResolvedValue([]);
```

**Effort:** ~1 line, single test.

---

## 2. Easy – Tasks API edge cases (9 tests)

**File:** `tests/unit/api/tasks-edge-cases.test.ts`  
**Failing tests:**
- GET: `should handle category filter correctly`, `should handle completed=true filter correctly`, `should handle completed=false filter correctly`
- PATCH: `should handle updating task without completing it`, `should handle updating completed task to incomplete`, `should handle updating snoozedUntil to null`, `should handle updating customRecurrence to null`, `should handle task completion with custom recurrence`, `should handle task completion without custom recurrence`

**Cause:** Tasks route (GET and PATCH) uses both `home.findMany` and `vehicle.findMany` for ownership. Tests mock `home.findMany` but not `vehicle.findMany`, so `vehicle.findMany()` returns `undefined` and `vehicles.map` throws (500 on PATCH; GET may fail similarly depending on mock order).

**Fix:** In `beforeEach` (or in each test that hits the route), add:
```ts
mockPrisma.vehicle.findMany.mockResolvedValue([]);
```
Ensure any other Prisma calls used by GET (e.g. `maintenanceTask.findMany`) are mocked to return arrays when the test expects data.

**Effort:** Add one or two mocks in `beforeEach`; possibly adjust a couple of tests if GET expects a specific task list shape.

---

## 3. Medium – Dashboard API (9 tests)

**File:** `tests/unit/api/dashboard.test.ts`  
**Failing tests:**
- `should return dashboard data for authenticated user`
- `should return empty data when user has no homes`
- `should filter out snoozed tasks`
- `should calculate overdue tasks correctly`
- `should calculate spending correctly`
- `should identify warranties expiring soon`
- `should identify items needing attention`
- `should include recent activity`
- `should calculate spending by category from task cost estimates`

**Cause:** Dashboard route uses many Prisma `findMany` calls: `home.findMany`, `vehicle.findMany`, `maintenanceTask.findMany`, `maintenanceHistory.findMany`, `appliance.findMany`, `exteriorFeature.findMany`, `interiorFeature.findMany`, `homeSystem.findMany`, `completedTask.findMany`, and `home.findMany` again for `homeDetails`. If any of these return `undefined` (default vi.fn()), the code calls `.map` on undefined and throws. Tests only mock a subset (e.g. `home.findMany` and `maintenanceTask.findMany`), so the rest are undefined.

**Fix:** Add a `beforeEach` (or shared helper) that sets **default** return values for every Prisma method used by the dashboard route:
- `vehicle.findMany` → `[]`
- `maintenanceTask.findMany` → `[]`
- `maintenanceHistory.findMany` → `[]`
- `appliance.findMany` → `[]`
- `exteriorFeature.findMany` → `[]`
- `interiorFeature.findMany` → `[]`
- `homeSystem.findMany` → `[]`
- `completedTask.findMany` → `[]`
- (and keep `home.findMany` overridden per test where needed)

Then each test only overrides the mocks it cares about (e.g. tasks, history, appliances) for its scenario.

**Effort:** One block of default mocks in `beforeEach`; then run tests and fix any that need different shapes (e.g. `include`/`select`).

---

## 4. Medium–Hard – Dashboard API edge cases (19 tests)

**File:** `tests/unit/api/dashboard-edge-cases.test.ts`  
**Failing tests:** All 19 in this file (task filtering, spending, warranties, items needing attention, completion rate, spending by category, activity feed).

**Cause:** Same as dashboard.test: route expects all `findMany` (and related) results to be arrays. Unmocked calls return `undefined` → `.map` throws.

**Fix:** Same strategy as dashboard.test: in `beforeEach`, set default `mockResolvedValue([])` (or minimal valid shape) for every Prisma method the dashboard route uses. Then each test overrides only the mocks it needs for its edge case (e.g. tasks with null `snoozedUntil`, history with null cost, warranties at 30/60/90 days, etc.).

**Effort:** Same pattern as #3 but with more tests and more varied data (date boundaries, nulls, aggregates). May need to align mock data with route logic (e.g. date comparisons, spending aggregation).

---

## 5. Hardest – Dashboard API comprehensive / mutation (23 tests)

**File:** `tests/unit/api/dashboard-comprehensive.test.ts`  
**Failing tests:** All 23 (date boundary tests, spending edge cases, completion rate, spending by category, warranty boundaries, items needing attention, etc.).

**Cause:** Same root cause: missing Prisma mocks → `undefined.map`. On top of that, these tests are mutation-style and assert specific behavior (e.g. “tasks due exactly today”, “warranties expiring in exactly 29 days”, “items at 80% lifespan”). So mocks must return data that matches the route’s date/lifespan logic exactly.

**Fix:**
1. Apply the same “default mocks” approach as #3 and #4 so the route never sees `undefined` from any `findMany`.
2. For each comprehensive test, set mock data so that:
   - Dates (nextDueDate, warrantyExpiry, serviceDate, installDate, etc.) match what the route uses (e.g. `addDays(today, 7)`, 30/60/90 days for warranties, 80% lifespan).
3. Ensure mocked `date-fns` (if used) and route date logic are aligned (e.g. “due exactly today” means the task’s `nextDueDate` is the same calendar day as the route’s `today`).

**Effort:** Most time-consuming. Requires reading the dashboard route’s date and aggregation logic and wiring each test’s mocks to that behavior. Some tests may need to be relaxed or updated if the route’s behavior has changed.

---

## Summary table

| Order | File                          | Tests | Root cause              | Fix strategy                          |
|-------|-------------------------------|-------|--------------------------|----------------------------------------|
| 1     | notifications.test.ts         | 1     | Missing vehicle.findMany | Add one mock in one test               |
| 2     | tasks-edge-cases.test.ts      | 9     | Missing vehicle.findMany (and possibly task mocks) | beforeEach mocks + minor overrides |
| 3     | dashboard.test.ts             | 9     | Multiple findMany undefined | Default [] (or valid shape) for all dashboard Prisma calls in beforeEach |
| 4     | dashboard-edge-cases.test.ts  | 19    | Same as #3               | Same as #3 + per-test data for edge cases |
| 5     | dashboard-comprehensive.test.ts | 23  | Same + strict assertions  | Same as #4 + align dates/lifespan with route logic |

Recommended order of work: fix **1 → 2 → 3 → 4 → 5** so that the same “default mocks” pattern is reused and the hardest file benefits from the patterns established in the earlier ones.
