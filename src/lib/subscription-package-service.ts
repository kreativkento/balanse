import { supabase } from './supabase';

export interface SubscriptionPackageRecord {
  id: string;
  uid: string;
  name: string;
  description: string;
  creditsGranted: number;
  creditValidityDays: number;
  priceAmount: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type SubscriptionPackageRow = {
  id: string;
  uid: string;
  name: string;
  description: string;
  credits_granted: number;
  credit_validity_days: number;
  price_amount: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const PACKAGE_SELECT = `
  id,
  uid,
  name,
  description,
  credits_granted,
  credit_validity_days,
  price_amount,
  currency,
  is_active,
  sort_order,
  created_at,
  updated_at
`;

function mapRow(row: SubscriptionPackageRow): SubscriptionPackageRecord {
  return {
    id: row.id,
    uid: row.uid,
    name: row.name,
    description: row.description,
    creditsGranted: row.credits_granted,
    creditValidityDays: row.credit_validity_days,
    priceAmount: Number(row.price_amount),
    currency: row.currency,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Normalize admin-entered UID (uppercase, allowed chars only). */
export function normalizeSubscriptionPackageUid(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function suggestSubscriptionPackageUid(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return base || 'PACK';
}

export function isValidSubscriptionPackageUid(uid: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{1,47}$/.test(uid);
}

export async function fetchSubscriptionPackagesForAdmin(): Promise<{
  data: SubscriptionPackageRecord[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('subscription_packages')
    .select(PACKAGE_SELECT)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchSubscriptionPackagesForAdmin:', error.message);
    return { data: [], error: error.message };
  }

  return { data: (rows ?? []).map((row) => mapRow(row as SubscriptionPackageRow)), error: null };
}

export async function fetchActiveSubscriptionPackagesForMember(): Promise<{
  data: SubscriptionPackageRecord[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('subscription_packages')
    .select(PACKAGE_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('fetchActiveSubscriptionPackagesForMember:', error.message);
    return { data: [], error: error.message };
  }

  return { data: (rows ?? []).map((row) => mapRow(row as SubscriptionPackageRow)), error: null };
}

export type SubscriptionPackageUpsertInput = {
  id?: string;
  uid: string;
  name: string;
  description: string;
  creditsGranted: number;
  creditValidityDays: number;
  priceAmount: number;
  currency?: string;
  isActive: boolean;
  sortOrder: number;
};

export async function upsertSubscriptionPackageRecord(
  input: SubscriptionPackageUpsertInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const uid = normalizeSubscriptionPackageUid(input.uid);
  if (!isValidSubscriptionPackageUid(uid)) {
    return {
      ok: false,
      error: 'UID must be 2–48 characters: letters, numbers, hyphen, or underscore.',
    };
  }

  const payload = {
    uid,
    name: input.name.trim(),
    description: input.description.trim(),
    credits_granted: input.creditsGranted,
    credit_validity_days: input.creditValidityDays,
    price_amount: input.priceAmount,
    currency: (input.currency ?? 'PHP').trim() || 'PHP',
    is_active: input.isActive,
    sort_order: input.sortOrder,
  };

  if (!payload.name) {
    return { ok: false, error: 'Package name is required.' };
  }

  if (input.id) {
    const { error } = await supabase
      .from('subscription_packages')
      .update(payload)
      .eq('id', input.id);

    if (error) {
      console.error('upsertSubscriptionPackageRecord update:', error.message);
      if (error.code === '23505') {
        return { ok: false, error: 'That UID is already used by another package.' };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from('subscription_packages')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('upsertSubscriptionPackageRecord insert:', error.message);
    if (error.code === '23505') {
      return { ok: false, error: 'That UID is already used by another package.' };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id as string };
}

export async function deleteSubscriptionPackageRecord(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('subscription_packages').delete().eq('id', id);
  if (error) {
    console.error('deleteSubscriptionPackageRecord:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}
