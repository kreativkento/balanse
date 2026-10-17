import { getDisciplinePlaceholderLogo } from '../app/data/disciplines';
import { supabase } from './supabase';
import { loadProfileImageUrlsForUser } from './storage-service';
import type {
  AccountRow,
  ClassBlockStatus,
  ClassCoachRow,
  ClassOpenStatus,
  ClassRow,
  ClassStudentRow,
  DisciplineRow,
  ProfileClientRow,
  ProfileStaffRow,
} from './database.types';

type ProfileNameRow = Pick<ProfileClientRow, 'account_id' | 'name'> & {
  display_name?: string;
};

export type { ClassOpenStatus, ClassBlockStatus };

export interface ClassPerson {
  accountId: string;
  name: string;
  email: string;
  coachConfirmation?: boolean;
  /** Resolved public URL when loaded via coach_directory (member schedule). */
  photo?: string;
}

export interface ClassDisplay {
  id: string;
  uid: string;
  name: string;
  description: string;
  disciplineId: string | null;
  disciplineName: string;
  startsAt: string;
  endsAt: string | null;
  classLimit: number | null;
  statusClass: ClassOpenStatus;
  statusBlock: ClassBlockStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string | null;
  coaches: ClassPerson[];
  students: ClassPerson[];
  enrolledCount: number;
}

export interface ClassUpsertInput {
  name: string;
  description: string;
  disciplineId: string | null;
  startsAt: string;
  endsAt: string | null;
  classLimit: number | null;
  statusClass: ClassOpenStatus;
  statusBlock: ClassBlockStatus;
  coachAccountIds: string[];
  studentAccountIds: string[];
}

export const CLASS_OPEN_STATUSES: ClassOpenStatus[] = ['open', 'close', 'pending'];
export const CLASS_BLOCK_STATUSES: ClassBlockStatus[] = ['vacant', 'occupied', 'active', 'closed'];

export function createEmptyClassDraft(): ClassUpsertInput {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  return {
    name: '',
    description: '',
    disciplineId: null,
    startsAt: start.toISOString(),
    endsAt: null,
    classLimit: 12,
    statusClass: 'close',
    statusBlock: 'active',
    coachAccountIds: [],
    studentAccountIds: [],
  };
}

function personLabel(
  account: AccountRow | undefined,
  profile: ProfileNameRow | undefined,
  coachConfirmation?: boolean,
): ClassPerson | null {
  if (!account) return null;
  return {
    accountId: account.id,
    name: profile?.name?.trim() || profile?.display_name?.trim() || account.email,
    email: account.email,
    coachConfirmation,
  };
}

function validateFullClassInput(input: ClassUpsertInput): string | null {
  if (!input.name.trim()) return 'Class name is required.';
  if (!input.disciplineId) return 'Choose a discipline tag.';
  if (!input.startsAt) return 'Class date/time is required.';
  if (!Number.isFinite(input.classLimit) || input.classLimit < 1) {
    return 'Class limit must be at least 1.';
  }
  if (input.coachAccountIds.length < 1) {
    return 'Assign at least one coach.';
  }
  if (input.studentAccountIds.length > input.classLimit) {
    return `Cannot enroll ${input.studentAccountIds.length} students; class limit is ${input.classLimit}.`;
  }
  if (input.endsAt) {
    const start = new Date(input.startsAt).getTime();
    const end = new Date(input.endsAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      return 'End time must be on or after the start time.';
    }
  }
  return null;
}

function validateScheduleBlockInput(input: ClassUpsertInput): string | null {
  if (!input.startsAt) return 'Class date/time is required.';
  if (input.classLimit != null && (!Number.isFinite(input.classLimit) || input.classLimit < 1)) {
    return 'Class limit must be at least 1.';
  }
  if (input.studentAccountIds.length > 0 && (input.classLimit == null || input.classLimit < 1)) {
    return 'Class limit is required when students are enrolled.';
  }
  if (
    input.classLimit != null
    && input.studentAccountIds.length > input.classLimit
  ) {
    return `Cannot enroll ${input.studentAccountIds.length} students; class limit is ${input.classLimit}.`;
  }
  if (input.endsAt) {
    const start = new Date(input.startsAt).getTime();
    const end = new Date(input.endsAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      return 'End time must be on or after the start time.';
    }
  }
  return null;
}

