import { supabase } from './supabase';

export interface GalleryCaptionSearchRow {
  id: string;
  caption: string;
  tag: string | null;
}

function mapGallerySearchRows(
  data: { id: string; caption: string | null; tag: string | null }[] | null,
): GalleryCaptionSearchRow[] {
  return (data ?? []).map((row) => ({
    id: String(row.id),
    caption: typeof row.caption === 'string' ? row.caption : '',
    tag: row.tag != null ? String(row.tag) : null,
  }));
}

/** Match gallery posts by caption (and tag) for portal header search. */
export async function fetchGalleryPostsForGlobalSearch(
  pattern: string,
  limit: number,
): Promise<GalleryCaptionSearchRow[]> {
  const [captionResult, tagResult] = await Promise.all([
    supabase
      .from('gallery_posts')
      .select('id, caption, tag')
      .ilike('caption', pattern)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('gallery_posts')
      .select('id, caption, tag')
      .ilike('tag', pattern)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (captionResult.error) {
    console.error('Gallery caption search failed:', captionResult.error.message);
  }
  if (tagResult.error) {
    console.error('Gallery tag search failed:', tagResult.error.message);
  }

  const merged = new Map<string, GalleryCaptionSearchRow>();
  for (const row of [
    ...mapGallerySearchRows(captionResult.data),
    ...mapGallerySearchRows(tagResult.data),
  ]) {
    if (!merged.has(row.id)) merged.set(row.id, row);
    if (merged.size >= limit) break;
  }

  return [...merged.values()];
}
