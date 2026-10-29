-- Public pricing & services catalog, managed by admin.
-- Safe to re-run.

do $$
begin
  create type public.pricing_offering_kind as enum (
    'featured_pass',
    'membership',
    'service'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.pricing_offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  kind public.pricing_offering_kind not null,
  title text not null
    check (char_length(btrim(title)) > 0 and char_length(title) <= 80),
  tagline text not null default ''
    check (char_length(tagline) <= 240),
  description text not null default ''
    check (char_length(description) <= 1000),
  badge text
    check (badge is null or char_length(badge) <= 32),
  highlight boolean not null default false,
  hero_price_label text not null default ''
    check (char_length(hero_price_label) <= 40),
  hero_price_unit text not null default ''
    check (char_length(hero_price_unit) <= 40),
  inclusions text[] not null default '{}'::text[],
  tiers jsonb not null default '[]'::jsonb,
  chips text[] not null default '{}'::text[],
  cta_label text not null default 'Book Now'
    check (char_length(btrim(cta_label)) > 0 and char_length(cta_label) <= 40),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_offerings_slug_key unique (slug),
  constraint pricing_offerings_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 64),
  constraint pricing_offerings_tiers_array check (jsonb_typeof(tiers) = 'array')
);

comment on table public.pricing_offerings is
  'Public /pricing and /services cards. Admin CRUD; anon reads active rows.';

create index if not exists pricing_offerings_kind_sort_idx
  on public.pricing_offerings (kind, sort_order, title);

create or replace function public.tg_pricing_offerings_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_pricing_offerings_updated_at on public.pricing_offerings;
create trigger trg_pricing_offerings_updated_at
  before update on public.pricing_offerings
  for each row
  execute function public.tg_pricing_offerings_set_updated_at();

alter table public.pricing_offerings enable row level security;

drop policy if exists pricing_offerings_select_active_public on public.pricing_offerings;
drop policy if exists pricing_offerings_select_admin on public.pricing_offerings;
drop policy if exists pricing_offerings_insert_admin on public.pricing_offerings;
drop policy if exists pricing_offerings_update_admin on public.pricing_offerings;
drop policy if exists pricing_offerings_delete_admin on public.pricing_offerings;

create policy pricing_offerings_select_active_public
  on public.pricing_offerings
  for select
  to anon, authenticated
  using (is_active = true or public.is_admin_or_dev());

create policy pricing_offerings_insert_admin
  on public.pricing_offerings
  for insert
  to authenticated
  with check (public.is_admin_or_dev());

create policy pricing_offerings_update_admin
  on public.pricing_offerings
  for update
  to authenticated
  using (public.is_admin_or_dev())
  with check (public.is_admin_or_dev());

create policy pricing_offerings_delete_admin
  on public.pricing_offerings
  for delete
  to authenticated
  using (public.is_admin_or_dev());

grant select on table public.pricing_offerings to anon, authenticated;
grant insert, update, delete on table public.pricing_offerings to authenticated;

insert into public.pricing_offerings (
  slug, kind, title, tagline, description, badge, highlight,
  hero_price_label, hero_price_unit, inclusions, tiers, chips, cta_label, sort_order, is_active
)
values
  (
    'single-class-pass',
    'featured_pass',
    'Single Class Pass',
    'Drop in to any class, no commitment required.',
    'Drop in to any class, no commitment required.',
    'Flexible',
    false,
    '₱360',
    '/session',
    '{}'::text[],
    '[]'::jsonb,
    array['Calisthenics','Kickboxing','Mat Pilates','Yoga','Animal Flow','Circuit Training','Groundworks','Capoeira'],
    'See More',
    10,
    true
  ),
  (
    'gold-membership',
    'membership',
    'Gold Membership',
    'Unlimited access to all classes. Perfect for those who value variety, flexibility, and balance in their wellness journey.',
    'Unlimited access to all classes. Perfect for those who value variety, flexibility, and balance in their wellness journey.',
    'Popular',
    true,
    '₱4,800',
    '/month',
    array['Welcome gift upon joining','Active Gold member event discount','Membership card','Priority booking'],
    '[
      {"label":"1 Week","note":"Unlimited all classes","price":"₱1,800","highlight":false},
      {"label":"1 Month","note":"Unlimited all classes","price":"₱4,800","highlight":true},
      {"label":"3 Months","note":"Unlimited all classes","price":"₱12,500","highlight":false}
    ]'::jsonb,
    '{}'::text[],
    'Book Now',
    20,
    true
  ),
  (
    'silver-membership',
    'membership',
    'Silver Membership',
    'A cost-friendly way to stay consistent. Focus on one class and build progress in the style you love most.',
    'A cost-friendly way to stay consistent. Focus on one class and build progress in the style you love most.',
    'Focused',
    false,
    '₱3,600',
    '/month',
    array['12 sessions for the price of 10','Active Silver member event discount','Membership card','Priority booking'],
    '[
      {"label":"1 Month","note":"Calisthenics only","price":"₱3,600","highlight":false},
      {"label":"1 Month","note":"Circuit Training only","price":"₱3,600","highlight":false},
      {"label":"1 Month","note":"Mat Pilates only","price":"₱3,600","highlight":false},
      {"label":"1 Month","note":"Yoga only","price":"₱3,600","highlight":false}
    ]'::jsonb,
    '{}'::text[],
    'Book Now',
    30,
    true
  ),
  (
    'personal-coaching',
    'service',
    'Personal Coaching',
    '1-on-1 programs & coach support',
    '1-on-1 programs & coach support',
    null,
    false,
    '₱4,500',
    '/month',
    array['Wellness assessment','Member event discounts'],
    '[
      {"label":"1 Month","note":"6 sessions","price":"₱4,500","highlight":false},
      {"label":"1 Month","note":"12 sessions","price":"₱8,000","highlight":false},
      {"label":"2 Months","note":"20 sessions","price":"₱13,500","highlight":false}
    ]'::jsonb,
    '{}'::text[],
    'Inquire Now',
    40,
    true
  ),
  (
    'private-class',
    'service',
    'Private Class',
    'Solo or small group sessions',
    'Solo or small group sessions',
    null,
    false,
    '₱1,500',
    '/session',
    '{}'::text[],
    '[
      {"label":"One-on-One","note":"Single session","price":"₱1,500","highlight":false},
      {"label":"Small Group","note":"Max of 5 persons","price":"₱4,000","highlight":false},
      {"label":"Add. Student","note":"Per extra person","price":"₱500","highlight":false}
    ]'::jsonb,
    array['Calisthenics','Circuit Training','Mat Pilates','Groundworks','Animal Flow','Yoga'],
    'Inquire Now',
    50,
    true
  ),
  (
    'sports-recovery',
    'service',
    'Sports Recovery',
    'Mobility & recovery treatments',
    'Mobility & recovery treatments',
    null,
    false,
    '₱850',
    '/treatment',
    '{}'::text[],
    '[
      {"label":"Acupressure / Pressure Cupping","note":"","price":"₱850","highlight":false,"plain":true},
      {"label":"Spinal Manipulation & Blading","note":"","price":"₱750","highlight":false,"plain":true},
      {"label":"Dry Needling","note":"","price":"₱1,100","highlight":false,"plain":true},
      {"label":"All-in-One Therapy","note":"","price":"₱2,500","highlight":true,"plain":true}
    ]'::jsonb,
    '{}'::text[],
    'Inquire Now',
    60,
    true
  )
on conflict (slug) do nothing;
