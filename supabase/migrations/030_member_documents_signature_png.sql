-- Allow transparent e-signature PNGs in member_documents.
-- Run after 029_member_documents.sql (safe if 029 was already applied).

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/png']
where id = 'member_documents';