async function fetchAccountsAndProfiles(accountIds: string[]): Promise<{
  accountsById: Map<string, AccountRow>;
  profilesByAccountId: Map<string, ProfileNameRow>;
}> {
  const uniqueIds = [...new Set(accountIds.filter(Boolean))];
  const accountsById = new Map<string, AccountRow>();
  const profilesByAccountId = new Map<string, ProfileNameRow>();

  if (uniqueIds.length === 0) {
    return { accountsById, profilesByAccountId };
  }

  const [{ data: accounts }, { data: clientProfiles }, { data: staffProfiles }] = await Promise.all([
    supabase.from('accounts').select('*').in('id', uniqueIds),
    supabase.from('profiles_client').select('account_id, name').in('account_id', uniqueIds),
    supabase
      .from('profiles_staff')
      .select('account_id, name, display_name')
      .in('account_id', uniqueIds),
  ]);

  for (const account of accounts ?? []) {
    accountsById.set(account.id, account);
  }
  for (const profile of (clientProfiles ?? []) as Pick<ProfileClientRow, 'account_id' | 'name'>[]) {
    profilesByAccountId.set(profile.account_id, profile);
  }
  for (const profile of (staffProfiles ?? []) as Pick<ProfileStaffRow, 'account_id' | 'name' | 'display_name'>[]) {
    profilesByAccountId.set(profile.account_id, profile);
  }

  return { accountsById, profilesByAccountId };
}

type CoachDirectoryEntry = {
  name: string;
  photo: string;
  authUserId: string;
};

async function fetchCoachDirectoryByAccountId(): Promise<Map<string, CoachDirectoryEntry>> {
  const { data, error } = await supabase.rpc('coach_directory');
  if (error) {
    console.error('coach_directory failed:', error.message);
    return new Map();
  }

  const map = new Map<string, CoachDirectoryEntry>();
  for (const row of data ?? []) {
    const entry = row as {
      account_id: string;
      auth_user_id: string;
      display_name?: string | null;
      name?: string | null;
      photo?: string | null;
    };
    const name =
      entry.display_name?.trim()
      || entry.name?.trim()
      || 'Coach';
    map.set(entry.account_id, {
      name,
      photo: entry.photo?.trim() ?? '',
      authUserId: entry.auth_user_id,
    });
  }
  return map;
}

async function coachPersonFromDirectory(
  accountId: string,
  coachConfirmation: boolean,
  directory: Map<string, CoachDirectoryEntry>,
): Promise<ClassPerson | null> {
  const entry = directory.get(accountId);
  if (!entry) return null;

  let photo = entry.photo;
  if (entry.authUserId) {
    const bucket = await loadProfileImageUrlsForUser(entry.authUserId);
    photo = bucket.photo || photo;
  }

  return {
    accountId,
    name: entry.name,
    email: '',
    coachConfirmation,
    photo: photo || undefined,
  };
}

/** Same query as admin; staff RLS allows read via migration 046. */
export async function fetchClassesForStaffSchedule(): Promise<{
  data: ClassDisplay[];
  error: string | null;
}> {
  return fetchClassesForAdmin();
}

/** Classes where the coach is assigned (`class_coaches`). */
export async function fetchCoachAssignedClassDisplays(
  accountId: string,
  options?: { includeAllBlocks?: boolean },
): Promise<{
  data: ClassDisplay[];
  error: string | null;
}> {
  const trimmed = accountId.trim();
  const { data, error } = await fetchClassesForStaffSchedule();
  if (error) return { data: [], error };
  if (!trimmed) return { data: [], error: null };
  const visibleBlocks: ClassBlockStatus[] = ['active', 'occupied'];
  const assigned = data.filter((row) => {
    if (!row.coaches.some((coach) => coach.accountId === trimmed)) return false;
    if (options?.includeAllBlocks) return true;
    return visibleBlocks.includes(row.statusBlock);
  });
  return { data: assigned, error: null };
}

