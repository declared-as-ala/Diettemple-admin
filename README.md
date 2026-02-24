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

2. Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=https://your-api-url.com/api
```

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
