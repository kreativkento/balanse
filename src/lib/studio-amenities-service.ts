import { supabase } from './supabase';
import {
  ALL_STUDIO_AMENITY_LABELS,
  isStudioAmenityLabel,
  normalizePublicAmenitySelection,
} from '../app/data/studio-amenities';

const CONFIG_ID = 1;

export async function fetchStudioAmenitiesSelectionRaw(): Promise<{
  labels: string[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('studio_amenities_config')
    .select('selected_labels')
    .eq('id', CONFIG_ID)
    .maybeSingle();

  if (error) {
    console.error('Failed to load studio amenities config:', error.message);
    return { labels: [], error: error.message };
  }

  const raw = data?.selected_labels ?? [];
  const labels = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string' && isStudioAmenityLabel(item))
    : [];

  return { labels, error: null };
}

export async function fetchPublicStudioAmenitiesLabels(): Promise<string[]> {
  const { labels } = await fetchStudioAmenitiesSelectionRaw();
  return normalizePublicAmenitySelection(labels);
}

export async function fetchAdminStudioAmenitiesSelection(): Promise<{
  labels: string[];
  error: string | null;
}> {
  return fetchStudioAmenitiesSelectionRaw();
}

export async function saveStudioAmenitiesSelection(
  selectedLabels: string[],
): Promise<{ ok: boolean; error: string | null }> {
  const labels = selectedLabels.filter(isStudioAmenityLabel);
  const unique = [...new Set(labels)];

  if (unique.length === 0) {
    return { ok: false, error: 'Select at least one amenity to display on the studio page.' };
  }

  const invalid = selectedLabels.filter((label) => !isStudioAmenityLabel(label));
  if (invalid.length > 0) {
    return { ok: false, error: 'One or more amenities are invalid.' };
  }

  const { error } = await supabase.from('studio_amenities_config').upsert(
    {
      id: CONFIG_ID,
      selected_labels: unique,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('Failed to save studio amenities config:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export function allStudioAmenityLabelsForAdminDefault(): string[] {
  return [...ALL_STUDIO_AMENITY_LABELS];
}
