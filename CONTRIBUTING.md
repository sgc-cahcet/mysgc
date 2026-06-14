# Contributing to MySGC

We love contributions! Whether you're fixing a bug, adding a feature, or improving documentation, here's how to get started.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Coding Guidelines](#coding-guidelines)
- [Pull Request Process](#pull-request-process)
- [Commit Convention](#commit-convention)
- [Supabase Schema Changes](#supabase-schema-changes)

---

## Development Setup

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- A **Supabase** account (free tier works)
- **Git**

### Step 1: Fork & clone

```bash
git clone https://github.com/<your-username>/mysgc.git
cd mysgc
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run `supabase/queries-and-rls.sql`.
3. Run `supabase/two-handler-session-migration.sql` (if the main script was already applied).
4. In **Authentication > Settings**, enable email/password auth and set your site/redirect URLs.

### Step 4: Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and anon key (found in **Settings > API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Step 5: Seed member data

Add yourself to the `members` table via the Supabase Table Editor so you can log in:

```sql
INSERT INTO members (name, email, department, role, is_registered)
VALUES ('Your Name', 'your.email@example.com', 'Your Dept', 'Member', false);
```

Set role to `Administrator` if you need admin dashboard access.

### Step 6: Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Architecture

```
mysgc/
├── app/              # Next.js App Router pages
├── components/       # React components (ui/, admin/, auth/)
├── lib/              # Types, utilities, date helpers
├── hooks/            # Custom React hooks
├── supabase/         # Database schema + migration SQL files
└── public/           # Static assets
```

Key architectural decisions:

- **Client Components** — All pages use `"use client"` because Supabase auth state is managed client-side.
- **Supabase Singleton** — `createBrowserClient()` caches the client instance after first creation (v0.15+ behavior).
- **Data Fetching** — Components fetch their own data via `useEffect` + Supabase queries. No React Server Components or Server Actions.
- **Denormalization** — Member names are copied into `session_interests` and `session_feedback` to avoid joins on list views.
- **RLS** — All security is enforced at the database level via Row-Level Security policies.

---

## Coding Guidelines

### TypeScript

- Use strict types. Avoid `any`.
- Define interfaces near their usage (local to file) or in `lib/session-types.ts` for shared types.
- Use `interface` for objects, `type` for unions.

### React & Next.js

- Use functional components with hooks.
- Name files in `kebab-case.tsx`.
- Keep components focused — extract reusable UI into `components/ui/`.
- Use shadcn/ui primitives for dialogs, buttons, cards, etc.
- Avoid `useEffect` for derived state — prefer `useMemo`.

### Styling

- Use **Tailwind CSS** utility classes exclusively.
- Follow the existing design system: thick black borders (`border-2 border-black`), `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` for cards/buttons.
- Mobile-first responsive design with `sm:`, `md:` breakpoints.
- Avoid custom CSS files unless absolutely necessary.

### Supabase

- Use the `createBrowserClient()` singleton (do not create new clients).
- Prefer `.rpc()` for complex queries.
- Always handle errors with `try/catch` and show user-friendly messages.
- Respect RLS — the client may get `401` or empty results if policies block access.

---

## Pull Request Process

1. Ensure your branch is up to date with `sgc-cahcet/main`.
2. Run `npm run lint` and fix any warnings.
3. Run `npm run build` and confirm it succeeds.
4. Update the README if you've added or changed functionality.
5. If your change touches the database, include a migration script in `supabase/`.
6. Open a PR with a clear title and description covering:
   - What the change does
   - Why it's needed
   - How to test it
7. Wait for review. Address any feedback.

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

| Type       | Usage                                           |
| ---------- | ----------------------------------------------- |
| `feat`     | A new feature                                   |
| `fix`      | A bug fix                                       |
| `refactor` | Code change that neither fixes nor adds feature |
| `docs`     | Documentation only                              |
| `style`    | Formatting, missing semicolons, etc.            |
| `chore`    | Build/dependency changes                        |

Examples:

```
feat: add search to approved sessions
fix: pass env vars to createBrowserClient
docs: update README with deployment steps
```

---

## Supabase Schema Changes

If your PR requires a database change:

1. Add a new migration file in `supabase/` named descriptively (e.g., `supabase/add-session-tags.sql`).
2. Use `IF NOT EXISTS` / `DROP IF EXISTS` guards so the script is idempotent.
3. Update the RLS policies and helper functions if needed.
4. Document the migration in the PR description.
5. The reviewer will run the migration on the staging/production database.
