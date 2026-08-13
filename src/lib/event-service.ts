import { supabase } from './supabase';
import type {
  AccountRow,
  DisciplineRow,
  EventCoachRow,
  EventEnrollmentRow,
  EventRow,
  EventStatus,
  ProfileRow,
} from './database.types';

export interface EventPerson {
  accountId: string;
  name: string;
  email: string;
}

export interface EventDisplay {
  id: string;
  name: string;
  description: string;
  disciplineId: string;
  disciplineName: string;
  startsAt: string;
  endsAt: string | null;
  classLimit: number;
  status: EventStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  coaches: EventPerson[];
  enrollments: EventPerson[];
  enrolledCount: number;
}

export interface EventUpsertInput {
  name: string;
  description: string;
  disciplineId: string;
  startsAt: string;
  endsAt: string | null;
  classLimit: number;
  status: EventStatus;
  coachAccountIds: string[];
  enrollAccountIds: string[];
}

export const EVENT_STATUSES: EventStatus[] = ['draft', 'published', 'cancelled', 'completed'];

export function createEmptyEventDraft(): EventUpsertInput {
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
    enrollAccountIds: [],
  };
}

function personLabel(
  account: AccountRow | undefined,
  profile: ProfileRow | undefined,
): EventPerson | null {
  if (!account) return null;
  return {
    accountId: account.id,
    name: profile?.name?.trim() || profile?.display_name?.trim() || account.email,
    email: account.email,
  };
}

