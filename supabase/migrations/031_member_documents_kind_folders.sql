-- Move signed PDFs into per-document folders.
-- Run after 029_member_documents.sql and 030_member_documents_signature_png.sql.
--
-- From: {auth_user_id}/{kind}-{version}.pdf
-- To:   {auth_user_id}/{kind}/{kind}-{version}.pdf
--
-- e-signature.png stays at {auth_user_id}/e-signature.png.

-- 1. Bucket objects already uploaded at the flat path
update storage.objects o
set name = regexp_replace(
  o.name,
  '^([^/]+)/(terms|privacy|health)-([^/]+\.pdf)$',
  '\1/\2/\2-\3'
)
where o.bucket_id = 'member_documents'
  and o.name ~ '^[^/]+/(terms|privacy|health)-[^/]+\.pdf$'
  and not exists (
    select 1
    from storage.objects existing
    where existing.bucket_id = 'member_documents'
      and existing.name = regexp_replace(
        o.name,
        '^([^/]+)/(terms|privacy|health)-([^/]+\.pdf)$',
        '\1/\2/\2-\3'
      )
  );

-- 2. Profile pointers so View / Download follow the new keys
update public.profiles_client
set terms_document_path = regexp_replace(
  terms_document_path,
  '^([^/]+)/terms-([^/]+\.pdf)$',
  '\1/terms/terms-\2'
)
where terms_document_path ~ '^[^/]+/terms-[^/]+\.pdf$';

update public.profiles_client
set privacy_policy_document_path = regexp_replace(
  privacy_policy_document_path,
  '^([^/]+)/privacy-([^/]+\.pdf)$',
  '\1/privacy/privacy-\2'
)
where privacy_policy_document_path ~ '^[^/]+/privacy-[^/]+\.pdf$';

update public.profiles_client
set health_declaration_document_path = regexp_replace(
  health_declaration_document_path,
  '^([^/]+)/health-([^/]+\.pdf)$',
  '\1/health/health-\2'
)
where health_declaration_document_path ~ '^[^/]+/health-[^/]+\.pdf$';

comment on column public.profiles_client.terms_document_path is
  'Bucket path to the member''s signed Terms PDF: {auth_user_id}/terms/terms-{version}.pdf.';
comment on column public.profiles_client.privacy_policy_document_path is
  'Bucket path to the member''s signed Privacy PDF: {auth_user_id}/privacy/privacy-{version}.pdf.';
comment on column public.profiles_client.health_declaration_document_path is
  'Bucket path to the member''s Health Declaration PDF: {auth_user_id}/health/health-{version}.pdf.';