/** One assigned class for the coach portal (My Classes card detail). */
export async function fetchCoachAssignedClassDisplayById(
  coachAccountId: string,
  classId: string,
): Promise<{ data: ClassDisplay | null; error: string | null }> {
  const trimmedCoach = coachAccountId.trim();
  const trimmedClass = classId.trim();
  if (!trimmedCoach || !trimmedClass) {
    return { data: null, error: null };
  }

  const { data: assignment, error: assignError } = await supabase
    .from('class_coaches')
    .select('class_id')
    .eq('class_id', trimmedClass)
    .eq('account_id', trimmedCoach)
    .maybeSingle();

  if (assignError) {
    console.error('fetchCoachAssignedClassDisplayById assignment:', assignError.message);
    return { data: null, error: assignError.message };
  }
  if (!assignment) {
    return { data: null, error: null };
  }

  const { data, error } = await fetchClassesForStaffSchedule();
  if (error) return { data: null, error };
  const match = data.find((row) => row.id === trimmedClass) ?? null;
  return { data: match, error: null };
}

type CoachClassRosterRow = {
  account_id: string;
  auth_user_id: string;
  name: string;
  photo: string;
};

async function mapCoachClassRosterRows(rows: CoachClassRosterRow[]): Promise<ClassPerson[]> {
  return Promise.all(
    rows.map(async (row) => {
      let photo = row.photo?.trim() || undefined;
      if (row.auth_user_id) {
        const bucket = await loadProfileImageUrlsForUser(row.auth_user_id);
        photo = bucket.photo || photo;
      }
      return {
        accountId: row.account_id,
        name: row.name?.trim() || 'Member',
        email: '',
        photo,
      } satisfies ClassPerson;
    }),
  );
}

/** Enrolled students for a coach-assigned class (`coach_class_enrolled_students` RPC). */
export async function fetchCoachClassRoster(classId: string): Promise<{
  data: ClassPerson[];
  error: string | null;
}> {
  const trimmed = classId.trim();
  if (!trimmed) return { data: [], error: null };

  const { data, error } = await supabase.rpc('coach_class_enrolled_students', {
    p_class_id: trimmed,
  });

  if (error) {
    console.error('fetchCoachClassRoster:', error.message);
    return { data: [], error: error.message };
  }

  return { data: await mapCoachClassRosterRows((data ?? []) as CoachClassRosterRow[]), error: null };
}

/** Waitlisted members for a coach-assigned class (`coach_class_waitlisted_students` RPC). */
export async function fetchCoachClassWaitlist(classId: string): Promise<{
  data: ClassPerson[];
  error: string | null;
}> {
  const trimmed = classId.trim();
  if (!trimmed) return { data: [], error: null };

  const { data, error } = await supabase.rpc('coach_class_waitlisted_students', {
    p_class_id: trimmed,
  });

  if (error) {
    console.error('fetchCoachClassWaitlist:', error.message);
    return { data: [], error: error.message };
  }

  return { data: await mapCoachClassRosterRows((data ?? []) as CoachClassRosterRow[]), error: null };
}

/** Member class calendar: only Active timeblocks from `classes.status_block`. */
export async function fetchClassesForMemberSchedule(): Promise<{
  data: ClassDisplay[];
  error: string | null;
}> {
  return fetchClassesForAdmin({ statusBlock: 'active' });
}

