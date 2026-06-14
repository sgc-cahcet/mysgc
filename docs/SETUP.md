# Setup Guide

How to configure and run the MySGC project locally.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- A **Supabase** account (free tier works)

---

## Supabase Setup

### 1. Create a project

Go to [supabase.com](https://supabase.com), sign in, and create a new project. Once created, note your **Project URL** and **anon key** from **Settings → API**.

### 2. Run the schema

Open the **SQL Editor** in your Supabase dashboard and run the files in order:

1. **`supabase/queries-and-rls.sql`** — Creates all helper functions, indexes, and RLS policies. Run this first.
2. **`supabase/two-handler-session-migration.sql`** — Adds co-handler columns (run only if the main script was previously applied without co-handler support).

> **Note:** These scripts assume the tables already exist. If you're starting from scratch, create the tables first using the column definitions in [Architecture → Database Schema](./ARCHITECTURE.md#database-schema).

### 3. Configure authentication

In the Supabase dashboard under **Authentication → Settings**:

- **Enable email/password sign-up** if not already enabled.
- Set **Site URL** to your production URL (e.g., `https://sgc-cahcet.pages.dev`).
- Under **Redirect URLs**, add:
  - `http://localhost:3000/**` (local development)
  - `https://sgc-cahcet.pages.dev/**` (production)

### 4. Seed member data

Add yourself to the `members` table via the **Table Editor** so you can log in:

```sql
INSERT INTO members (name, email, department, role, is_registered)
VALUES ('Your Name', 'your.email@example.com', 'Your Dept', 'Member', false);
```

Set `role` to `Administrator` if you need admin dashboard access.

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

| Variable                      | Description                      |
| ----------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`    | Your Supabase project URL        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous API key |

These are the only two variables needed. They use the `NEXT_PUBLIC_` prefix because the Supabase client runs on the client side.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in your Supabase credentials
cp .env.example .env.local

# 3. Run the dev server
npm run dev

# 4. Open http://localhost:3000
```

### Available scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start Next.js dev server     |
| `npm run build`   | Production build             |
| `npm run start`   | Start production server      |
| `npm run lint`    | Run Next.js lint             |

---

## Deployment

See [Deployment Guide](./DEPLOYMENT.md).
