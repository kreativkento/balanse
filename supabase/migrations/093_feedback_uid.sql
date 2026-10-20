-- Public feedback ticket UID (F-YYYYMMxxx, Asia/Manila month). Internal id stays uuid.

alter table public.feedback_system
  add column if not exists uid text;

comment on column public.feedback_system.uid is
  'Short public reference: F-YYYYMMxxx (Philippines date). xxx resets to 001 each month.';

create unique index if not exists feedback_system_uid_idx
  on public.feedback_system (uid);

create or replace function public.feedback_next_uid(p_at timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stamp text;
  v_prefix text;
  v_seq integer;
begin
  v_stamp := to_char(timezone('Asia/Manila', p_at), 'YYYYMM');
  v_prefix := 'F-' || v_stamp;

  perform pg_advisory_xact_lock(hashtext('feedback_uid_' || v_stamp));

  select coalesce(max(right(uid, 3)::integer), 0) + 1
  into v_seq
  from public.feedback_system
  where uid ~ ('^' || v_prefix || '[0-9]{3}$');

  return v_prefix || lpad(v_seq::text, 3, '0');
end;
$$;

create or replace function public.tg_feedback_assign_uid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
    and (new.uid is null or btrim(new.uid) = '' or new.uid !~ '^F-[0-9]{9}$') then
    new.uid := public.feedback_next_uid(coalesce(new.created_at, now()));
  end if;
  return new;
end;
$$;

drop trigger if exists feedback_assign_uid on public.feedback_system;
create trigger feedback_assign_uid
  before insert on public.feedback_system
  for each row
  execute function public.tg_feedback_assign_uid();

do $$
declare
  r record;
begin
  for r in
    select id, created_at
    from public.feedback_system
    where uid is null or btrim(uid) = ''
    order by created_at asc, id asc
  loop
    update public.feedback_system
    set uid = public.feedback_next_uid(r.created_at)
    where id = r.id;
  end loop;
end;
$$;

alter table public.feedback_system
  alter column uid set not null;
