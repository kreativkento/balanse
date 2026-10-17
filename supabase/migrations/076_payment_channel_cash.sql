-- Walk-in / front-desk cash payments (manual admin entry + checkout).

insert into public.payment_channels (
  slug,
  label,
  subtitle,
  accent_color,
  account_name,
  account_number,
  bank_name,
  sort_order,
  is_active
)
values (
  'cash',
  'Cash',
  'Walk-in / front desk',
  '#1E2A35',
  'BALANSÉ Studio',
  '',
  'Cash',
  5,
  true
)
on conflict (slug) do update set
  label = excluded.label,
  subtitle = excluded.subtitle,
  is_active = true,
  sort_order = excluded.sort_order;
