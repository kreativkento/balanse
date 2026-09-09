-- Staff-review flag for member phone numbers.
-- Run after 032_profiles_client_document_valid.sql.
--
-- Non-null boolean, default false. Member phone updates reset the flag
-- so staff must review the new number.

alter table public.profiles_client
  add column if not exists phone_valid boolean not null default false;

comment on column public.profiles_client.phone_valid is
  'Staff review flag for the member phone number. False until approved; member updates set it back to false.';

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

  if new.phone is distinct from old.phone then
    new.phone_valid := false;
  end if;

  return new;
end;
$$;
