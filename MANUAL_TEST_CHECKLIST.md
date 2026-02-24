# Admin manual test checklist

## Backend

- [ ] **seed:all** – From `backend/`: `npm run seed:all`. Runs exercises → session-templates → level-templates → users → subscriptions. No errors; logs show created counts.
- [ ] **reset:db** (optional) – `npm run reset:db` in dev only. Drops coaching collections; then run `seed:all` again.

## Admin UI

- [ ] **Sidebar** – OVERVIEW: Dashboard. COACHING: Level Templates, Session Templates, Exercises, Assignments (Users → Templates), Subscriptions. `/admin` → `/admin/dashboard`.
- [ ] **Dashboard** – Quick actions (Create Level Template, Open Assignments, View Expiring Soon, etc.). Empty state when no data; KPIs + charts + tables when data. Renew/Change level modals.
- [ ] **Subscriptions** – Filters: search user, status, level, “Expiring soon”. Table: user, level, status, start/end, days left, row actions (Renew, Upgrade/Downgrade, Cancel). “Assign subscription” opens modal (user + level + dates); assign works. Row click opens detail drawer with history and quick actions. Some users ACTIVE, some EXPIRED, some CANCELED after seed.
- [ ] **Level planner** – Drag from Library into day; move between days; reorder in day; remove. Min 4 / max 7 per week; Save; Reset week; Unsaved guard; Saved indicator.
- [ ] **Assignments board** (`/admin/assignments`) – Users (search, status filter), template columns (drop → assign modal), Unassigned (drop → cancel). Change-level / cancel+assign when user has active sub.
- [ ] **Session builder** – Saves SessionExerciseConfig (sets, reps, rest, alternatives, progression rules) correctly.

## Subscription lifecycle

- [ ] **Expiring soon** – Dashboard “Expiring soon” list and quick Renew updates `endAt` and history.
- [ ] **Upgrade/Downgrade** – Change level updates `levelTemplateId` and adds `change_level` history entry.
- [ ] **Cancel** – Sets status to CANCELED and adds history.

## Polish

- [ ] Dark mode – No white surfaces; cards/tables use theme.
- [ ] Skeletons – Dashboard and Subscriptions show loading skeletons.
- [ ] Empty states – Empty tables show EmptyState with CTA where relevant.
- [ ] Debounced search – Subscriptions search debounced (~400ms).
