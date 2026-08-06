# Supabase setup for BALANSÉ

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Configure environment variables

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Fill in your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server after changing `.env`.

## 3. Run the database migration

In **Supabase Dashboard → SQL Editor**, run:

`supabase/migrations/001_profiles.sql`

This file is **safe on existing `accounts` + `profiles` tables** — it skips objects that already exist and adds/updates functions, triggers, RLS policies, and the admin delete RPC.

**Only if you want a full wipe first** (deletes all BALANSÉ auth data), run `000_reset_balanse_auth.sql` before `001_profiles.sql`.

**If you see `type "user_role" already exists` on an old copy of the file**, pull the latest `001_profiles.sql` (it handles that case) and run it again.

**If your database still uses the old `staff` role**, run `007_rename_staff_role_to_coach.sql` after the other migrations.

This creates or syncs:

| Table | Purpose |
|-------|---------|
| `auth.users` | Email + password (Supabase Auth, not in public schema) |
| `public.accounts` | Login identity (email) + role, linked to `auth.users` |
| `public.profiles` | System-generated profile UUID + profile fields, linked to `accounts` |

## 4. Auth settings (recommended)

In **Authentication → Providers → Email**:

- Turn **off** “Confirm email” while developing (signup goes straight to profile setup).
- Turn it **on** in production when you are ready.

## 5. Create coach, admin, and dev accounts

### Default admin (precreate)

After running `001_profiles.sql`, run in **SQL Editor**:

`supabase/seed/001_admin_account.sql`

Default credentials:

| Field | Value |
|-------|--------|
| Email | `admin@balanse.com` |
| Password | `BalanseAdmin2026!` |
| Login | `/admin-login` |

Change the password after first sign-in. To use a different email/password, edit the `v_email` and `v_password` variables at the top of the seed file before running.

### Default dev (precreate)

Run in **SQL Editor**:

`supabase/seed/002_dev_account.sql`

Default credentials:

| Field | Value |
|-------|--------|
| Email | `dev@balanse.com` |
| Password | `BalanseDev2026!` |
| Login | Any portal (`/admin-login`, `/staff-login`, or `/login`) |

`dev` has full access to all data and passes all portal role checks. Change the password after first sign-in.

### Admin create coach (required migration)

Run in **SQL Editor** after `001_profiles.sql`:

`supabase/migrations/004_admin_create_staff_account.sql`

This enables **Admin → Staff → Add Staff** to create real coach login accounts (email + password, role `coach`).

### Other coach accounts (manual)

There is **no signup page** for coaches. Create them in the dashboard:

1. **Authentication → Users → Add user** (email + password).
2. Promote the account role in **SQL Editor**:

```sql
update public.accounts set role = 'coach' where email = 'coach@example.com';
```

## 6. Roles and login portals

| Role  | Login route     | Signup | Access |
|-------|-----------------|--------|--------|
| user  | `/login`        | `/signup` | Own profile only |
| coach | `/staff-login`  | None | Coach portal + own profile |
| admin | `/admin-login`  | None | Admin portal; manage all user + coach data |
| dev   | Any portal      | None | Full access to all accounts/profiles |

Each portal verifies the account `role` in `public.accounts` after Supabase Auth sign-in. The `dev` role passes all portal checks and has full database access via RLS.

## 7. Admin permissions (user + coach data)

Admins can **create**, **read**, **update**, and **delete** user and coach records:

| Action | Users     | Coaches    | Notes |
|--------|-----------|------------|-------|
| Read   | Yes       | Yes        | List/view all user and coach accounts + profiles |
| Create | Yes       | Yes        | Coaches: **Admin → Staff → Add Staff** (requires `004_admin_create_staff_account.sql`). Users: public signup at `/signup` |
| Update | Yes       | Yes        | Edit account email/role (`user` ↔ `coach`) and all profile fields |
| Delete | Yes       | Yes        | Removes login, account, and profile via `admin_delete_managed_account` RPC |

Admins **cannot** modify other admin or dev accounts. Only `dev` has unrestricted access.

App-side helpers for future admin pages (no UI wired yet):

- `src/lib/admin-service.ts` — list, update, and delete user/coach records

## Security notes

- Only the **anon key** belongs in the frontend (`.env`).
- Never put the **service role key** in client code.
- Passwords are stored only in Supabase Auth (`auth.users`), never in `public.accounts`.
- Public signup always creates `role = 'user'`; clients cannot self-promote to coach/admin/dev.
- Promoting accounts to coach/admin/dev must be done via SQL Editor or by an existing admin/dev with appropriate access.
