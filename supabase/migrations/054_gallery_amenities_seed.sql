-- Gallery amenities column, RLS helper, and Studio page seed posts.
-- Requires 053_gallery_amenities_enum.sql committed first.
-- Seed uses external image URLs in storage_path (see galleryMediaPublicUrl in app).
-- Safe to re-run.

alter table public.gallery_posts
  add column if not exists featured_in_amenities boolean not null default false;

comment on column public.gallery_posts.featured_in_amenities is
  'When true and tag is Amenities, post appears in the studio page amenities hero carousel.';

create index if not exists gallery_posts_featured_amenities_idx
  on public.gallery_posts (featured_in_amenities)
  where featured_in_amenities;

create or replace function public.tg_gallery_posts_enforce_amenities()
returns trigger
language plpgsql
as $$
begin
  if new.featured_in_amenities and new.tag is distinct from 'Amenities'::public.gallery_tag then
    new.featured_in_amenities := false;
  end if;
  return new;
end;
$$;

drop trigger if exists gallery_posts_enforce_amenities on public.gallery_posts;
create trigger gallery_posts_enforce_amenities
  before insert or update on public.gallery_posts
  for each row
  execute function public.tg_gallery_posts_enforce_amenities();

create or replace function public.gallery_post_is_public(p_post public.gallery_posts)
returns boolean
language sql
stable
as $$
  select
    p_post.featured_in_gallery
    or (
      p_post.featured_in_home_studio
      and p_post.tag = 'Studio'::public.gallery_tag
    )
    or (
      p_post.featured_in_amenities
      and p_post.tag = 'Amenities'::public.gallery_tag
    );
$$;

insert into public.gallery_posts (
  id,
  caption,
  tag,
  featured_in_gallery,
  featured_in_home_studio,
  featured_in_amenities,
  masonry_tall,
  created_at,
  updated_at
)
values
  ('aaaaaaaa-0001-4000-8000-000000000001', 'Yoga studio main space', 'Studio', true, false, false, true,
    '2026-04-01 08:00:00+08', '2026-04-01 08:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000002', 'Yoga meditation session', 'Classes', true, false, false, false,
    '2026-04-01 09:00:00+08', '2026-04-01 09:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000003', 'Mat Pilates class', 'Classes', true, false, false, false,
    '2026-04-01 10:00:00+08', '2026-04-01 10:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000004', 'Wellness serene space', 'Studio', true, false, false, true,
    '2026-04-01 11:00:00+08', '2026-04-01 11:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000005', 'Kickboxing training', 'Classes', true, false, false, false,
    '2026-04-01 12:00:00+08', '2026-04-01 12:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000006', 'Capoeira session', 'Events', true, false, false, false,
    '2026-04-01 13:00:00+08', '2026-04-01 13:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000007', 'Animal Flow movement', 'Community', true, false, false, true,
    '2026-04-01 14:00:00+08', '2026-04-01 14:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000008', 'Circuit Training class', 'Classes', true, false, false, false,
    '2026-04-01 15:00:00+08', '2026-04-01 15:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000009', 'Meditation calm space', 'Studio', true, false, false, false,
    '2026-04-01 16:00:00+08', '2026-04-01 16:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000010', 'Capoeira art in motion', 'Events', true, false, false, true,
    '2026-04-01 17:00:00+08', '2026-04-01 17:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000011', 'Personal coaching session', 'Classes', true, false, false, false,
    '2026-04-01 18:00:00+08', '2026-04-01 18:00:00+08'),
  ('aaaaaaaa-0001-4000-8000-000000000012', 'Groundworks floor movement', 'Classes', true, false, false, false,
    '2026-04-01 19:00:00+08', '2026-04-01 19:00:00+08'),
  ('bbbbbbbb-0001-4000-8000-000000000001', 'Morning light in the main studio', 'Amenities', false, false, true, false,
    '2026-03-01 08:00:00+08', '2026-03-01 08:00:00+08'),
  ('bbbbbbbb-0001-4000-8000-000000000002', 'Reception lounge', 'Amenities', false, false, true, false,
    '2026-03-01 09:00:00+08', '2026-03-01 09:00:00+08'),
  ('bbbbbbbb-0001-4000-8000-000000000003', 'Quiet mindfulness corner', 'Amenities', false, false, true, false,
    '2026-03-01 10:00:00+08', '2026-03-01 10:00:00+08'),
  ('bbbbbbbb-0001-4000-8000-000000000004', 'Yoga session in studio', 'Amenities', false, false, true, false,
    '2026-03-01 11:00:00+08', '2026-03-01 11:00:00+08')
on conflict (id) do nothing;

insert into public.gallery_post_media (id, post_id, sort_order, storage_path, media_kind)
values
  ('cccccccc-0001-4000-8000-000000000001', 'aaaaaaaa-0001-4000-8000-000000000001', 0,
    'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000002', 'aaaaaaaa-0001-4000-8000-000000000002', 0,
    'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000003', 'aaaaaaaa-0001-4000-8000-000000000003', 0,
    'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000004', 'aaaaaaaa-0001-4000-8000-000000000004', 0,
    'https://images.unsplash.com/photo-1699378281595-0d75e9e6a05a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000005', 'aaaaaaaa-0001-4000-8000-000000000005', 0,
    'https://images.unsplash.com/photo-1686133368810-24f662f65cad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000006', 'aaaaaaaa-0001-4000-8000-000000000006', 0,
    'https://images.unsplash.com/photo-1759352856072-985a4ddab82d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000007', 'aaaaaaaa-0001-4000-8000-000000000007', 0,
    'https://images.unsplash.com/photo-1717500252780-036bfd89f810?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000008', 'aaaaaaaa-0001-4000-8000-000000000008', 0,
    'https://images.unsplash.com/photo-1602827114685-efbb2717da9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000009', 'aaaaaaaa-0001-4000-8000-000000000009', 0,
    'https://images.unsplash.com/photo-1761971975724-31001b4de0bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000010', 'aaaaaaaa-0001-4000-8000-000000000010', 0,
    'https://images.unsplash.com/photo-1583166614297-a97b68d5cead?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000011', 'aaaaaaaa-0001-4000-8000-000000000011', 0,
    'https://images.unsplash.com/photo-1758875569414-120ebc62ada3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('cccccccc-0001-4000-8000-000000000012', 'aaaaaaaa-0001-4000-8000-000000000012', 0,
    'https://images.unsplash.com/photo-1701824429245-ce783f1dc026?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800', 'image'),
  ('dddddddd-0001-4000-8000-000000000001', 'bbbbbbbb-0001-4000-8000-000000000001', 0,
    'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'image'),
  ('dddddddd-0001-4000-8000-000000000002', 'bbbbbbbb-0001-4000-8000-000000000002', 0,
    'https://images.unsplash.com/photo-1699378281595-0d75e9e6a05a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'image'),
  ('dddddddd-0001-4000-8000-000000000003', 'bbbbbbbb-0001-4000-8000-000000000003', 0,
    'https://images.unsplash.com/photo-1761971975724-31001b4de0bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'image'),
  ('dddddddd-0001-4000-8000-000000000004', 'bbbbbbbb-0001-4000-8000-000000000004', 0,
    'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 'image')
on conflict (id) do nothing;