export async function fetchClassesForAdmin(options?: {
  statusBlock?: ClassBlockStatus;
}): Promise<{
  data: ClassDisplay[];
  error: string | null;
}> {
  let query = supabase
    .from('classes')
    .select('*')
    .order('starts_at', { ascending: true });
  if (options?.statusBlock) {
    query = query.eq('status_block', options.statusBlock);
  }
  const { data: classRows, error: classesError } = await query;

  if (classesError) {
    console.error('Failed to fetch classes:', classesError.message);
    return { data: [], error: classesError.message };
  }

  const classes = (classRows ?? []) as ClassRow[];
  if (classes.length === 0) {
    return { data: [], error: null };
  }

  const classIds = classes.map((row) => row.id);
  const disciplineIds = [...new Set(classes.map((row) => row.discipline_id).filter(Boolean))] as string[];

  const [
    { data: disciplineRows, error: disciplineError },
    { data: coachRows, error: coachError },
    { data: studentRows, error: studentError },
  ] = await Promise.all([
    disciplineIds.length > 0
      ? supabase.from('disciplines').select('id, name').in('id', disciplineIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('class_coaches').select('*').in('class_id', classIds),
    supabase.from('class_students').select('*').in('class_id', classIds),
  ]);

  if (disciplineError || coachError || studentError) {
    const message =
      disciplineError?.message || coachError?.message || studentError?.message || 'Failed to load class details.';
    console.error('Failed to fetch class relations:', message);
    return { data: [], error: message };
  }

  const disciplinesById = new Map(
    ((disciplineRows ?? []) as Pick<DisciplineRow, 'id' | 'name'>[]).map((row) => [row.id, row.name]),
  );
  const coaches = (coachRows ?? []) as ClassCoachRow[];
  const students = (studentRows ?? []) as ClassStudentRow[];

  const relatedAccountIds = [
    ...classes.map((row) => row.created_by),
    ...coaches.map((row) => row.account_id),
    ...students.map((row) => row.account_id),
  ];

  const [{ accountsById, profilesByAccountId }, coachDirectory] = await Promise.all([
    fetchAccountsAndProfiles(relatedAccountIds),
    fetchCoachDirectoryByAccountId(),
  ]);

  const coachesByClass = new Map<string, ClassPerson[]>();
  for (const row of coaches) {
    let person = personLabel(
      accountsById.get(row.account_id),
      profilesByAccountId.get(row.account_id),
      row.coach_confirmation ?? false,
    );
    if (!person) {
      person = await coachPersonFromDirectory(
        row.account_id,
        row.coach_confirmation ?? false,
        coachDirectory,
      );
    } else {
      const fromDirectory = coachDirectory.get(row.account_id);
      if (fromDirectory) {
        let photo = person.photo ?? fromDirectory.photo;
        if (!photo && fromDirectory.authUserId) {
          const bucket = await loadProfileImageUrlsForUser(fromDirectory.authUserId);
          photo = bucket.photo || photo;
        }
        person = {
          ...person,
          name: person.name || fromDirectory.name,
          photo: photo || undefined,
        };
      }
    }
    if (!person) continue;
    const list = coachesByClass.get(row.class_id) ?? [];
    list.push(person);
    coachesByClass.set(row.class_id, list);
  }

  const studentsByClass = new Map<string, ClassPerson[]>();
  for (const row of students) {
    const person = personLabel(accountsById.get(row.account_id), profilesByAccountId.get(row.account_id));
    if (!person) continue;
    const list = studentsByClass.get(row.class_id) ?? [];
    list.push(person);
    studentsByClass.set(row.class_id, list);
  }

  const data = classes.map((row) => {
    const classCoaches = (coachesByClass.get(row.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    const classStudents = (studentsByClass.get(row.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    const creator = personLabel(
      accountsById.get(row.created_by),
      profilesByAccountId.get(row.created_by),
    );

    return {
      id: row.id,
      uid: row.uid ?? '',
      name: row.name,
      description: row.description,
      disciplineId: row.discipline_id,
      disciplineName: row.discipline_id ? (disciplinesById.get(row.discipline_id) ?? '—') : '—',
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      classLimit: row.class_limit,
      statusClass: row.status_class,
      statusBlock: row.status_block,
      createdBy: row.created_by,
      createdByName: creator?.name ?? '—',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      coaches: classCoaches,
      students: classStudents,
      enrolledCount: classStudents.length,
    };
  });

  return { data, error: null };
}

export async function createClass(
  input: ClassUpsertInput,
  options?: { scheduleBlockOnly?: boolean },
): Promise<{ success: boolean; id: string | null; error: string | null }> {
  const validationError = options?.scheduleBlockOnly
    ? validateScheduleBlockInput(input)
    : validateFullClassInput(input);
  if (validationError) {
    return { success: false, id: null, error: validationError };
  }

  const { data, error } = await supabase.rpc('admin_create_class', {
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_class_limit: input.classLimit,
    p_status_class: input.statusClass,
    p_status_block: input.statusBlock,
    p_name: input.name.trim(),
    p_description: input.description.trim(),
    p_discipline_id: input.disciplineId,
    p_coach_account_ids: input.coachAccountIds,
    p_student_account_ids: input.studentAccountIds,
  });

  if (error) {
    console.error('Failed to create class:', error.message);
    return { success: false, id: null, error: error.message };
  }

  return { success: true, id: data as string, error: null };
}

export async function updateClass(
  classId: string,
  input: ClassUpsertInput,
  options?: { scheduleBlockOnly?: boolean },
): Promise<{ success: boolean; error: string | null }> {
  const validationError = options?.scheduleBlockOnly
    ? validateScheduleBlockInput(input)
    : validateFullClassInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { error } = await supabase.rpc('admin_update_class', {
    p_class_id: classId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_class_limit: input.classLimit,
    p_status_class: input.statusClass,
    p_status_block: input.statusBlock,
    p_name: input.name.trim(),
    p_description: input.description.trim(),
    p_discipline_id: input.disciplineId,
    p_coach_account_ids: input.coachAccountIds,
    p_student_account_ids: input.studentAccountIds,
  });

  if (error) {
    console.error('Failed to update class:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function deleteClass(
  classId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_class', {
    p_class_id: classId,
  });

  if (error) {
    console.error('Failed to delete class:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export function classToUpsertInput(row: ClassDisplay): ClassUpsertInput {
  return {
    name: row.name,
    description: row.description,
    disciplineId: row.disciplineId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    classLimit: row.classLimit,
    statusClass: row.statusClass,
    statusBlock: row.statusBlock,
    coachAccountIds: row.coaches.map((coach) => coach.accountId),
    studentAccountIds: row.students.map((student) => student.accountId),
  };
}

export function formatClassDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export type MemberClassListStatus =
  | 'confirmed'
  | 'waitlisted'
  | 'pending'
  | 'completed'
  | 'cancelled';

export interface MemberEnrolledClassItem {
  id: string;
  className: string;
  disciplineId: string | null;
  disciplineName: string;
  startsAt: string;
  endsAt: string | null;
  coachLabel: string;
  location: string;
  status: MemberClassListStatus;
  sortAt: string;
}

type ClassRowForMemberList = Pick<
  ClassRow,
  'id' | 'name' | 'starts_at' | 'ends_at' | 'status_class' | 'status_block' | 'discipline_id'
> & {
  disciplines: { name: string } | { name: string }[] | null;
};

function resolveMemberClassStatus(
  row: ClassRowForMemberList,
  kind: 'enrolled' | 'waitlist',
  paymentStatus: 'pending' | 'approved' | 'rejected' | null,
  nowMs: number,
): MemberClassListStatus {
  const startMs = new Date(row.starts_at).getTime();
  const endMs = row.ends_at ? new Date(row.ends_at).getTime() : startMs;
  const sessionEnded = Number.isFinite(endMs) && endMs < nowMs;

  if (kind === 'waitlist') {
    if (paymentStatus === 'pending') return 'pending';
    return 'waitlisted';
  }

  if (sessionEnded) {
    if (row.status_class === 'close' || row.status_block === 'closed') {
      return 'cancelled';
    }
    return 'completed';
  }

  return 'confirmed';
}

async function coachLabelsForClassIds(classIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (classIds.length === 0) return result;

  const { data: coachRows } = await supabase
    .from('class_coaches')
    .select('class_id, account_id')
    .in('class_id', classIds);

  const coachDirectory = await fetchCoachDirectoryByAccountId();
  const accountIds = [...new Set((coachRows ?? []).map((r) => r.account_id as string))];
  const { profilesByAccountId } = await fetchAccountsAndProfiles(accountIds);

  for (const row of coachRows ?? []) {
    const classId = row.class_id as string;
    const accountId = row.account_id as string;
    const fromProfile = profilesByAccountId.get(accountId);
    const fromDirectory = coachDirectory.get(accountId);
    const name =
      fromProfile?.name?.trim()
      || fromDirectory?.name
      || 'Coach';
    const prev = result.get(classId);
    result.set(classId, prev ? `${prev}, ${name}` : name);
  }

  return result;
}

/** Classes the signed-in member is enrolled in or waitlisted for (via payment). */
export async function fetchMemberEnrolledClasses(): Promise<{
  data: MemberEnrolledClassItem[];
  error: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { data: [], error: userError?.message ?? 'Not signed in.' };
  }

  const { data: accountRow, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (accountError) {
    console.error('fetchMemberEnrolledClasses account:', accountError.message);
    return { data: [], error: accountError.message };
  }

  const accountId = accountRow?.id;
  if (!accountId) {
    return { data: [], error: null };
  }

  const [enrollmentsRes, waitlistRes] = await Promise.all([
    supabase
      .from('class_students')
      .select('class_id, enrolled_at')
      .eq('account_id', accountId)
      .order('enrolled_at', { ascending: false }),
    supabase
      .from('class_waitlist')
      .select('class_id, joined_at, payment_id')
      .eq('account_id', accountId)
      .order('joined_at', { ascending: false }),
  ]);

  if (enrollmentsRes.error) {
    console.error('fetchMemberEnrolledClasses enrollments:', enrollmentsRes.error.message);
    return { data: [], error: enrollmentsRes.error.message };
  }
  if (waitlistRes.error) {
    console.error('fetchMemberEnrolledClasses waitlist:', waitlistRes.error.message);
    return { data: [], error: waitlistRes.error.message };
  }

  const enrolledClassIds = new Set(
    (enrollmentsRes.data ?? []).map((row) => row.class_id as string),
  );

  const waitlistRows = (waitlistRes.data ?? []).filter(
    (row) => !enrolledClassIds.has(row.class_id as string),
  );

  const paymentIds = [
    ...new Set(waitlistRows.map((row) => row.payment_id as string).filter(Boolean)),
  ];
  const paymentStatusById = new Map<string, 'pending' | 'approved' | 'rejected'>();

  if (paymentIds.length > 0) {
    const { data: payments } = await supabase
      .from('class_payments')
      .select('id, status')
      .in('id', paymentIds);
    for (const payment of payments ?? []) {
      paymentStatusById.set(payment.id as string, payment.status as 'pending' | 'approved' | 'rejected');
    }
  }

  const classIds = [
    ...new Set([
      ...(enrollmentsRes.data ?? []).map((row) => row.class_id as string),
      ...waitlistRows.map((row) => row.class_id as string),
    ]),
  ];

  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: classRows, error: classError } = await supabase
    .from('classes')
    .select(
      'id, name, starts_at, ends_at, status_class, status_block, discipline_id, disciplines ( name )',
    )
    .in('id', classIds);

  if (classError) {
    console.error('fetchMemberEnrolledClasses classes:', classError.message);
    return { data: [], error: classError.message };
  }

  const classById = new Map(
    (classRows ?? []).map((row) => [row.id as string, row as ClassRowForMemberList]),
  );
  const coachByClass = await coachLabelsForClassIds(classIds);
  const nowMs = Date.now();

  const items: MemberEnrolledClassItem[] = [];

  for (const enrollment of enrollmentsRes.data ?? []) {
    const classId = enrollment.class_id as string;
    const row = classById.get(classId);
    if (!row) continue;
    const disciplineJoin = row.disciplines;
    const disciplineName = Array.isArray(disciplineJoin)
      ? disciplineJoin[0]?.name ?? '—'
      : disciplineJoin?.name ?? '—';

    items.push({
      id: classId,
      className: row.name?.trim() || 'Class',
      disciplineId: row.discipline_id ?? null,
      disciplineName,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      coachLabel: coachByClass.get(classId) ?? '—',
      location: 'Main studio',
      status: resolveMemberClassStatus(row, 'enrolled', null, nowMs),
      sortAt: row.starts_at,
    });
  }

  for (const waitRow of waitlistRows) {
    const classId = waitRow.class_id as string;
    const row = classById.get(classId);
    if (!row) continue;
    const paymentStatus = paymentStatusById.get(waitRow.payment_id as string) ?? 'pending';
    const disciplineJoin = row.disciplines;
    const disciplineName = Array.isArray(disciplineJoin)
      ? disciplineJoin[0]?.name ?? '—'
      : disciplineJoin?.name ?? '—';

    items.push({
      id: `${classId}-waitlist`,
      className: row.name?.trim() || 'Class',
      disciplineId: row.discipline_id ?? null,
      disciplineName,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      coachLabel: coachByClass.get(classId) ?? '—',
      location: 'Main studio',
      status: resolveMemberClassStatus(row, 'waitlist', paymentStatus, nowMs),
      sortAt: row.starts_at,
    });
  }

  items.sort(
    (a, b) => new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime(),
  );

  return { data: items, error: null };
}

/** Strip waitlist suffix from list item ids. */
export function memberEnrolledClassId(item: MemberEnrolledClassItem): string {
  return item.id.replace(/-waitlist$/, '');
}

async function memberClassRegistrationKind(
  accountId: string,
  classId: string,
): Promise<{ kind: 'enrolled' | 'waitlisted' | null; error: string | null }> {
  const [enrollmentRes, waitlistRes] = await Promise.all([
    supabase
      .from('class_students')
      .select('class_id')
      .eq('class_id', classId)
      .eq('account_id', accountId)
      .maybeSingle(),
    supabase
      .from('class_waitlist')
      .select('class_id')
      .eq('class_id', classId)
      .eq('account_id', accountId)
      .maybeSingle(),
  ]);

  if (enrollmentRes.error) {
    return { kind: null, error: enrollmentRes.error.message };
  }
  if (waitlistRes.error) {
    return { kind: null, error: waitlistRes.error.message };
  }

  if (enrollmentRes.data) {
    return { kind: 'enrolled', error: null };
  }
  if (waitlistRes.data) {
    return { kind: 'waitlisted', error: null };
  }
  return { kind: null, error: null };
}

export interface MemberMyClassDetail {
  classId: string;
  uid: string;
  name: string;
  description: string;
  disciplineName: string;
  disciplineLogoUrl: string;
  startsAt: string;
  endsAt: string | null;
  statusClass: ClassOpenStatus;
  statusBlock: ClassBlockStatus;
  classLimit: number | null;
  enrolledCount: number;
  coaches: ClassPerson[];
}

/** Full session info for a class the member is enrolled in or waitlisted for (no student roster). */
export async function fetchMemberMyClassDetail(classId: string): Promise<{
  data: MemberMyClassDetail | null;
  error: string | null;
}> {
  const trimmedId = classId.trim();
  if (!trimmedId) {
    return { data: null, error: 'Class not found.' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { data: null, error: userError?.message ?? 'Not signed in.' };
  }

  const { data: accountRow, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (accountError) {
    console.error('fetchMemberMyClassDetail account:', accountError.message);
    return { data: null, error: accountError.message };
  }

  const accountId = accountRow?.id;
  if (!accountId) {
    return { data: null, error: 'Account not found.' };
  }

  const registration = await memberClassRegistrationKind(accountId, trimmedId);
  if (registration.error) {
    console.error('fetchMemberMyClassDetail registration:', registration.error);
    return { data: null, error: registration.error };
  }
  if (!registration.kind) {
    return { data: null, error: 'You do not have access to this class.' };
  }

  const { data: classRow, error: classError } = await supabase
    .from('classes')
    .select(
      'id, uid, name, description, starts_at, ends_at, class_limit, status_class, status_block, discipline_id, disciplines ( name, logo_url )',
    )
    .eq('id', trimmedId)
    .maybeSingle();

  if (classError) {
    console.error('fetchMemberMyClassDetail class:', classError.message);
    return { data: null, error: classError.message };
  }
  if (!classRow) {
    return { data: null, error: 'Class not found.' };
  }

  const disciplineJoin = classRow.disciplines as
    | { name: string; logo_url?: string | null }
    | { name: string; logo_url?: string | null }[]
    | null;
  const disciplineMeta = Array.isArray(disciplineJoin) ? disciplineJoin[0] : disciplineJoin;
  const disciplineName = disciplineMeta?.name?.trim() || '—';
  const disciplineLogoUrl =
    disciplineMeta?.logo_url?.trim() || getDisciplinePlaceholderLogo(disciplineName);

  const [{ data: coachRows, error: coachError }, { count: enrolledCount, error: countError }] =
    await Promise.all([
      supabase.from('class_coaches').select('*').eq('class_id', trimmedId),
      supabase
        .from('class_students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', trimmedId),
    ]);

  if (coachError) {
    console.error('fetchMemberMyClassDetail coaches:', coachError.message);
    return { data: null, error: coachError.message };
  }
  if (countError) {
    console.error('fetchMemberMyClassDetail enrolled count:', countError.message);
    return { data: null, error: countError.message };
  }

  const coachDirectory = await fetchCoachDirectoryByAccountId();
  const coachAccountIds = (coachRows ?? []).map((row) => row.account_id as string);
  const { accountsById, profilesByAccountId } = await fetchAccountsAndProfiles(coachAccountIds);

  const coaches: ClassPerson[] = [];
  for (const row of (coachRows ?? []) as ClassCoachRow[]) {
    let person = personLabel(
      accountsById.get(row.account_id),
      profilesByAccountId.get(row.account_id),
      row.coach_confirmation ?? false,
    );
    if (!person) {
      person = await coachPersonFromDirectory(
        row.account_id,
        row.coach_confirmation ?? false,
        coachDirectory,
      );
    } else {
      const fromDirectory = coachDirectory.get(row.account_id);
      if (fromDirectory) {
        let photo = person.photo ?? fromDirectory.photo;
        if (!photo && fromDirectory.authUserId) {
          const bucket = await loadProfileImageUrlsForUser(fromDirectory.authUserId);
          photo = bucket.photo || photo;
        }
        person = {
          ...person,
          name: person.name || fromDirectory.name,
          photo: photo || undefined,
        };
      }
    }
    if (person) coaches.push(person);
  }
  coaches.sort((a, b) => a.name.localeCompare(b.name));

  return {
    data: {
      classId: classRow.id as string,
      uid: (classRow.uid as string) ?? '',
      name: (classRow.name as string)?.trim() || 'Class',
      description: (classRow.description as string)?.trim() ?? '',
      disciplineName,
      disciplineLogoUrl,
      startsAt: classRow.starts_at as string,
      endsAt: (classRow.ends_at as string | null) ?? null,
      statusClass: classRow.status_class as ClassOpenStatus,
      statusBlock: classRow.status_block as ClassBlockStatus,
      classLimit: classRow.class_limit as number | null,
      enrolledCount: enrolledCount ?? 0,
      coaches,
    },
    error: null,
  };
}

/** Classes where the staff account is assigned as coach (`class_coaches`). */
export async function fetchStaffAssignedClasses(accountId: string): Promise<{
  data: MemberEnrolledClassItem[];
  error: string | null;
}> {
  if (!accountId) {
    return { data: [], error: null };
  }

  const { data: coachRows, error: coachError } = await supabase
    .from('class_coaches')
    .select('class_id')
    .eq('account_id', accountId);

  if (coachError) {
    console.error('fetchStaffAssignedClasses assignments:', coachError.message);
    return { data: [], error: coachError.message };
  }

  const classIds = [...new Set((coachRows ?? []).map((row) => row.class_id as string))];
  if (classIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: classRows, error: classError } = await supabase
    .from('classes')
    .select(
      'id, name, starts_at, ends_at, status_class, status_block, discipline_id, disciplines ( name )',
    )
    .in('id', classIds);

  if (classError) {
    console.error('fetchStaffAssignedClasses classes:', classError.message);
    return { data: [], error: classError.message };
  }

  const coachByClass = await coachLabelsForClassIds(classIds);
  const nowMs = Date.now();

  const items: MemberEnrolledClassItem[] = (classRows ?? [])
    .map((row) => {
      const classRow = row as ClassRowForMemberList;
      const disciplineJoin = classRow.disciplines;
      const disciplineName = Array.isArray(disciplineJoin)
        ? disciplineJoin[0]?.name ?? '—'
        : disciplineJoin?.name ?? '—';

      return {
        id: classRow.id as string,
        className: classRow.name?.trim() || 'Class',
        disciplineId: classRow.discipline_id ?? null,
        disciplineName,
        startsAt: classRow.starts_at,
        endsAt: classRow.ends_at,
        coachLabel: coachByClass.get(classRow.id as string) ?? '—',
        location: 'Main studio',
        status: resolveMemberClassStatus(classRow, 'enrolled', null, nowMs),
        sortAt: classRow.starts_at,
      };
    })
    .sort((a, b) => new Date(a.sortAt).getTime() - new Date(b.sortAt).getTime());

  return { data: items, error: null };
}
