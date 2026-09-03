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
import { loadProfileImageUrlsForUser } from './storage-service';

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
  coverImage: string;
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
    photo: row.profile.photo || '',
    coverImage: row.profile.cover_image || '',
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

export async function withBucketProfileImages<T extends { photo: string; coverImage: string }>(
  item: T,
  authUserId: string,
): Promise<T> {
  if ((item.photo && item.coverImage) || !authUserId) return item;
  const bucket = await loadProfileImageUrlsForUser(authUserId);
  return {
    ...item,
    photo: item.photo || bucket.photo,
    coverImage: item.coverImage || bucket.coverImage,
  };
}

export async function fetchCoachDirectoryImages(): Promise<
  { firstName: string; photo: string; coverImage: string }[]
> {
  const { data: publicRows, error: publicError } = await supabase.rpc('coach_directory_images');
  if (!publicError && publicRows?.length) {
    return Promise.all(
      publicRows.map(async (row) => {
        const bucket = await loadProfileImageUrlsForUser(row.auth_user_id);
        return {
          firstName: (row.first_name || '').toLowerCase(),
          photo: row.photo || bucket.photo,
          coverImage: row.cover_image || bucket.coverImage,
        };
      }),
    );
  }

  const rows = await fetchStaffDirectoryAccounts();
  const coaches = rows.filter((row) => row.account.role === 'coach');
  return Promise.all(
    coaches.map(async (row) => {
      const bucket = await loadProfileImageUrlsForUser(row.account.auth_user_id);
      const name = row.profile.display_name || row.profile.name || '';
      return {
        firstName: name.split(/\s+/)[0]?.toLowerCase() ?? '',
        photo: row.profile.photo || bucket.photo,
        coverImage: row.profile.cover_image || bucket.coverImage,
      };
    }),
  );
}

export interface PublicCoachProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  experience: string;
  nationality: string;
  classes: string[];
  specialties: string[];
  photo: string;
  coverImage: string;
  initials: string;
  color: string;
}

const COACH_COLORS = [
  '#3A4A5A', '#c49a3c', '#6B8E6B', '#8B6F5A', '#B86A4A', '#9A7A8A', '#7A3A4A', '#A07050',
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CO';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function colorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COACH_COLORS[hash % COACH_COLORS.length];
}

function mapPublicCoachRow(row: {
  account_id: string;
  auth_user_id: string;
  display_name: string;
  name: string;
  staff_type: string;
  bio: string;
  experience: string;
  nationality: string;
  photo: string;
  cover_image: string;
  legacy_classes: string[] | null;
  discipline_names: string[] | null;
}, photo: string, coverImage: string): PublicCoachProfile {
  const displayName =
    (row.display_name || '').trim()
    || (row.name || '').trim()
    || 'Coach';
  const disciplines = (row.discipline_names ?? []).map((n) => n.trim()).filter(Boolean);
  const legacy = (row.legacy_classes ?? []).map((n) => n.trim()).filter(Boolean);
  const classes = disciplines.length > 0 ? disciplines : legacy;

  return {
    id: row.account_id,
    name: displayName,
    role: (row.staff_type || '').trim() || 'Coach',
    bio: (row.bio || '').trim(),
    experience: (row.experience || '').trim(),
    nationality: (row.nationality || '').trim(),
    classes,
    specialties: classes,
    photo,
    coverImage,
    initials: initialsFromName(displayName),
    color: colorFromId(row.account_id),
  };
}

/** Public coach directory for /coaches — profiles_staff + disciplines (no emails). */
export async function fetchPublicCoaches(): Promise<{
  data: PublicCoachProfile[];
  error: string | null;
}> {
  const { data: publicRows, error: publicError } = await supabase.rpc('coach_directory');
  if (!publicError && publicRows) {
    const data = await Promise.all(
      publicRows.map(async (row) => {
        const bucket = await loadProfileImageUrlsForUser(row.auth_user_id);
        return mapPublicCoachRow(
          row,
          row.photo || bucket.photo,
          row.cover_image || bucket.coverImage,
        );
      }),
    );
    return { data, error: null };
  }

  // Fallback when RPC not migrated yet (admin-authenticated only).
  try {
    const rows = await fetchStaffDirectoryAccounts();
    const coaches = rows.filter((row) => row.account.role === 'coach');
    const disciplineMap = await fetchCoachDisciplineMap(coaches.map((row) => row.account.id));
    const data = await Promise.all(
      coaches.map(async (row) => {
        const bucket = await loadProfileImageUrlsForUser(row.account.auth_user_id);
        const disciplineNames = (disciplineMap.get(row.account.id) ?? []).map((d) => d.name);
        return mapPublicCoachRow(
          {
            account_id: row.account.id,
            auth_user_id: row.account.auth_user_id,
            display_name: row.profile.display_name,
            name: row.profile.name,
            staff_type: row.profile.staff_type,
            bio: row.profile.bio,
            experience: row.profile.experience,
            nationality: row.profile.nationality,
            photo: row.profile.photo,
            cover_image: row.profile.cover_image,
            legacy_classes: row.profile.classes,
            discipline_names: disciplineNames,
          },
          row.profile.photo || bucket.photo,
          row.profile.cover_image || bucket.coverImage,
        );
      }),
    );
    return {
      data,
      error: publicError?.message
        ? `Public directory unavailable (${publicError.message}). Showing fallback list.`
        : null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : (publicError?.message ?? 'Could not load coaches.'),
    };
  }
}

