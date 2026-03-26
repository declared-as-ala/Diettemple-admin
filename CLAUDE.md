# DietTemple Admin Dashboard — context for Claude

## Overview

**Next.js** (App Router) admin UI for DietTemple: products, orders, users, coaching (level/session templates, subscriptions), nutrition, **exercises** (list/create/edit/delete + video upload), clients, dashboards.

## Tech stack

- Next.js **16**, React **19**, TypeScript
- **Tailwind CSS** + Radix/shadcn-style components (`components/ui/`)
- **Axios** client: `lib/api.ts` (`ApiClient` class)
- Auth token: **`js-cookie`** key `admin_token` (also set on login page via `document.cookie`)

## API base URL

- **`lib/apiBaseUrl.ts`** — `getApiBaseUrl()` / `getMediaBaseUrl()` point at the production API (e.g. `https://<domain>/api` and origin without `/api` for media).
- **`lib/api.ts`** instantiates axios with that base URL; `login()` uses raw `axios.post` to `${API_BASE_URL}/auth/login`.

Update `apiBaseUrl.ts` when switching backend domains; redeploy Vercel after changes.

## Proxy routes (optional / legacy)

- `app/api/backend/[...path]/route.ts` — forwards to `BACKEND_API_URL` (or default HTTPS API).
- `app/api/backend-media/[...path]/route.ts` — media proxy.

If the frontend calls the API **directly over HTTPS** (same as backend), mixed-content issues are avoided. Proxies help when the browser cannot call HTTP backends.

## App structure

- **`app/admin/**`** — pages (login, exercises, products, users, etc.)
- **`app/admin/login/page.tsx`** — client-side `fetch` to `getApiBaseUrl()` + `/auth/login`; stores `admin_token` cookie.
- **`lib/api.ts`** — all admin API methods (`/admin/...` paths relative to base URL).

## Exercises page (`app/admin/exercises/page.tsx`)

- Loads exercises via `api.getExercises`, muscle groups via `api.getMuscleGroups` with fallback + **default muscle group list** in code.
- Create/edit/delete: `api.createExercise`, `api.updateExercise`, `api.deleteExercise`, `api.updateExerciseVideo` (multipart).

## Conventions for edits

- Prefer **`api` from `@/lib/api`** over ad-hoc `fetch` except where already used (login).
- Keep **`"use client"`** on interactive pages.
- Run **`npx tsc --noEmit`** before assuming types are clean.

## Env (Vercel)

- `NEXT_PUBLIC_API_URL` — if used, must match HTTPS API base.
- `BACKEND_API_URL` — for proxy routes; should end with `/api` or match proxy expectations.

---

*Generated for DietTemple admin — update when routes or env strategy changes.*
