import { supabase } from './supabase';
import type { PaymentChannel } from '../app/data/paymentChannels';

export const PAYMENT_CHANNEL_QR_BUCKET = 'payment_channel_qr';

export interface PaymentChannelRecord {
  id: string;
  slug: string;
  label: string;
  subtitle: string;
  accentColor: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  qrStoragePath: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type PaymentChannelRow = {
  id: string;
  slug: string;
  label: string;
  subtitle: string;
  accent_color: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  qr_storage_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function publicQrUrl(storagePath: string | null): string | null {
  if (!storagePath?.trim()) return null;
  const { data } = supabase.storage.from(PAYMENT_CHANNEL_QR_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl || null;
}

function mapRow(row: PaymentChannelRow): PaymentChannelRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    subtitle: row.subtitle,
    accentColor: row.accent_color,
    accountName: row.account_name,
    accountNumber: row.account_number,
    bankName: row.bank_name,
    qrStoragePath: row.qr_storage_path,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function recordToCheckoutChannel(record: PaymentChannelRecord): PaymentChannel {
  const accountHint =
    record.bankName.trim()
    || record.label.trim()
    || 'Account';
  return {
    id: record.id,
    slug: record.slug,
    label: record.label,
    sub: record.subtitle,
    bg: record.accentColor,
    accountName: record.accountName,
    accountNumber: record.accountNumber.trim() || undefined,
    accountHint,
    qrImageUrl: publicQrUrl(record.qrStoragePath),
  };
}

const CHANNEL_SELECT = `
  id,
  slug,
  label,
  subtitle,
  accent_color,
  account_name,
  account_number,
  bank_name,
  qr_storage_path,
  sort_order,
  is_active,
  created_at,
  updated_at
`;

export async function fetchActivePaymentChannelsForCheckout(): Promise<{
  data: PaymentChannel[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('payment_channels')
    .select(CHANNEL_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('fetchActivePaymentChannelsForCheckout:', error.message);
    return { data: [], error: error.message };
  }

  const data = (rows ?? []).map((row) =>
    recordToCheckoutChannel(mapRow(row as PaymentChannelRow)),
  );
  return { data, error: null };
}

export async function fetchPaymentChannelsForAdmin(): Promise<{
  data: PaymentChannelRecord[];
  error: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('payment_channels')
    .select(CHANNEL_SELECT)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('fetchPaymentChannelsForAdmin:', error.message);
    return { data: [], error: error.message };
  }

  return { data: (rows ?? []).map((row) => mapRow(row as PaymentChannelRow)), error: null };
}

export function slugifyPaymentChannelLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'channel';
}

function extensionForImage(file: File): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (map[file.type]) return map[file.type];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'png';
}

export async function uploadPaymentChannelQr(
  channelId: string,
  file: File,
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  const ext = extensionForImage(file);
  const storagePath = `${channelId}/qr.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_CHANNEL_QR_BUCKET)
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type || undefined,
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('uploadPaymentChannelQr:', uploadError.message);
    return { ok: false, error: uploadError.message };
  }

  return { ok: true, storagePath };
}

export type PaymentChannelUpsertInput = {
  id?: string;
  slug: string;
  label: string;
  subtitle: string;
  accentColor: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  sortOrder: number;
  isActive: boolean;
  qrStoragePath?: string | null;
};

export async function upsertPaymentChannelRecord(
  input: PaymentChannelUpsertInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const payload = {
    slug: input.slug.trim(),
    label: input.label.trim(),
    subtitle: input.subtitle.trim(),
    accent_color: input.accentColor.trim() || '#3A4A5A',
    account_name: input.accountName.trim(),
    account_number: input.accountNumber.trim(),
    bank_name: input.bankName.trim(),
    sort_order: input.sortOrder,
    is_active: input.isActive,
    ...(input.qrStoragePath !== undefined ? { qr_storage_path: input.qrStoragePath } : {}),
  };

  if (input.id) {
    const { slug: _slug, ...updatePayload } = payload;
    const { error } = await supabase
      .from('payment_channels')
      .update(updatePayload)
      .eq('id', input.id);
    if (error) {
      console.error('upsertPaymentChannelRecord update:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase
    .from('payment_channels')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('upsertPaymentChannelRecord insert:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id as string };
}

export async function deletePaymentChannelRecord(
  id: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('payment_channels').delete().eq('id', id);
  if (error) {
    console.error('deletePaymentChannelRecord:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export function paymentChannelPublicQrUrl(storagePath: string | null): string | null {
  return publicQrUrl(storagePath);
}