export interface ClientDirectoryItem {
  id: string;
  authUserId: string;
  name: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
  email: string;
  phone: string;
  nationality: string;
  address: string;
  birthday: string | null;
  sex: string;
  weight: string;
  height: string;
  medicalHistory: string;
  shareAvailability: boolean;
  profileComplete: boolean;
  healthDeclarationSigned: boolean;
  termsAccepted: boolean;
  joinDate: string;
  photo: string;
  coverImage: string;
}

function formatClientJoinDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function clientRowToListItem(row: AccountWithClientProfile): ClientDirectoryItem {
  const profile = row.profile;
  const fullName =
    profile.name
    || [profile.first_name, profile.middle_initial, profile.last_name].filter(Boolean).join(' ').trim()
    || row.account.email;

  return {
    id: row.account.id,
    authUserId: row.account.auth_user_id,
    name: fullName,
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    middleInitial: profile.middle_initial ?? '',
    email: row.account.email,
    phone: profile.phone || '',
    nationality: profile.nationality || '',
    address: profile.address || '',
    birthday: profile.birthday,
    sex: profile.sex || '',
    weight: profile.weight || '',
    height: profile.height || '',
    medicalHistory: profile.medical_history || '',
    shareAvailability: profile.share_availability ?? false,
    profileComplete: profile.profile_complete ?? false,
    healthDeclarationSigned: profile.health_declaration_signed ?? false,
    termsAccepted: profile.terms_accepted ?? false,
    joinDate: formatClientJoinDate(row.account.created_at),
    photo: profile.photo || '',
    coverImage: profile.cover_image || '',
  };
}

export async function fetchClientDirectory(): Promise<ClientDirectoryItem[]> {
  const rows = await fetchManagedAccountsWithProfiles('user');
  return Promise.all(
    rows
      .filter((row): row is AccountWithClientProfile => row.account.role === 'user')
      .map((row) => withBucketProfileImages(clientRowToListItem(row), row.account.auth_user_id)),
  );
}

export async function fetchClientDirectoryImages(): Promise<
  { email: string; name: string; photo: string; coverImage: string }[]
> {
  const rows = await fetchClientDirectory();
  return rows.map((row) => ({
    email: row.email.toLowerCase(),
    name: row.name,
    photo: row.photo,
    coverImage: row.coverImage,
  }));
}

export interface ClientClassBooking {
  classId: string;
  className: string;
  date: string;
  time: string;
  status: string;
}

export async function fetchClientClassBookings(accountId: string): Promise<ClientClassBooking[]> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('class_students')
    .select('class_id, enrolled_at')
    .eq('account_id', accountId)
    .order('enrolled_at', { ascending: false })
    .limit(8);

  if (enrollError) {
    console.error('Failed to fetch client class bookings:', enrollError.message);
    return [];
  }

  if (!enrollments?.length) return [];

  const classIds = enrollments.map((row) => row.class_id);
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name, starts_at, status')
    .in('id', classIds);

  if (classError) {
    console.error('Failed to fetch booked classes:', classError.message);
    return [];
  }

  const classById = new Map((classes ?? []).map((row) => [row.id, row]));

  return enrollments.flatMap((enrollment) => {
    const cls = classById.get(enrollment.class_id);
    if (!cls) return [];
    const start = new Date(cls.starts_at);
    const valid = !Number.isNaN(start.getTime());
    return [{
      classId: cls.id,
      className: cls.name,
      date: valid
        ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—',
      time: valid
        ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : '—',
      status: cls.status,
    }];
  });
}

export async function updateClientAccountFromForm(
  accountId: string,
  input: {
    name: string;
    email: string;
    phone?: string;
    nationality?: string;
    address?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { firstName, lastName } = splitFullName(input.name);

  const accountResult = await updateManagedAccount(accountId, {
    email: input.email.trim().toLowerCase(),
  });
  if (!accountResult.ok) return accountResult;

  return updateManagedClientProfile(accountId, {
    first_name: firstName,
    last_name: lastName,
    name: input.name.trim(),
    phone: input.phone?.trim() ?? '',
    nationality: input.nationality?.trim() ?? '',
    address: input.address?.trim() ?? '',
  });
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
