-- Human-readable class UID: YYMMDD + 2-digit daily sequence (Asia/Manila calendar day).
-- Sequence resets each calendar day at insert time.

create table if not exists public.class_uid_daily (
  day date primary key,
  counter integer not null default 0
);

alter table public.classes
  add column if not exists uid text;

create unique index if not exists classes_uid_unique_idx
  on public.classes (uid)
  where uid is not null;

comment on column public.classes.uid is
  'Display id: YYMMDD## where ## increments per calendar day (Asia/Manila) at insert time.';

create or replace function public.next_class_uid(p_moment timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (timezone('Asia/Manila', p_moment))::date;
  v_prefix text := to_char(v_day, 'YYMMDD');
  v_seq integer;
begin
  insert into public.class_uid_daily as d (day, counter)
  values (v_day, 1)
  on conflict (day) do update
    set counter = d.counter + 1
  returning counter into v_seq;

  if v_seq > 99 then
    raise exception 'Daily class UID limit (99) reached for %.', v_day;
  end if;

  return v_prefix || lpad(v_seq::text, 2, '0');
end;
$$;

create or replace function public.set_class_uid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.uid is null or trim(new.uid) = '' then
    new.uid := public.next_class_uid(coalesce(new.created_at, now()));
  end if;
  return new;
end;
$$;

drop trigger if exists classes_set_uid on public.classes;
create trigger classes_set_uid
  before insert on public.classes
  for each row
  execute function public.set_class_uid();

-- Backfill existing rows in chronological order per Manila day.
do $$
declare
  r record;
  v_day date;
  v_prefix text;
  v_seq integer;
begin
  for r in
    select id, created_at
    from public.classes
    where uid is null
    order by created_at asc, id asc
  loop
    v_day := (timezone('Asia/Manila', r.created_at))::date;
    v_prefix := to_char(v_day, 'YYMMDD');

    insert into public.class_uid_daily as d (day, counter)
    values (v_day, 1)
    on conflict (day) do update
      set counter = d.counter + 1
    returning counter into v_seq;

    update public.classes
    set uid = v_prefix || lpad(v_seq::text, 2, '0')
    where id = r.id;
  end loop;
end;
$$;

alter table public.classes
  alter column uid set not null;
