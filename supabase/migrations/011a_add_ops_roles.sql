-- STEP 1 of 2 — add ops roles to user_role
-- Run this alone in Supabase SQL Editor and wait for success before running
-- 011_split_profiles_and_ops_roles.sql
--
-- Postgres requires new enum values to be COMMITTED before they can be used
-- in functions/policies (error 55P04).

alter type public.user_role add value if not exists 'frontdesk';
alter type public.user_role add value if not exists 'marketing';
