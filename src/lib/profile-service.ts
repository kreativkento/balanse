import { supabase } from './supabase';
import type { AccountRow, AccountWithProfile, UserRole } from './database.types';

export async function fetchAccountWithProfileByAuthUserId(
  authUserId: string,
): Promise<AccountWithProfile | null> {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (accountError) {
    console.error('Failed to fetch account:', accountError.message);
    return null;
  }

  if (!account) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('account_id', account.id)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to fetch profile:', profileError.message);
    return null;
  }

  if (!profile) return null;

  return { account, profile };
}

export async function repairOrphanedUserAccount(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('repair_orphaned_user_account');

  if (error) {
    console.error('Failed to repair orphaned user account:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function fetchOrRepairAccountWithProfileByAuthUserId(
  authUserId: string,
): Promise<AccountWithProfile | null> {
  let accountData = await fetchAccountWithProfileByAuthUserId(authUserId);
  if (accountData) return accountData;

  const repair = await repairOrphanedUserAccount();
  if (!repair.ok) return null;

  return fetchAccountWithProfileByAuthUserId(authUserId);
}

export async function updateProfileByAuthUserId(
  authUserId: string,
  update: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (accountError || !account) {
    return { ok: false, error: accountError?.message ?? 'Account not found.' };
  }

  const { error } = await supabase.from('profiles').update(update).eq('account_id', account.id);

  if (error) {
    console.error('Failed to update profile:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export function isRoleMatch(account: AccountRow, expected: UserRole): boolean {
  if (account.role === 'dev') return true;
  return account.role === expected;
}

export function canManageUserAndCoach(account: AccountRow): boolean {
  return account.role === 'admin' || account.role === 'dev';
}
