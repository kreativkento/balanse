-- Members may view closed timeblocks on the class schedule (read-only / history).
-- Public (anon) stays active-only.

drop policy if exists "Classes select active block public" on public.classes;

create policy "Classes select active block public"
  on public.classes
  for select
  to anon
  using (status_block = 'active'::public.class_block_status);

drop policy if exists "Classes select active or closed block authenticated" on public.classes;

create policy "Classes select active or closed block authenticated"
  on public.classes
  for select
  to authenticated
  using (
    status_block in (
      'active'::public.class_block_status,
      'closed'::public.class_block_status
    )
  );

create or replace function public.rls_class_is_active_block(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.status_block in (
        'active'::public.class_block_status,
        'closed'::public.class_block_status
      )
  );
$$;

grant execute on function public.rls_class_is_active_block(uuid) to anon, authenticated;
