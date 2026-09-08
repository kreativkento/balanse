-- BALANSÉ user feedback loop
-- Any signed-in account (member, coach, admin, ops, dev) can submit.
-- Ticket id = public.feedback_system.id (uuid). Status starts as unresolved.
-- ticket_level is required and defaults to 1 on submit.
-- Priority is staff-only (nullable; not collected on the form).
--
-- Run after 001_profiles.sql (needs current_account_id / is_admin_or_dev).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.feedback_label as enum (
    'positive',
    'bug',
    'feature',
    'question',
    'improvement'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.feedback_status as enum (
    'unresolved',
    'in_progress',
    'resolved'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.feedback_priority as enum (
    'low',
    'medium',
    'high',
    'urgent'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_system (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null references public.accounts (id) on delete restrict,

  title text not null
    check (char_length(btrim(title)) > 0 and char_length(title) <= 200),
  description text not null
    check (char_length(btrim(description)) > 0 and char_length(description) <= 1000),

  label public.feedback_label not null,
  status public.feedback_status not null default 'unresolved',
  priority public.feedback_priority,
  ticket_level smallint not null default 1,

  attachment_path text,
  attachment_name text,
  attachment_mime text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feedback_system is
  'User feedback tickets. id is the ticket id. Submitted by any authenticated account.';

comment on column public.feedback_system.id is
  'Ticket id for this submission.';

comment on column public.feedback_system.account_id is
  'Account id of the user who submitted this ticket.';

comment on column public.feedback_system.status is
  'Workflow status. New submissions are always unresolved.';

comment on column public.feedback_system.priority is
  'Staff-assigned priority. Null until a reviewer sets it. Not collected on the form.';

comment on column public.feedback_system.ticket_level is
  'Ticket level. New submissions always start at 1.';

comment on column public.feedback_system.attachment_path is
  'Object path in the feedback_attachments bucket, if the user uploaded a file.';

create index if not exists feedback_system_account_id_idx on public.feedback_system (account_id);
create index if not exists feedback_system_status_idx on public.feedback_system (status);
create index if not exists feedback_system_label_idx on public.feedback_system (label);
create index if not exists feedback_system_priority_idx on public.feedback_system (priority);
create index if not exists feedback_system_ticket_level_idx on public.feedback_system (ticket_level);
create index if not exists feedback_system_created_at_idx on public.feedback_system (created_at desc);

create or replace function public.tg_feedback_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_feedback_updated_at on public.feedback_system;
create trigger trg_feedback_updated_at
  before update on public.feedback_system
  for each row
  execute function public.tg_feedback_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.feedback_system enable row level security;

drop policy if exists "Feedback select own" on public.feedback_system;
drop policy if exists "Feedback select admin_dev" on public.feedback_system;
drop policy if exists "Feedback insert own" on public.feedback_system;
drop policy if exists "Feedback update admin_dev" on public.feedback_system;
drop policy if exists "Feedback update own attachment" on public.feedback_system;
drop policy if exists "Feedback delete admin_dev" on public.feedback_system;
drop policy if exists "Feedback delete own unresolved" on public.feedback_system;

-- Submitters can read their own tickets.
create policy "Feedback select own"
  on public.feedback_system
  for select
  to authenticated
  using (account_id = public.current_account_id());

-- Admins and developers can read every ticket.
create policy "Feedback select admin_dev"
  on public.feedback_system
  for select
  to authenticated
  using (public.is_admin_or_dev());

-- Any signed-in account can open a ticket for themselves.
-- Status is forced to unresolved; priority stays null; ticket_level starts at 1.
create policy "Feedback insert own"
  on public.feedback_system
  for insert
  to authenticated
  with check (
    account_id = public.current_account_id()
    and status = 'unresolved'::public.feedback_status
    and priority is null
    and ticket_level = 1
  );

-- Reviewers update status / priority. Submitters cannot edit after send.
create policy "Feedback update admin_dev"
  on public.feedback_system
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

-- Submitters may delete their own ticket only while it is still unresolved.
create policy "Feedback delete own unresolved"
  on public.feedback_system
  for delete
  to authenticated
  using (
    account_id = public.current_account_id()
    and status = 'unresolved'::public.feedback_status
  );

create policy "Feedback delete admin_dev"
  on public.feedback_system
  for delete
  to authenticated
  using (public.is_admin_or_dev());

grant select, insert, update, delete on table public.feedback_system to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback_attachments',
  'feedback_attachments',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

update storage.buckets
set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
where id = 'feedback_attachments';

drop policy if exists "feedback_attachments_select_own" on storage.objects;
drop policy if exists "feedback_attachments_select_admin_dev" on storage.objects;
drop policy if exists "feedback_attachments_insert_own" on storage.objects;
drop policy if exists "feedback_attachments_update_own" on storage.objects;
drop policy if exists "feedback_attachments_delete_own" on storage.objects;
drop policy if exists "feedback_attachments_delete_admin_dev" on storage.objects;

-- Paths: {auth_user_id}/{ticket_id}/{filename}
create policy "feedback_attachments_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "feedback_attachments_select_admin_dev"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and public.is_admin_or_dev()
  );

create policy "feedback_attachments_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'feedback_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "feedback_attachments_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin_or_dev()
    )
  )
  with check (
    bucket_id = 'feedback_attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin_or_dev()
    )
  );

create policy "feedback_attachments_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "feedback_attachments_delete_admin_dev"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and public.is_admin_or_dev()
  );
