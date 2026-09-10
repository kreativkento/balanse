import { supabase } from './supabase';
import type { CoachDisciplineTag, DisciplineRow } from './database.types';
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

export const ACTIVE_DISCIPLINE_STATUS: DisciplineStatusDisplay = {
  id: 'active',
  name: 'Active',
  slug: 'active',
  hue: 142,
};

export const INACTIVE_DISCIPLINE_STATUS: DisciplineStatusDisplay = {
  id: 'inactive',
  name: 'Inactive',
  slug: 'inactive',
  hue: 4,
};

export function statusColorFromHue(hue: number, saturation = 68, lightness = 50): string {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function resolveStatus(row: DisciplineRow): DisciplineStatusDisplay {
  const slug = row.status?.trim() || (row.is_active ? 'active' : 'inactive');
  const fallback = slug === 'inactive' ? INACTIVE_DISCIPLINE_STATUS : ACTIVE_DISCIPLINE_STATUS;

  return {
    id: slug,
    name: row.status_name?.trim() || fallback.name,
    slug,
    hue: Number.isFinite(row.status_hue) ? row.status_hue : fallback.hue,
  };
}

function toDisplay(row: DisciplineRow): DisciplineDisplay {
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

export async function fetchDisciplinesForAdmin(): Promise<{
  data: DisciplineDisplay[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('disciplines')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch disciplines:', error.message);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []).map((row) => toDisplay(row as DisciplineRow)), error: null };
}

/** Active disciplines only — for the public website (RLS also enforces active). */
export async function fetchDisciplinesForPublic(): Promise<{
  data: DisciplineDisplay[];
  error: string | null;
}> {
  const result = await fetchDisciplinesForAdmin();
  if (result.error) return result;

  return {
    data: result.data.filter((item) => item.status.slug === 'active'),
    error: null,
  };
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
  defaultStatus: DisciplineStatusDisplay = ACTIVE_DISCIPLINE_STATUS,
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

  const { data, error } = await supabase
    .from('disciplines')
    .insert({
      name,
      slug,
      description: input.description.trim(),
      logo_url: input.logoUrl?.trim() ?? '',
      image_url: input.imageUrl?.trim() ?? '',
      sort_order: sortOrder,
      status: ACTIVE_DISCIPLINE_STATUS.slug,
      status_name: ACTIVE_DISCIPLINE_STATUS.name,
      status_hue: ACTIVE_DISCIPLINE_STATUS.hue,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create discipline:', error.message);
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data: toDisplay(data as DisciplineRow), error: null };
}

export function isDisciplineActive(discipline: DisciplineDisplay): boolean {
  return discipline.status.slug === 'active';
}

export interface DisciplineCoachDisplay {
  accountId: string;
  name: string;
}

/**
 * Coaches linked to a discipline via coach_disciplines tags and/or scheduled classes.
 */
export async function fetchCoachesForDiscipline(
  disciplineId: string,
  _disciplineName?: string,
): Promise<{ data: DisciplineCoachDisplay[]; error: string | null }> {
  if (!disciplineId) {
    return { data: [], error: null };
  }

  const coachIds = new Set<string>();

  const { data: taggedRows, error: taggedError } = await supabase
    .from('coach_disciplines')
    .select('account_id')
    .eq('discipline_id', disciplineId);

  if (taggedError) {
    console.error('Failed to fetch coach discipline tags:', taggedError.message);
    return { data: [], error: taggedError.message };
  }

  for (const row of taggedRows ?? []) {
    if (row.account_id) coachIds.add(row.account_id);
  }

  const { data: classRows, error: classesError } = await supabase
    .from('classes')
    .select('id')
    .eq('discipline_id', disciplineId);

  if (classesError) {
    console.error('Failed to fetch discipline classes:', classesError.message);
    return { data: [], error: classesError.message };
  }

  const classIds = (classRows ?? []).map((row) => row.id);
  if (classIds.length > 0) {
    const { data: coachRows, error: coachError } = await supabase
      .from('class_coaches')
      .select('account_id')
      .in('class_id', classIds);

    if (coachError) {
      console.error('Failed to fetch class coaches:', coachError.message);
      return { data: [], error: coachError.message };
    }

    for (const row of coachRows ?? []) {
      if (row.account_id) coachIds.add(row.account_id);
    }
  }

  if (coachIds.size === 0) {
    return { data: [], error: null };
  }

  const ids = [...coachIds];
  const [{ data: accounts }, { data: staffProfiles }] = await Promise.all([
    supabase.from('accounts').select('id, email, role').in('id', ids).eq('role', 'coach'),
    supabase.from('profiles_staff').select('account_id, name, display_name').in('account_id', ids),
  ]);

  const nameByAccount = new Map<string, string>();
  for (const profile of staffProfiles ?? []) {
    const label = profile.name?.trim() || profile.display_name?.trim();
    if (label) nameByAccount.set(profile.account_id, label);
  }

  const coaches = (accounts ?? [])
    .map((account) => ({
      accountId: account.id,
      name: nameByAccount.get(account.id) || account.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { data: coaches, error: null };
}

/** Discipline ids tagged on a coach profile. */
export async function fetchCoachDisciplineIds(
  accountId: string,
): Promise<{ data: string[]; error: string | null }> {
  if (!accountId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('coach_disciplines')
    .select('discipline_id')
    .eq('account_id', accountId);

  if (error) {
    console.error('Failed to fetch coach discipline ids:', error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (data ?? []).map((row) => row.discipline_id),
    error: null,
  };
}

/** Resolved discipline tags for a coach (id + name + slug). */
export async function fetchCoachDisciplineTags(
  accountId: string,
): Promise<{ data: CoachDisciplineTag[]; error: string | null }> {
  const { data: ids, error: idsError } = await fetchCoachDisciplineIds(accountId);
  if (idsError) return { data: [], error: idsError };
  if (ids.length === 0) return { data: [], error: null };

  const { data: rows, error } = await supabase
    .from('disciplines')
    .select('id, name, slug')
    .in('id', ids)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to resolve coach discipline tags:', error.message);
    return { data: [], error: error.message };
  }

  return {
    data: (rows ?? []).map((row) => ({
      disciplineId: row.id,
      name: row.name,
      slug: row.slug,
    })),
    error: null,
  };
}

/** Replace all discipline tags for a coach account. */
export async function setCoachDisciplines(
  accountId: string,
  disciplineIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const uniqueIds = [...new Set(disciplineIds.filter(Boolean))];

  const { error } = await supabase.rpc('set_coach_disciplines', {
    p_account_id: accountId,
    p_discipline_ids: uniqueIds,
  });

  if (error) {
    console.error('Failed to set coach disciplines:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
