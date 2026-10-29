import { supabase } from './supabase';

export type PricingOfferingKind = 'featured_pass' | 'membership' | 'service';

export interface PricingOfferingTier {
  label: string;
  note?: string;
  price: string;
  highlight?: boolean;
  plain?: boolean;
}

export interface PricingOfferingRecord {
  id: string;
  slug: string;
  kind: PricingOfferingKind;
  title: string;
  tagline: string;
  description: string;
  badge: string | null;
  highlight: boolean;
  heroPriceLabel: string;
  heroPriceUnit: string;
  inclusions: string[];
  tiers: PricingOfferingTier[];
  chips: string[];
  ctaLabel: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PricingOfferingInput = {
  id?: string;
  slug: string;
  kind: PricingOfferingKind;
  title: string;
  tagline: string;
  description: string;
  badge: string | null;
  highlight: boolean;
  heroPriceLabel: string;
  heroPriceUnit: string;
  inclusions: string[];
  tiers: PricingOfferingTier[];
  chips: string[];
  ctaLabel: string;
  sortOrder: number;
  isActive: boolean;
};

type PricingOfferingRow = {
  id: string;
  slug: string;
  kind: PricingOfferingKind;
  title: string;
  tagline: string;
  description: string;
  badge: string | null;
  highlight: boolean;
  hero_price_label: string;
  hero_price_unit: string;
  inclusions: string[] | null;
  tiers: unknown;
  chips: string[] | null;
  cta_label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const OFFERING_SELECT = `
  id,
  slug,
  kind,
  title,
  tagline,
  description,
  badge,
  highlight,
  hero_price_label,
  hero_price_unit,
  inclusions,
  tiers,
  chips,
  cta_label,
  sort_order,
  is_active,
  created_at,
  updated_at
`;

export const PRICING_OFFERING_KINDS: { value: PricingOfferingKind; label: string }[] = [
  { value: 'featured_pass', label: 'Featured pass (hero)' },
  { value: 'membership', label: 'Membership' },
  { value: 'service', label: 'Service' },
];

export function normalizePricingSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function suggestPricingSlug(title: string): string {
  return normalizePricingSlug(title);
}

export function isValidPricingSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 64;
}

function parseTiers(value: unknown): PricingOfferingTier[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const rec = row as Record<string, unknown>;
      const label = typeof rec.label === 'string' ? rec.label.trim() : '';
      const price = typeof rec.price === 'string' ? rec.price.trim() : '';
      if (!label || !price) return null;
      return {
        label,
        note: typeof rec.note === 'string' ? rec.note : '',
        price,
        highlight: Boolean(rec.highlight),
        plain: Boolean(rec.plain),
      };
    })
    .filter((row): row is PricingOfferingTier => row != null);
}

function mapRow(row: PricingOfferingRow): PricingOfferingRecord {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    badge: row.badge,
    highlight: row.highlight,
    heroPriceLabel: row.hero_price_label ?? '',
    heroPriceUnit: row.hero_price_unit ?? '',
    inclusions: row.inclusions ?? [],
    tiers: parseTiers(row.tiers),
    chips: row.chips ?? [],
    ctaLabel: row.cta_label || 'Book Now',
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchPublicPricingOfferings(): Promise<{
  data: PricingOfferingRecord[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('pricing_offerings')
    .select(OFFERING_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []).map((row) => mapRow(row as PricingOfferingRow)), error: null };
}

export async function fetchPricingOfferingsForAdmin(): Promise<{
  data: PricingOfferingRecord[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('pricing_offerings')
    .select(OFFERING_SELECT)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data ?? []).map((row) => mapRow(row as PricingOfferingRow)), error: null };
}

export async function upsertPricingOffering(
  input: PricingOfferingInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const slug = normalizePricingSlug(input.slug);
  if (!isValidPricingSlug(slug)) {
    return { ok: false, error: 'Enter a slug (2–64 chars, lowercase letters, numbers, hyphens).' };
  }
  if (!input.title.trim()) {
    return { ok: false, error: 'Title is required.' };
  }

  const payload = {
    slug,
    kind: input.kind,
    title: input.title.trim(),
    tagline: input.tagline.trim(),
    description: input.description.trim() || input.tagline.trim(),
    badge: input.badge?.trim() || null,
    highlight: input.highlight,
    hero_price_label: input.heroPriceLabel.trim(),
    hero_price_unit: input.heroPriceUnit.trim(),
    inclusions: input.inclusions.map((item) => item.trim()).filter(Boolean),
    tiers: input.tiers,
    chips: input.chips.map((item) => item.trim()).filter(Boolean),
    cta_label: input.ctaLabel.trim() || 'Book Now',
    sort_order: input.sortOrder,
    is_active: input.isActive,
  };

  const query = input.id
    ? supabase.from('pricing_offerings').update(payload).eq('id', input.id).select('id').single()
    : supabase.from('pricing_offerings').insert(payload).select('id').single();

  const { data, error } = await query;
  if (error || !data) {
    const message = error?.message ?? 'Could not save offering.';
    if (message.toLowerCase().includes('pricing_offerings_slug_key')) {
      return { ok: false, error: 'That slug is already in use.' };
    }
    return { ok: false, error: message };
  }

  return { ok: true, id: data.id as string };
}

export async function deletePricingOffering(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('pricing_offerings').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}
