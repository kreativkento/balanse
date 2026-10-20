import { supabase } from './supabase';
import { fetchGalleryPostsForGlobalSearch } from './gallery-global-search';
import { STUDIO_AMENITY_GROUPS } from '../app/data/studio-amenities';
import {
  getFrontdeskPortalNavItems,
  searchFrontdeskPortalNav,
  type FrontdeskPortalNavItem,
} from '../app/lib/frontdesk-portal-nav-search';

export interface FrontdeskGlobalSearchResult {
  id: string;
  path: string;
  label: string;
  group: string;
  subtitle?: string;
}

const PER_CATEGORY = 4;
const MAX_RESULTS = 24;

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

function ilikePattern(query: string): string {
  return `%${escapeIlike(query.trim())}%`;
}

function frontdeskListPath(base: string, query: string): string {
  const q = query.trim();
  if (!q) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}q=${encodeURIComponent(q)}`;
}

function navToResult(item: FrontdeskPortalNavItem, query: string): FrontdeskGlobalSearchResult {
  return {
    id: `nav:${item.path}`,
    path: frontdeskListPath(item.path, query),
    label: item.label,
    group: item.group,
    subtitle: 'Go to page',
  };
}

function pushResult(bucket: FrontdeskGlobalSearchResult[], row: FrontdeskGlobalSearchResult) {
  if (bucket.length >= PER_CATEGORY) return;
  if (bucket.some((item) => item.id === row.id)) return;
  bucket.push(row);
}

async function searchGallery(pattern: string, rawQuery: string): Promise<FrontdeskGlobalSearchResult[]> {
  const rows = await fetchGalleryPostsForGlobalSearch(pattern, PER_CATEGORY);

  return rows.map((row) => ({
    id: `gallery:${row.id}`,
    path: frontdeskListPath('/frontdesk-gallery', rawQuery),
    label: row.caption.trim().slice(0, 80) || 'Gallery post',
    group: 'Gallery',
    subtitle: row.tag ?? undefined,
  }));
}

async function searchBulletin(pattern: string, rawQuery: string): Promise<FrontdeskGlobalSearchResult[]> {
  const { data } = await supabase
    .from('bulletin_posts')
    .select('id, title, category')
    .or(`title.ilike.${pattern},body.ilike.${pattern}`)
    .order('posted_at', { ascending: false })
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => ({
    id: `bulletin:${row.id}`,
    path: frontdeskListPath('/frontdesk-bulletin', rawQuery),
    label: row.title,
    group: 'Bulletin',
    subtitle: row.category,
  }));
}

function searchAmenities(query: string): FrontdeskGlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: FrontdeskGlobalSearchResult[] = [];
  for (const group of STUDIO_AMENITY_GROUPS) {
    for (const item of group.items) {
      if (!item.label.toLowerCase().includes(q) && !group.title.toLowerCase().includes(q)) continue;
      pushResult(out, {
        id: `amenity:${item.label}`,
        path: frontdeskListPath('/frontdesk-amenities', query),
        label: item.label,
        group: 'Amenities',
        subtitle: group.title,
      });
    }
  }
  return out;
}

/** Front desk header search — portal shortcuts plus gallery captions, bulletin, and amenities. */
export async function searchFrontdeskGlobal(
  query: string,
  signal?: AbortSignal,
): Promise<FrontdeskGlobalSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return searchFrontdeskPortalNav(trimmed).map((item) => navToResult(item, trimmed));
  }

  if (signal?.aborted) return [];

  const pattern = ilikePattern(trimmed);
  const nav = searchFrontdeskPortalNav(trimmed, getFrontdeskPortalNavItems()).map((item) =>
    navToResult(item, trimmed),
  );

  const [gallery, bulletin, amenities] = await Promise.all([
    searchGallery(pattern, trimmed),
    searchBulletin(pattern, trimmed),
    Promise.resolve(searchAmenities(trimmed)),
  ]);

  if (signal?.aborted) return [];

  const merged = [...nav, ...gallery, ...bulletin, ...amenities];

  const seen = new Set<string>();
  const deduped: FrontdeskGlobalSearchResult[] = [];
  for (const row of merged) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push(row);
    if (deduped.length >= MAX_RESULTS) break;
  }

  return deduped;
}
