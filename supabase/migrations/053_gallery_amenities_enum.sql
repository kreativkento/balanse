-- Add gallery_tag enum value for amenities carousel posts.
-- MUST commit before running 054_gallery_amenities_seed.sql (PostgreSQL enum rule).
-- Safe to re-run.

do $$
begin
  alter type public.gallery_tag add value 'Amenities';
exception
  when duplicate_object then null;
end $$;
