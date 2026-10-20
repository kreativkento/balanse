import { supabase } from './supabase';

export interface AdminCreditLot {
  id: string;
  accountId: string;
  quantityInitial: number;
  quantityRemaining: number;
  expiresAt: string | null;
  sourceType: string;
  createdAt: string;
}

export interface ExpiringCreditRow {
  lotId: string;
  accountId: string;
  memberName: string;
  email: string;
  quantityRemaining: number;
  expiresAt: string;
}

async function memberNames(accountIds: string[]): Promise<Map<string, { name: string; email: string }>> {
  const map = new Map<string, { name: string; email: string }>();
  if (accountIds.length === 0) return map;
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, email, profiles_client ( name )')
    .in('id', accountIds);
  for (const row of accounts ?? []) {
    const profileJoin = row.profiles_client as { name?: string } | { name?: string }[] | null;
    const profile = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin;
    const email = String(row.email ?? '').trim();
    map.set(row.id as string, {
      email,
      name: String(profile?.name ?? '').trim() || email || 'Member',
    });
  }
  return map;
}

export async function fetchCreditLotsForAccount(accountId: string): Promise<{
  data: AdminCreditLot[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('account_credit_lots')
    .select('id, account_id, quantity_initial, quantity_remaining, expires_at, source_type, created_at')
    .eq('account_id', accountId)
    .order('expires_at', { ascending: true, nullsFirst: false });

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      accountId: row.account_id as string,
      quantityInitial: row.quantity_initial as number,
      quantityRemaining: row.quantity_remaining as number,
      expiresAt: (row.expires_at as string | null) ?? null,
      sourceType: row.source_type as string,
      createdAt: row.created_at as string,
    })),
    error: null,
  };
}

export async function fetchCreditsExpiringWithinDays(days = 7): Promise<{
  data: ExpiringCreditRow[];
  error: string | null;
}> {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('account_credit_lots')
    .select('id, account_id, quantity_remaining, expires_at')
    .gt('quantity_remaining', 0)
    .not('expires_at', 'is', null)
    .gt('expires_at', new Date().toISOString())
    .lte('expires_at', until)
    .order('expires_at', { ascending: true });

  if (error) return { data: [], error: error.message };
  const lots = data ?? [];
  const names = await memberNames([...new Set(lots.map((row) => row.account_id as string))]);
  return {
    data: lots.map((row) => {
      const member = names.get(row.account_id as string);
      return {
        lotId: row.id as string,
        accountId: row.account_id as string,
        memberName: member?.name ?? 'Member',
        email: member?.email ?? '',
        quantityRemaining: row.quantity_remaining as number,
        expiresAt: row.expires_at as string,
      };
    }),
    error: null,
  };
}

export async function grantCourtesyCredits(input: {
  accountId: string;
  quantity: number;
  expiresAt: string;
  reason: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_grant_courtesy_credits', {
    p_account_id: input.accountId,
    p_quantity: input.quantity,
    p_expires_at: input.expiresAt,
    p_reason: input.reason.trim(),
  });
  return { error: error?.message ?? null };
}

export async function extendCreditLot(input: {
  lotId: string;
  expiresAt: string;
  reason: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_extend_credit_lot', {
    p_lot_id: input.lotId,
    p_expires_at: input.expiresAt,
    p_reason: input.reason.trim(),
  });
  return { error: error?.message ?? null };
}

export async function adjustCreditLot(input: {
  lotId: string;
  delta: number;
  reason: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_adjust_credit_lot', {
    p_lot_id: input.lotId,
    p_delta: input.delta,
    p_reason: input.reason.trim(),
  });
  return { error: error?.message ?? null };
}

export function downloadExpiringCreditsCsv(
  rows: ExpiringCreditRow[],
  formatDate: (iso: string) => string,
): void {
  const header = ['Member', 'Email', 'Credits remaining', 'Expires'];
  const lines = [
    header.join(','),
    ...rows.map((row) => [row.memberName, row.email, String(row.quantityRemaining), formatDate(row.expiresAt)]
      .map((cell) => (/[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell))
      .join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `credits-expiring-7-days-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
