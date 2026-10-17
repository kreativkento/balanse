import { supabase } from './supabase';
import { loadProfileImageUrlsForUser } from './storage-service';
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
  colorHex: string;
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
    colorHex: (row.color_hex ?? '').trim(),
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
    colorHex?: string;
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
    color_hex?: string;
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
  if (updates.colorHex !== undefined) {
    payload.color_hex = updates.colorHex.trim();
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
    colorHex: '',
    sortOrder: 0,
    status: defaultStatus,
    isActive: defaultStatus.slug === 'active',
    updatedAt: '',
  };
}

export async function createDiscipline(
  input: { name: string; description: string; logoUrl?: string; imageUrl?: string; colorHex?: string },
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
      color_hex: input.colorHex?.trim() ?? '',
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
  photo: string;
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
    supabase.from('accounts').select('id, email, role, auth_user_id').in('id', ids).eq('role', 'coach'),
    supabase.from('profiles_staff').select('account_id, name, display_name, photo').in('account_id', ids),
  ]);

  const profileByAccount = new Map<
    string,
    { name: string; displayName: string; photo: string }
  >();
  for (const profile of staffProfiles ?? []) {
    profileByAccount.set(profile.account_id, {
      name: profile.name?.trim() ?? '',
      displayName: profile.display_name?.trim() ?? '',
      photo: profile.photo?.trim() ?? '',
    });
  }

  const coaches = await Promise.all(
    (accounts ?? []).map(async (account) => {
      const profile = profileByAccount.get(account.id);
      const name =
        profile?.name
        || profile?.displayName
        || account.email;
      let photo = profile?.photo ?? '';
      if (!photo && account.auth_user_id) {
        const bucket = await loadProfileImageUrlsForUser(account.auth_user_id);
        photo = bucket.photo?.trim() ?? '';
      }
      return {
        accountId: account.id,
        name,
        photo,
      };
    }),
  );

  coaches.sort((a, b) => a.name.localeCompare(b.name));

  return { data: coaches, error: null };
}

function normalizeLegacyClassLabel(value: string): string {
  return value.trim().toLowerCase();
}

/** Map legacy `profiles_staff.classes` labels to discipline ids (name/slug, case-insensitive). */
export function resolveDisciplineIdsFromLegacyClassNames(
  classNames: string[],
  catalog: Pick<DisciplineDisplay, 'id' | 'name' | 'slug'>[],
): string[] {
  const ids = new Set<string>();
  for (const raw of classNames) {
    const normalized = normalizeLegacyClassLabel(raw);
    if (!normalized) continue;
    const slugLike = normalized.replace(/\s+/g, '-');
    const match = catalog.find((d) => {
      const name = normalizeLegacyClassLabel(d.name);
      const slug = normalizeLegacyClassLabel(d.slug);
      return name === normalized || slug === normalized || slug === slugLike;
    });
    if (match) ids.add(match.id);
  }
  return [...ids];
}

async function fetchStaffProfileLegacyClasses(
  accountId: string,
): Promise<{ data: string[]; error: string | null }> {
  if (!accountId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('profiles_staff')
    .select('classes')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch staff profile classes:', error.message);
    return { data: [], error: error.message };
  }

  return { data: data?.classes ?? [], error: null };
}

/**
 * Discipline ids a coach may teach: `coach_disciplines` plus legacy profile class names.
 */
export async function fetchCoachTeachableDisciplineIds(
  accountId: string,
  catalog: Pick<DisciplineDisplay, 'id' | 'name' | 'slug'>[],
): Promise<{ data: string[]; error: string | null }> {
  const [tagged, profileClasses] = await Promise.all([
    fetchCoachDisciplineIds(accountId),
    fetchStaffProfileLegacyClasses(accountId),
  ]);

  if (tagged.error) return { data: [], error: tagged.error };

  const merged = new Set(tagged.data);
  for (const id of resolveDisciplineIdsFromLegacyClassNames(profileClasses.data, catalog)) {
    merged.add(id);
  }

  return { data: [...merged], error: profileClasses.error };
}

