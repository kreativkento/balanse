-- Fix: role promotion from SQL Editor / seed scripts was blocked by protect_account_role.
-- Run this once in Supabase SQL Editor, then promote your accounts (see bottom).

create or replace function public.protect_account_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.role is distinct from new.role then
    -- SQL Editor / migrations run without a JWT (auth.uid() is null)
    if auth.uid() is null then
      null;
    elsif public.is_dev() then
      null;
    elsif public.is_admin()
      and public.is_managed_account_role(old.role)
      and public.is_managed_account_role(new.role) then
      null;
    else
      new.role := old.role;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Promote seeded accounts (adjust emails if you changed them)
update public.accounts set role = 'admin' where email = 'admin@balanse.com';
update public.accounts set role = 'dev' where email = 'dev@balanse.com';
