import { supabase } from './supabase';
import type {
  AccountRow,
  AccountWithProfile,
  AccountWithStaffProfile,
  AccountWithClientProfile,
  ProfileStaffRow,
  ProfileClientRow,
  StaffUserRole,
  UserRole,
} from './database.types';
import { hasAdminPrivileges } from './database.types';

const MANAGED_ROLES: UserRole[] = ['user', 'coach'];
const STAFF_DIRECTORY_ROLES: UserRole[] = ['coach', 'dev', 'admin', 'frontdesk', 'marketing'];

export async function fetchStaffDirectoryAccounts(): Promise<AccountWithStaffProfile[]> {
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .in('role', STAFF_DIRECTORY_ROLES)
    .order('created_at', { ascending: false });

  if (accountsError) {
    console.error('Failed to fetch staff directory:', accountsError.message);
    return [];
  }

  if (!accounts?.length) return [];

  const accountIds = accounts.map((account) => account.id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles_staff')
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
    .filter((row): row is AccountWithStaffProfile => row !== null);
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

  if (role === 'user') {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles_client')
      .select('*')
      .in('account_id', accountIds);

    if (profilesError) {
      console.error('Failed to fetch managed client profiles:', profilesError.message);
      return [];
    }

    const profileByAccountId = new Map(
      (profiles ?? []).map((profile) => [profile.account_id, profile]),
    );

    return accounts
      .map((account) => {
        const profile = profileByAccountId.get(account.id);
        if (!profile) return null;
        return { account, profile } satisfies AccountWithClientProfile;
      })
      .filter((row): row is AccountWithClientProfile => row !== null);
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles_staff')
    .select('*')
    .in('account_id', accountIds);

  if (profilesError) {
    console.error('Failed to fetch managed staff profiles:', profilesError.message);
    return [];
  }

  const profileByAccountId = new Map(
    (profiles ?? []).map((profile) => [profile.account_id, profile]),
  );

  return accounts
    .map((account) => {
      const profile = profileByAccountId.get(account.id);
      if (!profile) return null;
      return { account, profile } satisfies AccountWithStaffProfile;
    })
    .filter((row): row is AccountWithStaffProfile => row !== null);
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

  if (account.role === 'user') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles_client')
      .select('*')
      .eq('account_id', account.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Failed to fetch managed client profile:', profileError?.message);
      return null;
    }

    return { account, profile };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles_staff')
    .select('*')
    .eq('account_id', account.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('Failed to fetch managed staff profile:', profileError?.message);
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

/** Update email/role for staff-directory accounts (coach, admin, dev, frontdesk, marketing). */
export async function updateStaffDirectoryAccount(
  accountId: string,
  update: Partial<Pick<AccountRow, 'email' | 'role'>>,
): Promise<{ ok: boolean; error?: string }> {
  if (update.role && !STAFF_DIRECTORY_ROLES.includes(update.role)) {
    return { ok: false, error: 'Invalid staff role.' };
  }

  const { error } = await supabase.from('accounts').update(update).eq('id', accountId);

  if (error) {
    console.error('Failed to update staff directory account:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function updateManagedClientProfile(
  accountId: string,
  update: Partial<ProfileClientRow>,
): Promise<{ ok: boolean; error?: string }> {
  const payload = { ...update };
  delete payload.id;
  delete payload.account_id;
  delete payload.created_at;
  delete payload.updated_at;

  const { error } = await supabase
    .from('profiles_client')
    .update(payload)
    .eq('account_id', accountId);

  if (error) {
    console.error('Failed to update managed client profile:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** @deprecated Use updateManagedClientProfile */
export const updateManagedStudentProfile = updateManagedClientProfile;

export async function updateManagedStaffProfile(
  accountId: string,
  update: Partial<ProfileStaffRow>,
): Promise<{ ok: boolean; error?: string }> {
  const payload = { ...update };
  delete payload.id;
  delete payload.account_id;
  delete payload.created_at;
  delete payload.updated_at;

  const { error } = await supabase
    .from('profiles_staff')
    .update(payload)
    .eq('account_id', accountId);

  if (error) {
    console.error('Failed to update managed staff profile:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/** @deprecated Prefer updateManagedClientProfile / updateManagedStaffProfile */
export async function updateManagedProfile(
  accountId: string,
  update: Partial<ProfileClientRow> | Partial<ProfileStaffRow>,
): Promise<{ ok: boolean; error?: string }> {
  const { data: account, error } = await supabase
    .from('accounts')
    .select('role')
    .eq('id', accountId)
    .maybeSingle();

  if (error || !account) {
    return { ok: false, error: error?.message ?? 'Account not found.' };
  }

  if (account.role === 'user') {
    return updateManagedClientProfile(accountId, update as Partial<ProfileClientRow>);
  }

  return updateManagedStaffProfile(accountId, update as Partial<ProfileStaffRow>);
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
  nationality?: string;
  /** @deprecated Prefer disciplineIds + set_coach_disciplines */
  specialty?: string;
  /** Account role for staff (never user). */
  staffRole?: StaffUserRole;
  /** @deprecated Use staffRole */
  staffType?: 'Coach' | 'Administrator';
  disciplineIds?: string[];
}

function staffTypeToRole(staffType?: 'Coach' | 'Administrator', staffRole?: StaffUserRole): StaffUserRole {
  if (staffRole) return staffRole;
  if (staffType === 'Administrator') return 'admin';
  return 'coach';
}

export async function setCoachDisciplines(
  accountId: string,
  disciplineIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('set_coach_disciplines', {
    p_account_id: accountId,
    p_discipline_ids: disciplineIds,
  });

  if (error) {
    console.error('Failed to set coach disciplines:', error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function fetchCoachDisciplineMap(
  accountIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (accountIds.length === 0) return map;

  const { data, error } = await supabase
    .from('coach_disciplines')
    .select('account_id, discipline_id')
    .in('account_id', accountIds);

  if (error) {
    console.error('Failed to fetch coach disciplines:', error.message);
    return map;
  }

  for (const row of data ?? []) {
    const list = map.get(row.account_id) ?? [];
    list.push(row.discipline_id);
    map.set(row.account_id, list);
  }

  return map;
}

export async function createStaffAccount(
  input: CreateStaffAccountInput,
): Promise<{ ok: boolean; accountId?: string; error?: string }> {
  const role = staffTypeToRole(input.staffType, input.staffRole);
  const { data, error } = await supabase.rpc('admin_create_staff_account', {
    p_email: input.email.trim().toLowerCase(),
    p_password: input.password,
    p_name: input.name.trim(),
    p_specialty: input.specialty ?? '',
    p_staff_type: role,
  });

  if (error) {
    const message = error.message.includes('ACCOUNT_EXISTS')
      ? 'An account with this email already exists.'
      : error.message;
    console.error('Failed to create staff account:', error.message);
    return { ok: false, error: message };
  }

  const accountId = data as string;

  if (input.nationality?.trim()) {
    const nationalityResult = await updateManagedStaffProfile(accountId, {
      nationality: input.nationality.trim(),
    });
    if (!nationalityResult.ok) {
      return { ok: false, accountId, error: nationalityResult.error };
    }
  }

  if (role === 'coach' && input.disciplineIds && input.disciplineIds.length > 0) {
    const tagResult = await setCoachDisciplines(accountId, input.disciplineIds);
    if (!tagResult.ok) {
      return { ok: false, accountId, error: tagResult.error };
    }
  }

  return { ok: true, accountId };
}

export type StaffDirectoryAccountRole = 'coach' | 'dev' | 'admin' | 'frontdesk' | 'marketing';

export function staffRowToListItem(
  row: AccountWithStaffProfile,
  disciplineNamesById?: Map<string, string>,
  coachDisciplineIds?: string[],
): {
  id: string;
  name: string;
  email: string;
  role: 'Coach' | 'Administrator' | 'Dev' | 'Admin' | 'Front Desk' | 'Marketing';
  specialty: string;
  disciplineIds: string[];
  disciplineNames: string[];
  status: 'active' | 'inactive';
  accountRole: StaffDirectoryAccountRole;
  photo: string;
  bio: string;
  experience: string;
  phone: string;
  nationality: string;
} {
  const displayName = row.profile.name || row.profile.display_name || row.account.email;
  const disciplineIds = coachDisciplineIds ?? [];
  const disciplineNames =
    disciplineIds.length > 0 && disciplineNamesById
      ? disciplineIds
          .map((id) => disciplineNamesById.get(id))
          .filter((name): name is string => Boolean(name))
      : [];
  const disciplineLabel = disciplineNames.length > 0 ? disciplineNames.join(', ') : '—';
  const profileExtras = {
    photo: row.profile.photo ?? '',
    bio: row.profile.bio ?? '',
    experience: row.profile.experience ?? '',
    phone: row.profile.phone ?? '',
    nationality: row.profile.nationality ?? '',
  };

  if (row.account.role === 'dev') {
    return {
      id: row.account.id,
      name: displayName,
      email: row.account.email,
      role: 'Dev',
      specialty: '—',
      disciplineIds: [],
      disciplineNames: [],
      status: 'active',
      accountRole: 'dev',
      ...profileExtras,
    };
  }

  if (row.account.role === 'admin') {
    return {
      id: row.account.id,
      name: displayName,
      email: row.account.email,
      role: 'Admin',
      specialty: '—',
      disciplineIds: [],
      disciplineNames: [],
      status: 'active',
      accountRole: 'admin',
      ...profileExtras,
    };
  }

  if (row.account.role === 'frontdesk') {
    return {
      id: row.account.id,
      name: displayName,
      email: row.account.email,
      role: 'Front Desk',
      specialty: '—',
      disciplineIds: [],
      disciplineNames: [],
      status: 'active',
      accountRole: 'frontdesk',
      ...profileExtras,
    };
  }

  if (row.account.role === 'marketing') {
    return {
      id: row.account.id,
      name: displayName,
      email: row.account.email,
      role: 'Marketing',
      specialty: '—',
      disciplineIds: [],
      disciplineNames: [],
      status: 'active',
      accountRole: 'marketing',
      ...profileExtras,
    };
  }

  const legacySpecialty = row.profile.classes?.[0] ?? '—';
  const legacyClasses = (row.profile.classes ?? []).filter(Boolean);
  const staffType =
    row.profile.staff_type === 'Administrator' || row.profile.experience === 'Administrator'
      ? 'Administrator'
      : 'Coach';
  const resolvedDisciplineNames =
    staffType === 'Administrator'
      ? []
      : disciplineNames.length > 0
        ? disciplineNames
        : legacyClasses;

  return {
    id: row.account.id,
    name: displayName,
    email: row.account.email,
    role: staffType,
    specialty: staffType === 'Administrator' ? '—' : (disciplineLabel !== '—' ? disciplineLabel : legacySpecialty),
    disciplineIds: staffType === 'Administrator' ? [] : disciplineIds,
    disciplineNames: resolvedDisciplineNames,
    status: 'active',
    accountRole: 'coach',
    ...profileExtras,
  };
}

export function isStaffMemberLockedForAdmin(
  member: { accountRole: UserRole },
  viewerRole: UserRole | undefined,
): boolean {
  if (!viewerRole || !hasAdminPrivileges(viewerRole) || viewerRole === 'dev') {
    return false;
  }
  // Ops admins cannot edit other privileged ops/dev accounts
  return (
    member.accountRole === 'dev'
    || member.accountRole === 'admin'
    || member.accountRole === 'frontdesk'
    || member.accountRole === 'marketing'
  );
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
    nationality?: string;
    staffType?: 'Coach' | 'Administrator';
    staffRole?: StaffUserRole;
    disciplineIds?: string[];
  },
): Promise<{ ok: boolean; error?: string }> {
  const { firstName, lastName } = splitFullName(input.name);
  const role = staffTypeToRole(input.staffType, input.staffRole);
  const staffTypeLabel =
    role === 'admin'
      ? 'Admin'
      : role === 'dev'
        ? 'Dev'
        : role === 'frontdesk'
          ? 'Front Desk'
          : role === 'marketing'
            ? 'Marketing'
            : 'Coach';
  const specialty =
    role === 'coach' ? (input.specialty ?? '—') : '—';

  const accountResult = await updateStaffDirectoryAccount(accountId, {
    email: input.email.trim().toLowerCase(),
    role,
  });
  if (!accountResult.ok) return accountResult;

  const profileResult = await updateManagedStaffProfile(accountId, {
    first_name: firstName,
    last_name: lastName,
    name: input.name.trim(),
    display_name: input.name.trim(),
    nationality: input.nationality?.trim() ?? '',
    classes: specialty !== '—' ? [specialty] : [],
    experience: staffTypeLabel,
    staff_type: staffTypeLabel,
  });
  if (!profileResult.ok) return profileResult;

  if (role === 'coach') {
    return setCoachDisciplines(accountId, input.disciplineIds ?? []);
  }

  return { ok: true };
}
