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

**Disciplines catalog (event tags):** after `001_profiles.sql`, run `008_disciplines.sql`. This creates `public.disciplines` and seeds the gym’s discipline list (Calisthenics, Yoga, kids classes, etc.). Admins/devs can add or deactivate rows later; tag events by `discipline.id` (stable), not by name.

**Events / classes:** after `008_disciplines.sql`, run `009_events.sql`, then **`013_rename_events_to_classes.sql`** which renames `events` → `classes`, `event_coaches` → `class_coaches`, `event_enrollments` → `class_students` (`event_id` → `class_id`). Admin UI: `/admin-classes`.

**Split profiles + ops roles:** after the above (and `900` if installed), run **in two separate SQL Editor executions**:
1. `011a_add_ops_roles.sql` (adds `frontdesk` / `marketing` — must commit first)
2. `011_split_profiles_and_ops_roles.sql` (creates `profiles_staff`, wires admin-equivalent privileges)

Postgres rejects using new enum values in the same transaction that adds them (`55P04`).

**Client profile rename + nationality:** after `011`, run `012_profiles_client_nationality.sql`. Renames `profiles_student` → `profiles_client`, drops `cell_number`, adds `nationality`, and stores setup phone in `phone`.

**Profile role exclusivity:** after `012`, run `014_enforce_profile_role_exclusivity.sql`:
- `profiles_client` → `accounts.role = user` only
- `profiles_staff` → `coach` / `admin` / `dev` / `frontdesk` / `marketing` only

**Coach discipline tags:** after `014`, run `015_coach_disciplines.sql`. Creates `public.coach_disciplines` (many disciplines per coach) and `set_coach_disciplines(account_id, discipline_ids[])`.

**Staff nationality:** after `016`, run `017_profiles_staff_nationality.sql` (adds `profiles_staff.nationality`).

This creates or syncs:

| Table | Purpose |
|-------|---------|
| `auth.users` | Email + password (Supabase Auth, not in public schema) |
| `public.accounts` | Login identity (email) + role, linked to `auth.users` |
| `public.profiles_client` | Client/member profile (`role = user`) — run `012_profiles_client_nationality.sql` |
| `public.profiles_staff` | Staff/ops profile (coach, admin, dev, frontdesk, marketing) |
| `public.coach_disciplines` | Multi-tags: coach account ↔ `disciplines` (`015`) |
| `public.disciplines` | Dynamic discipline list for event/class tagging (`008_disciplines.sql`) |
| `public.classes` | Class shell: name, discipline tag, date, capacity, status, creator (`013`) |
| `public.class_coaches` | Coaches assigned to a class (min 1) |
| `public.class_students` | Students enrolled in a class (capped by `class_limit`) |

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
| user  | `/login`        | `/signup` | Own `profiles_client` only |
| coach | `/staff-login`  | None | Coach portal + `profiles_staff` |
| admin | `/admin-login`  | None | Admin portal; manage user + coach data |
| frontdesk | `/admin-login` | None | Same privileges as admin (for now) |
| marketing | `/admin-login` | None | Same privileges as admin (for now) |
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
