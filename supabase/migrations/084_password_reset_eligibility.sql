-- Role-scoped password reset eligibility (anon-safe; no account details returned).
-- Used before supabase.auth.resetPasswordForEmail so member/staff portals cannot cross-reset.

create or replace function public.password_reset_eligible(p_email text, p_portal text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_email text := lower(trim(p_email));
begin
  if v_email is null or v_email = '' then
    return false;
  end if;

  select a.role
  into v_role
  from public.accounts a
  where lower(a.email) = v_email
  limit 1;

  if v_role is null then
    return false;
  end if;

  if p_portal = 'internal' then
    return v_role in (
      'coach'::public.user_role,
      'admin'::public.user_role,
      'frontdesk'::public.user_role,
      'marketing'::public.user_role
    );
  end if;

  if p_portal = 'member' then
    return v_role = 'user'::public.user_role;
  end if;

  return false;
end;
$$;

comment on function public.password_reset_eligible(text, text) is
  'Returns true when p_email belongs to an account allowed to reset via p_portal (internal | member).';

revoke all on function public.password_reset_eligible(text, text) from public;
grant execute on function public.password_reset_eligible(text, text) to anon, authenticated;
