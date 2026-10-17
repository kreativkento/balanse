-- Allow staff availability periods at any time of day (not limited to 09:00–21:00).

create or replace function public.validate_staff_availability_periods(
  p_day_off boolean,
  p_periods jsonb
)
returns boolean
language plpgsql
immutable
as $$
declare
  elem jsonb;
  v_start text;
  v_end text;
begin
  if p_periods is null or jsonb_typeof(p_periods) <> 'array' then
    return false;
  end if;

  if p_day_off then
    return jsonb_array_length(p_periods) = 0;
  end if;

  if jsonb_array_length(p_periods) = 0 then
    return false;
  end if;

  for elem in select * from jsonb_array_elements(p_periods)
  loop
    v_start := elem->>'start';
    v_end := elem->>'end';
    if v_start is null or v_end is null then
      return false;
    end if;
    if v_start !~ '^\d{2}:\d{2}$' or v_end !~ '^\d{2}:\d{2}$' then
      return false;
    end if;
    if v_start >= v_end then
      return false;
    end if;
  end loop;

  return true;
end;
$$;
