-- Close enrollable blocks once their scheduled start time has passed.

create or replace function public.close_started_class_blocks()
returns void
language sql
security definer
set search_path = public
as $$
  update public.classes
  set
    status_block = 'closed'::public.class_block_status,
    updated_at = now()
  where status_block in (
    'active'::public.class_block_status,
    'occupied'::public.class_block_status
  )
  and starts_at <= now();
$$;

comment on function public.close_started_class_blocks() is
  'Sets status_block to closed for active/occupied classes whose starts_at is in the past.';

grant execute on function public.close_started_class_blocks() to authenticated;
