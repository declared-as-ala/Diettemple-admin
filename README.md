# DietTemple Admin Dashboard

A comprehensive admin dashboard for managing DietTemple products, orders, and users.

## Features

- **Products Management**: Full CRUD operations for products
- **Orders Management**: View and update order statuses, track payment methods
- **Users Management**: View user profiles, order history, and user levels
- **Dashboard**: Overview statistics and metrics
- **Authentication**: Secure JWT-based admin authentication

## Setup

1. Install dependencies:
```bash
npm install
```

2. **API URL (optional):**
   - If your backend is **HTTP only** (e.g. `http://145.223.118.9:5000`): do **not** set `NEXT_PUBLIC_API_URL` in production. The app will use a same-origin proxy so the browser never calls HTTP directly.
   - If your backend has **HTTPS**: set `NEXT_PUBLIC_API_URL=https://your-api-url.com/api` in Vercel (and optionally `BACKEND_API_URL` for the proxy fallback).
   - For local dev with HTTP backend, no env is needed.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Admin Access

To create an admin user, you need to set the `role` field to `"admin"` in the MongoDB User collection for the desired user account.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios
- JWT Authentication
