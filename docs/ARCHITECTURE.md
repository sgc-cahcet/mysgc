# Architecture

Overview of the project structure, database schema, RLS policies, and security model.

---

## Project Structure

```
mysgc/
├── app/                          # Next.js App Router pages
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard
│   ├── dashboard/
│   │   ├── page.tsx              # Member dashboard
│   │   └── session-history/
│   │       └── page.tsx          # Past sessions
│   ├── login/
│   │   └── page.tsx              # Login / sign-up
│   ├── change-password/
│   │   └── page.tsx              # Change password
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── admin/
│   │   ├── session-interest-card.tsx
│   │   ├── feedback-display.tsx
│   │   └── status-message.tsx
│   ├── auth/
│   │   ├── SessionGuard.tsx
│   │   └── ForgotPasswordDialog.tsx
│   ├── ui/                       # shadcn/ui primitives
│   ├── attendance-card.tsx
│   ├── sessions-card.tsx
│   ├── feedback-form.tsx
│   ├── session-interest-form.tsx
│   ├── dashboard-header.tsx
│   └── remove-service-worker.tsx
├── lib/
│   ├── session-types.ts          # TypeScript interfaces
│   ├── date-utils.ts             # Date helpers (IST)
│   ├── auth-errors.ts            # Auth error messages
│   └── utils.ts                  # Tailwind cn() helper
├── hooks/
│   └── use-toast.ts
├── supabase/                     # SQL schema + migrations
│   ├── queries-and-rls.sql
│   └── two-handler-session-migration.sql
└── public/
    └── logo.png
```

---

## Database Schema

### `members`

Stores registered SGC members. Pre-seeded by administrators — users can only sign up if their email exists here.

| Column          | Type        | Notes                                   |
| --------------- | ----------- | --------------------------------------- |
| `id`            | `integer`   | Primary key                             |
| `name`          | `text`      |                                         |
| `email`         | `text`      | Unique, matched against auth email      |
| `department`    | `text`      |                                         |
| `role`          | `text`      | One of: `Member`, `Session Incharge`, `Administrator`, `Vice President`, `President` |
| `is_registered` | `boolean`   | Set to `true` after first sign-up       |

### `sessions`

Approved sessions (the official schedule).

| Column           | Type      | Notes                                |
| ---------------- | --------- | ------------------------------------ |
| `id`             | `uuid`    | Primary key                          |
| `title`          | `text`    |                                      |
| `date`           | `date`    |                                      |
| `time`           | `time`    | Default `01:00 PM`                   |
| `type`           | `text`    | e.g. Technical, Soft Skills, Career  |
| `handler`        | `text`    | Primary handler name                 |
| `handler_id`     | `integer` | FK to `members.id`                   |
| `handler_count`  | `integer` | 1 or 2                               |
| `co_handler`     | `text`    | Co-handler name (nullable)           |
| `co_handler_id`  | `integer` | FK to `members.id` (nullable)        |
| `description`    | `text`    |                                      |
| `is_approved`    | `boolean` | Always `true` for records here       |

### `session_interests`

Proposed sessions submitted by members via the interest form.

| Column            | Type           | Notes                                |
| ----------------- | -------------- | ------------------------------------ |
| `id`              | `uuid`         | Primary key                          |
| `member_id`       | `integer`      | FK to `members.id`                   |
| `member_name`     | `text`         | Denormalized for display             |
| `topic`           | `text`         |                                      |
| `type`            | `text`         |                                      |
| `preferred_date`  | `date`         |                                      |
| `description`     | `text`         |                                      |
| `handler_count`   | `integer`      | 1 or 2                               |
| `co_handler_id`   | `integer`      | FK to `members.id` (nullable)        |
| `co_handler_name` | `text`         | Denormalized (nullable)              |
| `is_approved`     | `boolean`      | `false` = pending, `true` = approved |
| `created_at`      | `timestamptz`  |                                      |

### `session_feedback`

Ratings and comments for completed sessions.

| Column       | Type           | Notes                          |
| ------------ | -------------- | ------------------------------ |
| `id`         | `uuid`         | Primary key                    |
| `session_id` | `uuid`         | FK to `sessions.id`            |
| `member_id`  | `integer`      | FK to `members.id`             |
| `rating`     | `integer`      | 1–5                            |
| `comments`   | `text`         | (nullable)                     |
| `date`       | `date`         | Session date (denormalized)    |
| `created_at` | `timestamptz`  |                                |

### `attendance`

Daily attendance records per member.

| Column       | Type      | Notes                  |
| ------------ | --------- | ---------------------- |
| `id`         | `uuid`    | Primary key            |
| `member_id`  | `integer` | FK to `members.id`     |
| `date`       | `date`    |                        |
| `is_present` | `boolean` |                        |

### Other tables

- **`feedback`** — Generic feedback (separate from session feedback). Used by admins.
- **`notifications`**, **`push_subscriptions`** — Push notification scaffolding.

---

## Indexes

```sql
attendance_member_date_idx        ON attendance (member_id, date)
attendance_date_idx               ON attendance (date)
sessions_handler_date_idx         ON sessions (handler_id, date desc)
sessions_co_handler_date_idx      ON sessions (co_handler_id, date desc)
sessions_lookup_idx               ON sessions (title, handler, date)
session_feedback_session_created  ON session_feedback (session_id, created_at desc)
session_feedback_member_date      ON session_feedback (member_id, date desc)
session_interests_member_created  ON session_interests (member_id, created_at desc)
```

---

## Row-Level Security

Every table has RLS enabled. Policies use three helper functions:

- `current_member_id()` — returns `members.id` of the authenticated user (from JWT email)
- `current_member_role()` — returns the role of the authenticated user
- `is_admin_member()` — returns `true` if the user has an admin role

### Policy matrix

| Table                | Select                             | Insert             | Update/Delete       |
| -------------------- | ---------------------------------- | ------------------ | ------------------- |
| `members`            | Self or admin                      | —                  | —                   |
| `attendance`         | Self or admin                      | —                  | Admin only          |
| `sessions`           | All authenticated                  | —                  | Admin only          |
| `session_interests`  | Self or admin                      | Self or admin      | Admin only          |
| `session_feedback`   | Self, admin, or session handler    | Self or admin      | Admin delete only   |
| `feedback`           | Admin only                         | All authenticated  | Admin update only   |
| `notifications`      | Self or admin                      | Admin only         | Self or admin       |
| `push_subscriptions` | Self or admin                      | Self or admin      | Self or admin       |

---

## Data Handling & Security

### Authentication flow

1. User visits `/login` and enters their email.
2. The app calls `check_member_registration_status(email)` via Supabase RPC to verify the email exists in `members`.
3. If not found, access is denied.
4. If the member hasn't registered yet, they can create a password.
5. On sign-up, `members.is_registered` is set to `true`.
6. All subsequent requests use Supabase Auth JWT (PKCE flow).

### Authorization

- **RLS** on every table ensures members can only access their own data.
- **Admin roles** (`President`, `Vice President`, `Administrator`, `Session Incharge`) are checked by `is_admin_member()` in RLS policies.
- The admin dashboard also checks roles client-side and redirects unauthorized users.

### Client-side Supabase client

All components use `createBrowserClient()` from `@supabase/auth-helpers-nextjs` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` passed explicitly. The client is cached as a singleton after first creation.

### Data denormalization

Some fields are denormalized for performance:

- `session_interests.member_name` — copied from `members.name` at insert time (avoids joins in list views).
- `session_feedback.date` — copied from `sessions.date` at insert time.
