-- Staff-review flags for required member documents.
-- Run after 031_member_documents_kind_folders.sql.
--
-- Each document type has a non-null boolean, default false.
-- Member updates to that document reset its flag to false
-- (needs review again). Setting only the flag itself is left alone
-- so staff can mark a file valid later.

alter table public.profiles_client
  add column if not exists health_valid boolean not null default false,
  add column if not exists terms_valid boolean not null default false,
  add column if not exists privacy_valid boolean not null default false;

comment on column public.profiles_client.health_valid is
  'Staff review flag for the Health Declaration. False until approved; member updates set it back to false.';
comment on column public.profiles_client.terms_valid is
  'Staff review flag for Terms & Conditions. False until approved; member updates set it back to false.';
comment on column public.profiles_client.privacy_valid is
  'Staff review flag for the Privacy Policy. False until approved; member updates set it back to false.';

create or replace function public.reset_document_valid_on_member_update()
returns trigger
language plpgsql
as $$
begin
  if new.health_declaration is distinct from old.health_declaration
    or new.health_declaration_document_path is distinct from old.health_declaration_document_path
    or new.health_declaration_signed_at is distinct from old.health_declaration_signed_at
  then
    new.health_valid := false;
  end if;

  if new.terms_accepted is distinct from old.terms_accepted
    or new.terms_document_path is distinct from old.terms_document_path
    or new.terms_accepted_version is distinct from old.terms_accepted_version
    or new.terms_signed_at is distinct from old.terms_signed_at
  then
    new.terms_valid := false;
  end if;

  if new.privacy_policy_document_path is distinct from old.privacy_policy_document_path
    or new.privacy_accepted_version is distinct from old.privacy_accepted_version
    or new.privacy_signed_at is distinct from old.privacy_signed_at
  then
    new.privacy_valid := false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reset_document_valid_on_member_update on public.profiles_client;

create trigger trg_reset_document_valid_on_member_update
  before update on public.profiles_client
  for each row
  execute function public.reset_document_valid_on_member_update();
