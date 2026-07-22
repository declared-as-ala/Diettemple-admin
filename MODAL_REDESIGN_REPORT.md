# Admin modal redesign report

## Scope and API safety

The redesign is confined to `admin/`. Existing API helpers, endpoint paths, request payload shapes, authentication behavior, backend schemas, mobile code, and public frontend code were not changed.

## Modal inventory and migrations

- Plan create uses a large four-section modal; plan editing remains the existing full-screen planner workspace with structured sections and protected navigation.
- Client create/edit, client notes, subscriptions, nutrition selection, and workout-plan selection use the shared responsive dialog system. The workout selector includes front-end search, level/gender/status filters, result cards, derived-level summary, and change confirmation.
- Exercise create/edit uses large structured modals. Session exercise configuration uses a right drawer with parameter, alternative, and progression sections.
- Recipe and product editors remain route-based complex workspaces and now use clearer responsive sections; products include a live commercial summary.
- Order details use a large right drawer with supported status confirmations.
- Assignment, dashboard, lead, subscription, user, media, and nutrition dialogs inherit the standardized shared dialog shell and internal-scroll behavior.
- All native browser `confirm()` calls in `app/` and `components/` were replaced with shared confirmation dialogs.

## Shared components created

- `AdminModal`
- `AdminDrawer`
- `AdminConfirmDialog`
- `AdminUnsavedChangesDialog`
- `AdminFormSection`
- `AdminFormErrorSummary`
- `AdminModalFooter`
- `AdminSearchableSelect` / `AdminCommandSelector`
- `ProductLiveSummary`
- `useAdminDialogGuard`

## Dimensions and responsive behavior

- Small confirmations: `28rem` maximum desktop width.
- Standard forms: `44rem` maximum desktop width.
- Large forms: `56rem` maximum desktop width.
- Extra-large forms: `64rem` maximum desktop width.
- Drawers: workflow-selected widths from approximately 36rem to 42rem.
- Desktop maximum height: `calc(100dvh - 3rem)`.
- Mobile dialogs and drawers become full-screen with safe-area footer padding.
- Header and footer remain visible; only the body scrolls.

## UX and accessibility improvements

- Consistent white surfaces, neutral borders, restrained lime accents, clear destructive styling, and 12–16px radii.
- Responsive one/two-column form sections and 44px primary controls.
- Inline validation and error summaries on the main creation/editing workflows.
- Loading states prevent duplicate submission and unsafe close during saves.
- Dirty form guards protect recoverable input from Escape, close, and backdrop interactions.
- Radix supplies dialog semantics, focus trapping, keyboard navigation, and focus return; close controls have accessible labels.
- Video previews no longer autoplay unexpectedly.
- Searchable exercise alternatives enforce uniqueness, exclude the current exercise, and enforce the three-item limit.

## Verification results

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all 27 admin routes compiled/generated.
- Browser `confirm()` inventory: none remain under `app/` or `components/`.
- `npm run lint`: does not pass because the repository currently has 115 legacy lint errors, including unrelated pages and shared legacy utilities. The production build and TypeScript check are clean.
- Authenticated visual screenshots could not be captured because no in-app browser instance was available in the current session.

## Files modified

See `git status --short` for the authoritative working-tree list. The implementation touches the shared dialog/button primitives, the new `components/admin/` system, the plan/client/exercise/session/order/product/recipe workflows, and remaining admin dialogs requiring shared scroll or confirmation behavior.