/** Keep `coach_disciplines` and `profiles_staff.classes` in sync from legacy class name labels. */
export async function syncCoachDisciplinesFromProfileClasses(
  accountId: string,
  classNames: string[],
): Promise<{
  ok: boolean;
  error?: string;
  disciplineIds?: string[];
  classNames?: string[];
}> {
  const { data: catalog, error: catalogError } = await fetchDisciplinesForPublic();
  if (catalogError) return { ok: false, error: catalogError };

  const ids = resolveDisciplineIdsFromLegacyClassNames(classNames, catalog);
  const result = await saveCoachDisciplineTagsForProfile(accountId, ids, catalog);
  return {
    ok: result.ok,
    error: result.error,
    disciplineIds: result.disciplineIds,
    classNames: result.classNames,
  };
}

/**
 * Disciplines assigned to a coach via `coach_disciplines` (by account id).
 * Used for slot requests and other flows that must not infer tags from legacy profile text.
 */
export async function fetchCoachAssignedDisciplines(
  accountId: string,
  options?: { activeOnly?: boolean },
): Promise<{ data: DisciplineDisplay[]; error: string | null }> {
  if (!accountId) return { data: [], error: null };

  const activeOnly = options?.activeOnly !== false;

  const { data: links, error: linkError } = await supabase
    .from('coach_disciplines')
    .select('discipline_id')
    .eq('account_id', accountId);

  if (linkError) {
    console.error('Failed to fetch coach_disciplines:', linkError.message);
    return { data: [], error: linkError.message };
  }

  const ids = (links ?? []).map((row) => row.discipline_id);
  if (ids.length === 0) return { data: [], error: null };

  const { data: rows, error } = await supabase
    .from('disciplines')
    .select('*')
    .in('id', ids)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to fetch assigned discipline rows:', error.message);
    return { data: [], error: error.message };
  }

  let data = (rows ?? []).map((row) => toDisplay(row as DisciplineRow));
  if (activeOnly) {
    data = data.filter((item) => item.status.slug === 'active');
  }

  data.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return { data, error: null };
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

function classNamesForDisciplineIds(
  disciplineIds: string[],
  catalog: Pick<DisciplineDisplay, 'id' | 'name'>[],
): string[] {
  return disciplineIds
    .map((id) => catalog.find((d) => d.id === id)?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Load coach discipline tags + mirrored `profiles_staff.classes` (coaches use profiles_staff, not profiles_client).
 */
export async function loadCoachDisciplineProfileSync(
  accountId: string,
  catalog: Pick<DisciplineDisplay, 'id' | 'name' | 'slug'>[],
): Promise<{
  data: { disciplineIds: string[]; classNames: string[] };
  error: string | null;
}> {
  const [tagged, profileClasses] = await Promise.all([
    fetchCoachDisciplineIds(accountId),
    fetchStaffProfileLegacyClasses(accountId),
  ]);

  if (tagged.error) {
    return { data: { disciplineIds: [], classNames: [] }, error: tagged.error };
  }

  const mergedIds = new Set(tagged.data);
  for (const id of resolveDisciplineIdsFromLegacyClassNames(profileClasses.data, catalog)) {
    mergedIds.add(id);
  }

  const disciplineIds = [...mergedIds];
  const classNames = classNamesForDisciplineIds(disciplineIds, catalog);

  return { data: { disciplineIds, classNames }, error: profileClasses.error };
}

/**
 * Persist coach discipline tags and mirror discipline names on `profiles_staff.classes`.
 */
export async function saveCoachDisciplineTagsForProfile(
  accountId: string,
  disciplineIds: string[],
  catalog: Pick<DisciplineDisplay, 'id' | 'name'>[],
): Promise<{
  ok: boolean;
  error?: string;
  classNames: string[];
  disciplineIds: string[];
}> {
  const uniqueIds = [...new Set(disciplineIds.filter(Boolean))];
  const classNames = classNamesForDisciplineIds(uniqueIds, catalog);

  const tagResult = await setCoachDisciplines(accountId, uniqueIds);
  if (!tagResult.ok) {
    return { ok: false, error: tagResult.error, classNames: [], disciplineIds: [] };
  }

  const { error } = await supabase
    .from('profiles_staff')
    .update({ classes: classNames })
    .eq('account_id', accountId);

  if (error) {
    console.error('Failed to sync profiles_staff.classes from disciplines:', error.message);
    return { ok: false, error: error.message, classNames, disciplineIds: uniqueIds };
  }

  const verified = await fetchCoachDisciplineIds(accountId);
  if (verified.error) {
    return {
      ok: true,
      classNames,
      disciplineIds: uniqueIds,
      error: verified.error,
    };
  }

  return {
    ok: true,
    classNames,
    disciplineIds: verified.data.length > 0 ? verified.data : uniqueIds,
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
