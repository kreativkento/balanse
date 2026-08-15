-- Coach ↔ discipline multi-tags
-- Run after 014_enforce_profile_role_exclusivity.sql (and 008_disciplines.sql).
--
-- Many-to-many: a coach (accounts.role = coach) can be tagged with multiple
-- rows from public.disciplines. Use this for coach specialty filters later —
-- do not rely on profiles_staff.classes text[] for discipline identity.

-- ---------------------------------------------------------------------------
-- 1. Join table
-- ---------------------------------------------------------------------------

create table if not exists public.coach_disciplines (
  account_id uuid not null references public.accounts (id) on delete cascade,
  discipline_id uuid not null references public.disciplines (id) on delete restrict,
  tagged_at timestamptz not null default now(),
  tagged_by uuid references public.accounts (id) on delete set null,
  primary key (account_id, discipline_id)
);

comment on table public.coach_disciplines is
  'Multi-tags linking coach accounts to public.disciplines. Only role=coach.';

comment on column public.coach_disciplines.account_id is
  'Coach account (accounts.role must be coach).';

comment on column public.coach_disciplines.discipline_id is
  'Stable discipline id from the catalog — prefer this over name/slug when filtering.';

create index if not exists coach_disciplines_discipline_id_idx
  on public.coach_disciplines (discipline_id);

create index if not exists coach_disciplines_account_id_idx
  on public.coach_disciplines (account_id);

-- ---------------------------------------------------------------------------
-- 2. Enforce account is a coach
-- ---------------------------------------------------------------------------

create or replace function public.enforce_coach_disciplines_coach_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.accounts
  where id = new.account_id;

  if v_role is null then
    raise exception 'coach_disciplines.account_id % has no matching account.', new.account_id;
  end if;

  if v_role <> 'coach'::public.user_role then
    raise exception
      'coach_disciplines is exclusive to role=coach. Account % has role %.',
      new.account_id, v_role;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_coach_disciplines_coach_only on public.coach_disciplines;
create trigger trg_enforce_coach_disciplines_coach_only
  before insert or update of account_id on public.coach_disciplines
  for each row
  execute function public.enforce_coach_disciplines_coach_only();

-- Drop tags when an account is promoted/demoted away from coach
create or replace function public.clear_coach_disciplines_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.role is distinct from new.role
     and old.role = 'coach'::public.user_role
     and new.role <> 'coach'::public.user_role then
    delete from public.coach_disciplines where account_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clear_coach_disciplines_on_role_change on public.accounts;
create trigger trg_clear_coach_disciplines_on_role_change
  after update of role on public.accounts
  for each row
  execute function public.clear_coach_disciplines_on_role_change();

-- ---------------------------------------------------------------------------
-- 3. Replace-set helper (admin / self)
-- ---------------------------------------------------------------------------

create or replace function public.set_coach_disciplines(
  p_account_id uuid,
  p_discipline_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_account_id();
  v_role public.user_role;
  v_ids uuid[] := coalesce(p_discipline_ids, '{}');
begin
  if v_actor is null then
    raise exception 'Not authenticated.';
  end if;

  select role into v_role from public.accounts where id = p_account_id;
  if v_role is null then
    raise exception 'Account not found.';
  end if;
  if v_role <> 'coach'::public.user_role then
    raise exception 'Discipline tags apply only to coach accounts.';
  end if;

  if not (
    public.is_dev()
    or public.is_admin()
    or v_actor = p_account_id
  ) then
    raise exception 'Not allowed to update coach discipline tags.';
  end if;

  if exists (
    select 1
    from unnest(v_ids) as d_id
    where not exists (select 1 from public.disciplines d where d.id = d_id)
  ) then
    raise exception 'One or more discipline ids are invalid.';
  end if;

  delete from public.coach_disciplines where account_id = p_account_id;

  insert into public.coach_disciplines (account_id, discipline_id, tagged_by)
  select distinct p_account_id, d_id, v_actor
  from unnest(v_ids) as d_id;
end;
$$;

comment on function public.set_coach_disciplines(uuid, uuid[]) is
  'Replace all discipline tags for a coach. Allowed for admin/ops, dev, or the coach themself.';

grant execute on function public.set_coach_disciplines(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Backfill from legacy profiles_staff.classes name tags (best-effort)
-- ---------------------------------------------------------------------------

insert into public.coach_disciplines (account_id, discipline_id)
select distinct
  ps.account_id,
  d.id
from public.profiles_staff ps
join public.accounts a
  on a.id = ps.account_id
 and a.role = 'coach'::public.user_role
cross join lateral unnest(coalesce(ps.classes, '{}')) as tag(name)
join public.disciplines d
  on lower(d.name) = lower(trim(tag.name))
where char_length(trim(tag.name)) > 0
on conflict (account_id, discipline_id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------

alter table public.coach_disciplines enable row level security;

drop policy if exists "Coach disciplines select related" on public.coach_disciplines;
drop policy if exists "Coach disciplines insert admin ops self" on public.coach_disciplines;
drop policy if exists "Coach disciplines update admin ops self" on public.coach_disciplines;
drop policy if exists "Coach disciplines delete admin ops self" on public.coach_disciplines;

-- Readable by authenticated users (public coach pages / filters)
create policy "Coach disciplines select related"
  on public.coach_disciplines
  for select
  to authenticated
  using (true);

create policy "Coach disciplines insert admin ops self"
  on public.coach_disciplines
  for insert
  to authenticated
  with check (
    public.is_dev()
    or public.is_admin()
    or account_id = public.current_account_id()
  );

create policy "Coach disciplines update admin ops self"
  on public.coach_disciplines
  for update
  to authenticated
  using (
    public.is_dev()
    or public.is_admin()
    or account_id = public.current_account_id()
  )
  with check (
    public.is_dev()
    or public.is_admin()
    or account_id = public.current_account_id()
  );

create policy "Coach disciplines delete admin ops self"
  on public.coach_disciplines
  for delete
  to authenticated
  using (
    public.is_dev()
    or public.is_admin()
    or account_id = public.current_account_id()
  );
