import { supabase } from './supabase';
import { fetchGalleryPostsForGlobalSearch } from './gallery-global-search';
import { STUDIO_AMENITY_GROUPS } from '../app/data/studio-amenities';
import {
  getMarketingPortalNavItems,
  searchMarketingPortalNav,
  type MarketingPortalNavItem,
} from '../app/lib/marketing-portal-nav-search';

export interface MarketingGlobalSearchResult {
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

function marketingListPath(base: string, query: string): string {
  const q = query.trim();
  if (!q) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}q=${encodeURIComponent(q)}`;
}

function navToResult(item: MarketingPortalNavItem, query: string): MarketingGlobalSearchResult {
  return {
    id: `nav:${item.path}`,
    path: marketingListPath(item.path, query),
    label: item.label,
    group: item.group,
    subtitle: 'Go to page',
  };
}

function pushResult(bucket: MarketingGlobalSearchResult[], row: MarketingGlobalSearchResult) {
  if (bucket.length >= PER_CATEGORY) return;
  if (bucket.some((item) => item.id === row.id)) return;
  bucket.push(row);
}

async function searchGallery(pattern: string, rawQuery: string): Promise<MarketingGlobalSearchResult[]> {
  const rows = await fetchGalleryPostsForGlobalSearch(pattern, PER_CATEGORY);

  return rows.map((row) => ({
    id: `gallery:${row.id}`,
    path: marketingListPath('/marketing-gallery', rawQuery),
    label: row.caption.trim().slice(0, 80) || 'Gallery post',
    group: 'Gallery',
    subtitle: row.tag ?? undefined,
  }));
}

async function searchBulletin(pattern: string, rawQuery: string): Promise<MarketingGlobalSearchResult[]> {
  const { data } = await supabase
    .from('bulletin_posts')
    .select('id, title, category')
    .or(`title.ilike.${pattern},body.ilike.${pattern}`)
    .order('posted_at', { ascending: false })
    .limit(PER_CATEGORY);

  return (data ?? []).map((row) => ({
    id: `bulletin:${row.id}`,
    path: marketingListPath('/marketing-dashboard', rawQuery),
    label: row.title,
    group: 'Bulletin',
    subtitle: row.category,
  }));
}

function searchAmenities(query: string): MarketingGlobalSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: MarketingGlobalSearchResult[] = [];
  for (const group of STUDIO_AMENITY_GROUPS) {
    for (const item of group.items) {
      if (!item.label.toLowerCase().includes(q) && !group.title.toLowerCase().includes(q)) continue;
      pushResult(out, {
        id: `amenity:${item.label}`,
        path: marketingListPath('/marketing-amenities', query),
        label: item.label,
        group: 'Amenities',
        subtitle: group.title,
      });
    }
  }
  return out;
}

/**
 * Marketing header search — portal shortcuts plus gallery, bulletin, and amenities data.
 */
export async function searchMarketingGlobal(
  query: string,
  signal?: AbortSignal,
): Promise<MarketingGlobalSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return searchMarketingPortalNav(trimmed).map((item) => navToResult(item, trimmed));
  }

  if (signal?.aborted) return [];

  const pattern = ilikePattern(trimmed);
  const nav = searchMarketingPortalNav(trimmed, getMarketingPortalNavItems()).map((item) =>
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
  const deduped: MarketingGlobalSearchResult[] = [];
  for (const row of merged) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push(row);
    if (deduped.length >= MAX_RESULTS) break;
  }

  return deduped;
}
