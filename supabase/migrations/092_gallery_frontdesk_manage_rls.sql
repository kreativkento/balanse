-- Front desk: same gallery read/manage access as marketing for portal pages + search.

create or replace function public.can_manage_gallery()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in (
      'admin'::public.user_role,
      'dev'::public.user_role,
      'marketing'::public.user_role,
      'frontdesk'::public.user_role
    ),
    false
  );
$$;

revoke all on function public.can_manage_gallery() from public;
grant execute on function public.can_manage_gallery() to authenticated;
