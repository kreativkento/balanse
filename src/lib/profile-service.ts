import { supabase } from './supabase';
import {
  hasAdminPrivileges,
  isStaffUserRole,
  type AccountRow,
  type AccountWithClientProfile,
  type AccountWithProfile,
  type AccountWithStaffProfile,
  type ProfileClientRow,
  type ProfileStaffRow,
  type UserRole,
} from './database.types';

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

  // profiles_client → user only; profiles_staff → coach/admin/dev/frontdesk/marketing only
  if (account.role === 'user') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles_client')
      .select('*')
      .eq('account_id', account.id)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch client profile:', profileError.message);
      return null;
    }
    if (!profile) return null;
    return { account, profile } satisfies AccountWithClientProfile;
  }

  if (!isStaffUserRole(account.role)) {
    console.error('Account has unrecognized role for profile routing:', account.role);
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles_staff')
    .select('*')
    .eq('account_id', account.id)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to fetch staff profile:', profileError.message);
    return null;
  }
  if (!profile) return null;
  return { account, profile } satisfies AccountWithStaffProfile;
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

export async function updateClientProfileByAuthUserId(
  authUserId: string,
  update: Partial<ProfileClientRow>,
): Promise<{ ok: boolean; error?: string }> {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (accountError || !account) {
    return { ok: false, error: accountError?.message ?? 'Account not found.' };
  }

  if (account.role !== 'user') {
    return { ok: false, error: 'Only client accounts use profiles_client.' };
  }

  const { error } = await supabase
    .from('profiles_client')
    .update(update)
    .eq('account_id', account.id);

  if (error) {
    console.error('Failed to update client profile:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** @deprecated Use updateClientProfileByAuthUserId */
export const updateStudentProfileByAuthUserId = updateClientProfileByAuthUserId;

export async function updateStaffProfileByAuthUserId(
  authUserId: string,
  update: Partial<ProfileStaffRow>,
): Promise<{ ok: boolean; error?: string }> {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (accountError || !account) {
    return { ok: false, error: accountError?.message ?? 'Account not found.' };
  }

  if (!isStaffUserRole(account.role)) {
    return { ok: false, error: 'Only staff accounts use profiles_staff.' };
  }

  const { error } = await supabase
    .from('profiles_staff')
    .update(update)
    .eq('account_id', account.id);

  if (error) {
    console.error('Failed to update staff profile:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** @deprecated Prefer updateClientProfileByAuthUserId / updateStaffProfileByAuthUserId */
export async function updateProfileByAuthUserId(
  authUserId: string,
  update: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (accountError || !account) {
    return { ok: false, error: accountError?.message ?? 'Account not found.' };
  }

  if (account.role === 'user') {
    return updateClientProfileByAuthUserId(authUserId, update as Partial<ProfileClientRow>);
  }

  return updateStaffProfileByAuthUserId(authUserId, update as Partial<ProfileStaffRow>);
}

export function isRoleMatch(account: AccountRow, expected: UserRole): boolean {
  if (account.role === 'dev') return true;
  if (expected === 'admin') return hasAdminPrivileges(account.role);
  return account.role === expected;
}

export function canManageUserAndCoach(account: AccountRow): boolean {
  return hasAdminPrivileges(account.role);
}

export function getProfileDisplayName(
  profile: { name?: string; display_name?: string },
  email: string,
): string {
  const displayName = 'display_name' in profile ? profile.display_name : undefined;
  return profile.name?.trim() || displayName?.trim() || email;
}
