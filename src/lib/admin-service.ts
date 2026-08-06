import { supabase } from './supabase';
import type { AccountRow, AccountWithProfile, ProfileRow, UserRole } from './database.types';

const MANAGED_ROLES: UserRole[] = ['user', 'coach'];

export async function fetchStaffDirectoryAccounts(): Promise<AccountWithProfile[]> {
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .in('role', ['coach', 'dev', 'admin'])
    .order('created_at', { ascending: false });

  if (accountsError) {
    console.error('Failed to fetch staff directory:', accountsError.message);
    return [];
  }

  if (!accounts?.length) return [];

  const accountIds = accounts.map((account) => account.id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('account_id', accountIds);

  if (profilesError) {
    console.error('Failed to fetch staff directory profiles:', profilesError.message);
    return [];
  }

  const profileByAccountId = new Map(
    (profiles ?? []).map((profile) => [profile.account_id, profile]),
  );

  return accounts
    .map((account) => {
      const profile = profileByAccountId.get(account.id);
      if (!profile) return null;
      return { account, profile };
    })
    .filter((row): row is AccountWithProfile => row !== null);
}

export async function fetchManagedAccountsWithProfiles(
  role: 'user' | 'coach',
): Promise<AccountWithProfile[]> {
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (accountsError) {
    console.error('Failed to fetch managed accounts:', accountsError.message);
    return [];
  }

  if (!accounts?.length) return [];

  const accountIds = accounts.map((account) => account.id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('account_id', accountIds);

  if (profilesError) {
    console.error('Failed to fetch managed profiles:', profilesError.message);
    return [];
  }

  const profileByAccountId = new Map(
    (profiles ?? []).map((profile) => [profile.account_id, profile]),
  );

  return accounts
    .map((account) => {
      const profile = profileByAccountId.get(account.id);
      if (!profile) return null;
      return { account, profile };
    })
    .filter((row): row is AccountWithProfile => row !== null);
}

export async function fetchManagedAccountWithProfileById(
  accountId: string,
): Promise<AccountWithProfile | null> {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .maybeSingle();

  if (accountError || !account) {
    console.error('Failed to fetch managed account:', accountError?.message);
    return null;
  }

  if (!MANAGED_ROLES.includes(account.role)) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('account_id', account.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('Failed to fetch managed profile:', profileError?.message);
    return null;
  }

  return { account, profile };
}

export async function updateManagedAccount(
  accountId: string,
  update: Partial<Pick<AccountRow, 'email' | 'role'>>,
): Promise<{ ok: boolean; error?: string }> {
  if (update.role && !MANAGED_ROLES.includes(update.role)) {
    return { ok: false, error: 'Admins can only assign user or coach roles.' };
  }

  const { error } = await supabase.from('accounts').update(update).eq('id', accountId);

  if (error) {
    console.error('Failed to update managed account:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function updateManagedProfile(
  accountId: string,
  update: Partial<ProfileRow>,
): Promise<{ ok: boolean; error?: string }> {
  const payload = { ...update };
  delete payload.id;
  delete payload.account_id;
  delete payload.created_at;
  delete payload.updated_at;

  const { error } = await supabase.from('profiles').update(payload).eq('account_id', accountId);

  if (error) {
    console.error('Failed to update managed profile:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function deleteManagedAccount(
  accountId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('admin_delete_managed_account', {
    p_account_id: accountId,
  });

  if (error) {
    console.error('Failed to delete managed account:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export interface CreateStaffAccountInput {
  email: string;
  password: string;
  name: string;
  specialty?: string;
  staffType?: 'Coach' | 'Administrator';
}

export async function createStaffAccount(
  input: CreateStaffAccountInput,
): Promise<{ ok: boolean; accountId?: string; error?: string }> {
  const { data, error } = await supabase.rpc('admin_create_staff_account', {
    p_email: input.email.trim().toLowerCase(),
    p_password: input.password,
    p_name: input.name.trim(),
    p_specialty: input.specialty ?? '',
    p_staff_type: input.staffType ?? 'Coach',
  });

  if (error) {
    const message = error.message.includes('ACCOUNT_EXISTS')
      ? 'An account with this email already exists.'
      : error.message;
    console.error('Failed to create staff account:', error.message);
    return { ok: false, error: message };
  }

  return { ok: true, accountId: data as string };
}

export type StaffDirectoryAccountRole = 'coach' | 'dev' | 'admin';

export function staffRowToListItem(row: AccountWithProfile): {
  id: string;
  name: string;
  email: string;
  role: 'Coach' | 'Administrator' | 'Dev' | 'Admin';
  specialty: string;
  status: 'active' | 'inactive';
  accountRole: StaffDirectoryAccountRole;
} {
  if (row.account.role === 'dev') {
    return {
      id: row.account.id,
      name: row.profile.name || row.profile.display_name || row.account.email,
      email: row.account.email,
      role: 'Dev',
      specialty: '—',
      status: 'active',
      accountRole: 'dev',
    };
  }

  if (row.account.role === 'admin') {
    return {
      id: row.account.id,
      name: row.profile.name || row.profile.display_name || row.account.email,
      email: row.account.email,
      role: 'Admin',
      specialty: '—',
      status: 'active',
      accountRole: 'admin',
    };
  }

  const specialty = row.profile.classes?.[0] ?? '—';
  const staffType = row.profile.experience === 'Administrator' ? 'Administrator' : 'Coach';

  return {
    id: row.account.id,
    name: row.profile.name || row.profile.display_name || row.account.email,
    email: row.account.email,
    role: staffType,
    specialty: staffType === 'Administrator' ? '—' : specialty,
    status: 'active',
    accountRole: 'coach',
  };
}

export function isStaffMemberLockedForAdmin(
  member: { accountRole: UserRole },
  viewerRole: UserRole | undefined,
): boolean {
  return viewerRole === 'admin' && (member.accountRole === 'dev' || member.accountRole === 'admin');
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1).trim(),
  };
}

export async function updateStaffAccountFromForm(
  accountId: string,
  input: {
    name: string;
    email: string;
    specialty?: string;
    staffType?: 'Coach' | 'Administrator';
  },
): Promise<{ ok: boolean; error?: string }> {
  const { firstName, lastName } = splitFullName(input.name);
  const staffType = input.staffType ?? 'Coach';
  const specialty = staffType === 'Administrator' ? '—' : (input.specialty ?? '—');

  const accountResult = await updateManagedAccount(accountId, {
    email: input.email.trim().toLowerCase(),
    role: 'coach',
  });
  if (!accountResult.ok) return accountResult;

  return updateManagedProfile(accountId, {
    first_name: firstName,
    last_name: lastName,
    name: input.name.trim(),
    display_name: input.name.trim(),
    classes: specialty !== '—' ? [specialty] : [],
    experience: staffType,
  });
}
