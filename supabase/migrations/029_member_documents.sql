-- Immutable signed member documents (Terms, Privacy, Health PDFs).
-- Run after 028_profiles_client_health_declaration.sql.
--
-- Changes:
--   • Latest path / accepted version / signed_at on profiles_client
--   • Private storage.member_documents bucket
--     Paths: {auth_user_id}/{kind}-{version}.pdf
--     Never overwrite a different version — filename includes the template version.
--     Folder layout {auth_user_id}/{kind}/… is applied later in 031.

alter table public.profiles_client
  add column if not exists terms_document_path text,
  add column if not exists terms_accepted_version text,
  add column if not exists terms_signed_at timestamptz,
  add column if not exists health_declaration_document_path text,
  add column if not exists health_declaration_signed_at timestamptz,
  add column if not exists privacy_policy_document_path text,
  add column if not exists privacy_accepted_version text,
  add column if not exists privacy_signed_at timestamptz;

comment on column public.profiles_client.terms_document_path is
  'Bucket path to the member''s signed Terms PDF. Immutable per version.';
comment on column public.profiles_client.terms_accepted_version is
  'Template version string the member signed (e.g. 2026-01-15).';
comment on column public.profiles_client.terms_signed_at is
  'When the member signed the current Terms PDF on file.';
comment on column public.profiles_client.health_declaration_document_path is
  'Bucket path to the member''s latest Health Declaration PDF snapshot.';
comment on column public.profiles_client.health_declaration_signed_at is
  'When the member last saved a Health Declaration PDF.';
comment on column public.profiles_client.privacy_policy_document_path is
  'Bucket path to the member''s signed Privacy Policy PDF. Immutable per version.';
comment on column public.profiles_client.privacy_accepted_version is
  'Privacy Policy template version the member accepted.';
comment on column public.profiles_client.privacy_signed_at is
  'When the member accepted the Privacy Policy PDF on file.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member_documents',
  'member_documents',
  false,
  5242880,
  array['application/pdf', 'image/png']
)
on conflict (id) do nothing;

update storage.buckets
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf', 'image/png']
where id = 'member_documents';

drop policy if exists "member_documents_select_own" on storage.objects;
drop policy if exists "member_documents_select_admin_dev" on storage.objects;
drop policy if exists "member_documents_insert_own" on storage.objects;
drop policy if exists "member_documents_update_own" on storage.objects;
drop policy if exists "member_documents_delete_own" on storage.objects;
drop policy if exists "member_documents_delete_admin_dev" on storage.objects;

-- Paths: {auth_user_id}/{kind}-{version}.pdf
create policy "member_documents_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'member_documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "member_documents_select_admin_dev"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'member_documents'
    and public.is_admin_or_dev()
  );

create policy "member_documents_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'member_documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Same-version re-sign may replace that version file only. Different versions are new objects.
create policy "member_documents_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'member_documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin_or_dev()
    )
  )
  with check (
    bucket_id = 'member_documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin_or_dev()
    )
  );

create policy "member_documents_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'member_documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "member_documents_delete_admin_dev"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'member_documents'
    and public.is_admin_or_dev()
  );