function validateUpsertInput(input: EventUpsertInput): string | null {
  if (!input.name.trim()) return 'Event name is required.';
  if (!input.disciplineId) return 'Choose a discipline tag.';
  if (!input.startsAt) return 'Event date/time is required.';
  if (!Number.isFinite(input.classLimit) || input.classLimit < 1) {
    return 'Class limit must be at least 1.';
  }
  if (input.coachAccountIds.length < 1) {
    return 'Assign at least one coach.';
  }
  if (input.enrollAccountIds.length > input.classLimit) {
    return `Cannot enroll ${input.enrollAccountIds.length} students; class limit is ${input.classLimit}.`;
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
  profilesByAccountId: Map<string, ProfileRow>;
}> {
  const uniqueIds = [...new Set(accountIds.filter(Boolean))];
  const accountsById = new Map<string, AccountRow>();
  const profilesByAccountId = new Map<string, ProfileRow>();

  if (uniqueIds.length === 0) {
    return { accountsById, profilesByAccountId };
  }

  const [{ data: accounts }, { data: profiles }] = await Promise.all([
    supabase.from('accounts').select('*').in('id', uniqueIds),
    supabase.from('profiles').select('*').in('account_id', uniqueIds),
  ]);

  for (const account of accounts ?? []) {
    accountsById.set(account.id, account);
  }
  for (const profile of profiles ?? []) {
    profilesByAccountId.set(profile.account_id, profile);
  }

  return { accountsById, profilesByAccountId };
}

export async function fetchEventsForAdmin(): Promise<{
  data: EventDisplay[];
  error: string | null;
}> {
  const { data: eventRows, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true });

  if (eventsError) {
    console.error('Failed to fetch events:', eventsError.message);
    return { data: [], error: eventsError.message };
  }

  const events = (eventRows ?? []) as EventRow[];
  if (events.length === 0) {
    return { data: [], error: null };
  }

  const eventIds = events.map((event) => event.id);
  const disciplineIds = [...new Set(events.map((event) => event.discipline_id))];

  const [
    { data: disciplineRows, error: disciplineError },
    { data: coachRows, error: coachError },
    { data: enrollmentRows, error: enrollmentError },
  ] = await Promise.all([
    supabase.from('disciplines').select('id, name').in('id', disciplineIds),
    supabase.from('event_coaches').select('*').in('event_id', eventIds),
    supabase.from('event_enrollments').select('*').in('event_id', eventIds),
  ]);

  if (disciplineError || coachError || enrollmentError) {
    const message =
      disciplineError?.message || coachError?.message || enrollmentError?.message || 'Failed to load event details.';
    console.error('Failed to fetch event relations:', message);
    return { data: [], error: message };
  }

  const disciplinesById = new Map(
    ((disciplineRows ?? []) as Pick<DisciplineRow, 'id' | 'name'>[]).map((row) => [row.id, row.name]),
  );
  const coaches = (coachRows ?? []) as EventCoachRow[];
  const enrollments = (enrollmentRows ?? []) as EventEnrollmentRow[];

  const relatedAccountIds = [
    ...events.map((event) => event.created_by),
    ...coaches.map((row) => row.account_id),
    ...enrollments.map((row) => row.account_id),
  ];

  const { accountsById, profilesByAccountId } = await fetchAccountsAndProfiles(relatedAccountIds);

  const coachesByEvent = new Map<string, EventPerson[]>();
  for (const row of coaches) {
    const person = personLabel(accountsById.get(row.account_id), profilesByAccountId.get(row.account_id));
    if (!person) continue;
    const list = coachesByEvent.get(row.event_id) ?? [];
    list.push(person);
    coachesByEvent.set(row.event_id, list);
  }

  const enrollmentsByEvent = new Map<string, EventPerson[]>();
  for (const row of enrollments) {
    const person = personLabel(accountsById.get(row.account_id), profilesByAccountId.get(row.account_id));
    if (!person) continue;
    const list = enrollmentsByEvent.get(row.event_id) ?? [];
    list.push(person);
    enrollmentsByEvent.set(row.event_id, list);
  }

  const data = events.map((event) => {
    const eventCoaches = (coachesByEvent.get(event.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    const eventEnrollments = (enrollmentsByEvent.get(event.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    const creator = personLabel(
      accountsById.get(event.created_by),
      profilesByAccountId.get(event.created_by),
    );

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      disciplineId: event.discipline_id,
      disciplineName: disciplinesById.get(event.discipline_id) ?? '—',
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      classLimit: event.class_limit,
      status: event.status,
      createdBy: event.created_by,
      createdByName: creator?.name ?? '—',
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      coaches: eventCoaches,
      enrollments: eventEnrollments,
      enrolledCount: eventEnrollments.length,
    };
  });

  return { data, error: null };
}

export async function createEvent(
  input: EventUpsertInput,
): Promise<{ success: boolean; id: string | null; error: string | null }> {
  const validationError = validateUpsertInput(input);
  if (validationError) {
    return { success: false, id: null, error: validationError };
  }

  const { data, error } = await supabase.rpc('admin_create_event', {
    p_name: input.name.trim(),
    p_discipline_id: input.disciplineId,
    p_starts_at: input.startsAt,
    p_class_limit: input.classLimit,
    p_coach_account_ids: input.coachAccountIds,
    p_status: input.status,
    p_description: input.description.trim(),
    p_ends_at: input.endsAt,
    p_enroll_account_ids: input.enrollAccountIds,
  });

  if (error) {
    console.error('Failed to create event:', error.message);
    return { success: false, id: null, error: error.message };
  }

  return { success: true, id: data as string, error: null };
}

export async function updateEvent(
  eventId: string,
  input: EventUpsertInput,
): Promise<{ success: boolean; error: string | null }> {
  const validationError = validateUpsertInput(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { error } = await supabase.rpc('admin_update_event', {
    p_event_id: eventId,
    p_name: input.name.trim(),
    p_discipline_id: input.disciplineId,
    p_starts_at: input.startsAt,
    p_class_limit: input.classLimit,
    p_coach_account_ids: input.coachAccountIds,
    p_status: input.status,
    p_description: input.description.trim(),
    p_ends_at: input.endsAt,
    p_enroll_account_ids: input.enrollAccountIds,
  });

  if (error) {
    console.error('Failed to update event:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function deleteEvent(
  eventId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_event', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('Failed to delete event:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export function eventToUpsertInput(event: EventDisplay): EventUpsertInput {
  return {
    name: event.name,
    description: event.description,
    disciplineId: event.disciplineId,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    classLimit: event.classLimit,
    status: event.status,
    coachAccountIds: event.coaches.map((coach) => coach.accountId),
    enrollAccountIds: event.enrollments.map((student) => student.accountId),
  };
}

export function formatEventDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
