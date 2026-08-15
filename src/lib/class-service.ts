import { supabase } from './supabase';
import type {
  AccountRow,
  ClassCoachRow,
  ClassRow,
  ClassStatus,
  ClassStudentRow,
  DisciplineRow,
  ProfileClientRow,
  ProfileStaffRow,
} from './database.types';

type ProfileNameRow = Pick<ProfileClientRow, 'account_id' | 'name'> & {
  display_name?: string;
};

export interface ClassPerson {
  accountId: string;
  name: string;
  email: string;
}

export interface ClassDisplay {
  id: string;
  name: string;
  description: string;
  disciplineId: string;
  disciplineName: string;
  startsAt: string;
  endsAt: string | null;
  classLimit: number;
  status: ClassStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  coaches: ClassPerson[];
  students: ClassPerson[];
  enrolledCount: number;
}

export interface ClassUpsertInput {
  name: string;
  description: string;
  disciplineId: string;
  startsAt: string;
  endsAt: string | null;
  classLimit: number;
  status: ClassStatus;
  coachAccountIds: string[];
  studentAccountIds: string[];
}

export const CLASS_STATUSES: ClassStatus[] = ['draft', 'published', 'cancelled', 'completed'];

export function createEmptyClassDraft(): ClassUpsertInput {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  return {
    name: '',
    description: '',
    disciplineId: '',
    startsAt: start.toISOString(),
    endsAt: null,
    classLimit: 12,
    status: 'draft',
    coachAccountIds: [],
    studentAccountIds: [],
  };
}

function personLabel(
  account: AccountRow | undefined,
  profile: ProfileNameRow | undefined,
): ClassPerson | null {
  if (!account) return null;
  return {
    accountId: account.id,
    name: profile?.name?.trim() || profile?.display_name?.trim() || account.email,
    email: account.email,
  };
}

function validateUpsertInput(input: ClassUpsertInput): string | null {
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

export async function fetchClassesForAdmin(): Promise<{
  data: ClassDisplay[];
  error: string | null;
}> {
  const { data: classRows, error: classesError } = await supabase
    .from('classes')
    .select('*')
    .order('starts_at', { ascending: true });

  if (classesError) {
    console.error('Failed to fetch classes:', classesError.message);
    return { data: [], error: classesError.message };
  }

  const classes = (classRows ?? []) as ClassRow[];
  if (classes.length === 0) {
    return { data: [], error: null };
  }

  const classIds = classes.map((row) => row.id);
  const disciplineIds = [...new Set(classes.map((row) => row.discipline_id))];

  const [
    { data: disciplineRows, error: disciplineError },
    { data: coachRows, error: coachError },
    { data: studentRows, error: studentError },
  ] = await Promise.all([
    supabase.from('disciplines').select('id, name').in('id', disciplineIds),
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

  const { accountsById, profilesByAccountId } = await fetchAccountsAndProfiles(relatedAccountIds);

  const coachesByClass = new Map<string, ClassPerson[]>();
  for (const row of coaches) {
    const person = personLabel(accountsById.get(row.account_id), profilesByAccountId.get(row.account_id));
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
      name: row.name,
      description: row.description,
      disciplineId: row.discipline_id,
      disciplineName: disciplinesById.get(row.discipline_id) ?? '—',
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      classLimit: row.class_limit,
      status: row.status,
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
): Promise<{ success: boolean; id: string | null; error: string | null }> {
  const validationError = validateUpsertInput(input);
  if (validationError) {
    return { success: false, id: null, error: validationError };
  }

  const { data, error } = await supabase.rpc('admin_create_class', {
    p_name: input.name.trim(),
    p_discipline_id: input.disciplineId,
    p_starts_at: input.startsAt,
    p_class_limit: input.classLimit,
    p_coach_account_ids: input.coachAccountIds,
    p_status: input.status,
    p_description: input.description.trim(),
    p_ends_at: input.endsAt,
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
): Promise<{ success: boolean; error: string | null }> {
  const validationError = validateUpsertInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { error } = await supabase.rpc('admin_update_class', {
    p_class_id: classId,
    p_name: input.name.trim(),
    p_discipline_id: input.disciplineId,
    p_starts_at: input.startsAt,
    p_class_limit: input.classLimit,
    p_coach_account_ids: input.coachAccountIds,
    p_status: input.status,
    p_description: input.description.trim(),
    p_ends_at: input.endsAt,
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
    status: row.status,
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
