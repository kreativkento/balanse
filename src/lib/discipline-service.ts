import { supabase } from './supabase';
import type { DisciplineRow, StatusDisciplineRow } from './database.types';
import {
  getDisciplineFallback,
  getDisciplinePlaceholderImage,
  getDisciplinePlaceholderLogo,
} from '../app/data/disciplines';

export interface DisciplineStatusDisplay {
  id: string;
  name: string;
  slug: string;
  hue: number;
}

export interface DisciplineDisplay {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  imageUrl: string;
  sortOrder: number;
  status: DisciplineStatusDisplay;
  /** @deprecated Use status.slug === 'active' */
  isActive: boolean;
  updatedAt: string;
}

type DisciplineRowWithStatus = DisciplineRow & {
  status_discipline: StatusDisciplineRow | StatusDisciplineRow[] | null;
};

const FALLBACK_ACTIVE_STATUS: DisciplineStatusDisplay = {
  id: '',
  name: 'Active',
  slug: 'active',
  hue: 142,
};

const FALLBACK_INACTIVE_STATUS: DisciplineStatusDisplay = {
  id: '',
  name: 'Inactive',
  slug: 'inactive',
  hue: 4,
};

export function statusColorFromHue(hue: number, saturation = 68, lightness = 50): string {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function resolveStatus(row: DisciplineRowWithStatus): DisciplineStatusDisplay {
  const joined = Array.isArray(row.status_discipline)
    ? row.status_discipline[0]
    : row.status_discipline;

  if (joined) {
    return {
      id: joined.id,
      name: joined.name,
      slug: joined.slug,
      hue: joined.hue,
    };
  }

  return row.is_active ? FALLBACK_ACTIVE_STATUS : FALLBACK_INACTIVE_STATUS;
}

function toDisplay(row: DisciplineRowWithStatus): DisciplineDisplay {
  const fallback = getDisciplineFallback(row.slug, row.name);
  const name = row.name.trim() || fallback?.name || row.name;
  const description = row.description.trim() || fallback?.description || '';
  const status = resolveStatus(row);

  return {
    id: row.id,
    name,
    slug: row.slug,
    description,
    logoUrl: row.logo_url.trim() || getDisciplinePlaceholderLogo(name),
    imageUrl: row.image_url.trim() || getDisciplinePlaceholderImage(name),
    sortOrder: row.sort_order,
    status,
    isActive: status.slug === 'active',
    updatedAt: row.updated_at,
  };
}

const DISCIPLINE_SELECT = `
  *,
  status_discipline (
    id,
    name,
    slug,
    hue
  )
`;

export async function fetchDisciplineStatuses(): Promise<{
  data: DisciplineStatusDisplay[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('status_discipline')
    .select('id, name, slug, hue')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch discipline statuses:', error.message);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function fetchDisciplinesForAdmin(): Promise<{
  data: DisciplineDisplay[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('disciplines')
    .select(DISCIPLINE_SELECT)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch disciplines:', error.message);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []).map((row) => toDisplay(row as DisciplineRowWithStatus)), error: null };
}

async function getActiveStatusId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('status_discipline')
    .select('id')
    .eq('slug', 'active')
    .maybeSingle();

  if (error || !data) {
    console.error('Failed to resolve active discipline status:', error?.message);
    return null;
  }

  return data.id;
}

export async function updateDiscipline(
  id: string,
  updates: {
    name: string;
    description: string;
    logoUrl?: string;
    imageUrl?: string;
  },
): Promise<{ success: boolean; error: string | null }> {
  const name = updates.name.trim();
  if (!name) {
    return { success: false, error: 'Discipline name is required.' };
  }

  const payload: {
    name: string;
    description: string;
    logo_url?: string;
    image_url?: string;
  } = {
    name,
    description: updates.description.trim(),
  };

  if (updates.logoUrl !== undefined) {
    payload.logo_url = updates.logoUrl;
  }
  if (updates.imageUrl !== undefined) {
    payload.image_url = updates.imageUrl;
  }

  const { error } = await supabase.from('disciplines').update(payload).eq('id', id);

  if (error) {
    console.error('Failed to update discipline:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function deleteDiscipline(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from('disciplines').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete discipline:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export function slugifyDisciplineName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createEmptyDisciplineDraft(
  defaultStatus: DisciplineStatusDisplay = FALLBACK_ACTIVE_STATUS,
): DisciplineDisplay {
  const label = 'New Discipline';
  return {
    id: '',
    name: '',
    slug: 'new-discipline',
    description: '',
    logoUrl: getDisciplinePlaceholderLogo('ND'),
    imageUrl: getDisciplinePlaceholderImage(label),
    sortOrder: 0,
    status: defaultStatus,
    isActive: defaultStatus.slug === 'active',
    updatedAt: '',
  };
}

export async function createDiscipline(
  input: { name: string; description: string; logoUrl?: string; imageUrl?: string },
  sortOrder = 999,
): Promise<{ success: boolean; data: DisciplineDisplay | null; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { success: false, data: null, error: 'Discipline name is required.' };
  }

  const slug = slugifyDisciplineName(name);
  if (!slug) {
    return { success: false, data: null, error: 'Could not generate a valid slug from the name.' };
  }

  const statusId = await getActiveStatusId();
  if (!statusId) {
    return { success: false, data: null, error: 'Active discipline status is not configured.' };
  }

  const { data, error } = await supabase
    .from('disciplines')
    .insert({
      name,
      slug,
      description: input.description.trim(),
      logo_url: input.logoUrl?.trim() ?? '',
      image_url: input.imageUrl?.trim() ?? '',
      sort_order: sortOrder,
      status_id: statusId,
    })
    .select(DISCIPLINE_SELECT)
    .single();

  if (error) {
    console.error('Failed to create discipline:', error.message);
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data: toDisplay(data as DisciplineRowWithStatus), error: null };
}

export function isDisciplineActive(discipline: DisciplineDisplay): boolean {
  return discipline.status.slug === 'active';
}
