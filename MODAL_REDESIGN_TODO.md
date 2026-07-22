# Admin modal and drawer redesign

Scope: `admin/` only. Keep all current API calls, payloads, backend behavior, authentication, mobile app, and public frontend unchanged.

## 1. Discovery

- [x] Inventory Radix dialogs, custom modals, and browser `confirm()` calls.
- [x] Review the current shared dialog primitives and visual tokens.
- [x] Map create, edit, configuration, confirmation, and detail workflows.

## 2. Shared system

- [x] Add `AdminModal` with standard header, scrollable body, sticky footer, responsive sizing, loading protection, and unsaved-change protection.
- [x] Add `AdminDrawer` for right-side configuration/detail workflows.
- [x] Add `AdminConfirmDialog` and `AdminUnsavedChangesDialog`.
- [x] Add `AdminFormSection`, `AdminModalFooter`, and `AdminFormErrorSummary`.
- [x] Add shared searchable selectors for plans and exercises.
- [x] Standardize accessible close buttons, focus behavior, keyboard dismissal, and return focus.

## 3. Workflow migrations

- [x] Create plan: four structured sections, level selection, duration/frequency summary, inline validation.
- [x] Edit plan: reuse the structured plan system without changing update payloads.
- [x] Client plan selection: search, filters, plan cards, derived-level summary, change confirmation.
- [x] Create/edit client: personal, body composition, plan, and supported subscription sections; unsupported create-payload nutrition fields remain post-create configuration.
- [x] Create/edit exercise: structured supported general, classification, defaults, and media sections; no unsupported API fields added.
- [x] Session exercise configuration: 520–640px right drawer with parameters, progression, alternatives, and instructions.
- [x] Create/edit recipe: structured information, macros, ingredients, preparation, media, and options workspace.
- [x] Create/edit product: product, price, stock, media, publication, and live summary.
- [x] Order details: 520–680px right drawer with supported confirmed status actions.
- [x] Remaining user, subscription, assignment, lead, nutrition, note, and workout dialogs inherit the shared responsive dialog system; high-complexity forms use `AdminModal`.
- [x] Replace every browser `confirm()` with the shared confirmation dialog.

## 4. Quality and handoff

- [x] Verify implementation paths for open/close, Escape, backdrop, focus trap/return, validation, API failures, loading, duplicate submission, and unsaved changes.
- [x] Verify implementation paths for searchable selectors, empty/loading states, selection limits, and plan-change confirmation.
- [x] Verify responsive CSS rules for 375px, tablet, desktop, long-content scrolling, sticky actions, and reduced motion.
- [ ] Run TypeScript, lint, and production build. TypeScript and production build pass; repository-wide lint remains blocked by 115 pre-existing errors across unrelated legacy files.
- [ ] Capture the nine required workflow screenshots.
- [ ] Produce the final modal inventory, modified-file report, test results, and API-contract confirmation.
