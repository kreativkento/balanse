-- Use class_block_status.cancelled in RLS (must run after 087 commits the new enum value).

drop policy if exists "Classes select active or closed block authenticated" on public.classes;

create policy "Classes select active or closed block authenticated"
  on public.classes
  for select
  to authenticated
  using (
    status_block in (
      'active'::public.class_block_status,
      'completed'::public.class_block_status,
      'cancelled'::public.class_block_status
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
        'completed'::public.class_block_status,
        'cancelled'::public.class_block_status
      )
  );
$$;

grant execute on function public.rls_class_is_active_block(uuid) to anon, authenticated;
