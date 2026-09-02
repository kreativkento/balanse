export type UserRole = 'user' | 'coach' | 'admin' | 'dev' | 'frontdesk' | 'marketing';
/** Roles that use profiles_staff (never profiles_client). */
export type StaffUserRole = 'coach' | 'admin' | 'dev' | 'frontdesk' | 'marketing';
export const STAFF_USER_ROLES: StaffUserRole[] = [
  'coach',
  'admin',
  'dev',
  'frontdesk',
  'marketing',
];
export type ClassStatus = 'draft' | 'published' | 'cancelled' | 'completed';
/** @deprecated Use ClassStatus */
export type EventStatus = ClassStatus;
export type TicketType = 'bug' | 'feature' | 'support' | 'incident' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type LogAction =
  | 'insert'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_reset'
  | 'status_change'
  | 'approve'
  | 'reject'
  | 'refund'
  | 'assign'
  | 'unassign'
  | 'enroll'
  | 'unenroll'
  | 'view'
  | 'export'
  | 'error'
  | 'other';
export type SupportLogChannel = 'email' | 'chatbot' | 'ticket' | 'phone' | 'in_app' | 'other';
export type TransactionLogKind =
  | 'payment_submit'
  | 'payment_approve'
  | 'payment_reject'
  | 'refund'
  | 'subscription_charge'
  | 'credit_adjust'
  | 'promo_apply'
  | 'other';

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: AccountRow;
        Insert: {
          auth_user_id: string;
          email: string;
          role?: UserRole;
        };
        Update: Partial<AccountRow>;
      };
      profiles_client: {
        Row: ProfileClientRow;
        Insert: {
          account_id: string;
        } & Partial<Omit<ProfileClientRow, 'id' | 'account_id' | 'created_at' | 'updated_at'>>;
        Update: Partial<ProfileClientRow>;
      };
      profiles_staff: {
        Row: ProfileStaffRow;
        Insert: {
          account_id: string;
        } & Partial<Omit<ProfileStaffRow, 'id' | 'account_id' | 'created_at' | 'updated_at'>>;
        Update: Partial<ProfileStaffRow>;
      };
      disciplines: {
        Row: DisciplineRow;
        Insert: {
          name: string;
          slug: string;
        } & Partial<Omit<DisciplineRow, 'id' | 'name' | 'slug' | 'created_at' | 'updated_at'>>;
        Update: Partial<DisciplineRow>;
      };
      status_discipline: {
        Row: StatusDisciplineRow;
        Insert: {
          name: string;
          slug: string;
          hue: number;
        } & Partial<Omit<StatusDisciplineRow, 'id' | 'name' | 'slug' | 'hue' | 'created_at' | 'updated_at'>>;
        Update: Partial<StatusDisciplineRow>;
      };
      classes: {
        Row: ClassRow;
        Insert: {
          name: string;
          discipline_id: string;
          starts_at: string;
          created_by: string;
        } & Partial<Omit<ClassRow, 'id' | 'name' | 'discipline_id' | 'starts_at' | 'created_by' | 'created_at' | 'updated_at'>>;
        Update: Partial<ClassRow>;
      };
      class_coaches: {
        Row: ClassCoachRow;
        Insert: {
          class_id: string;
          account_id: string;
        } & Partial<Omit<ClassCoachRow, 'class_id' | 'account_id' | 'assigned_at'>>;
        Update: Partial<ClassCoachRow>;
      };
      class_students: {
        Row: ClassStudentRow;
        Insert: {
          class_id: string;
          account_id: string;
        } & Partial<Omit<ClassStudentRow, 'class_id' | 'account_id' | 'enrolled_at'>>;
        Update: Partial<ClassStudentRow>;
      };
      coach_disciplines: {
        Row: CoachDisciplineRow;
        Insert: {
          account_id: string;
          discipline_id: string;
        } & Partial<Omit<CoachDisciplineRow, 'account_id' | 'discipline_id' | 'tagged_at'>>;
        Update: Partial<CoachDisciplineRow>;
      };
      account_logs: {
        Row: AccountLogRow;
        Insert: Partial<AccountLogRow> & { action: LogAction };
        Update: never;
      };
      profile_logs: {
        Row: ProfileLogRow;
        Insert: Partial<ProfileLogRow> & { action: LogAction };
        Update: never;
      };
      transaction_logs: {
        Row: TransactionLogRow;
        Insert: Partial<TransactionLogRow> & { action: LogAction };
        Update: never;
      };
      customer_support_logs: {
        Row: CustomerSupportLogRow;
        Insert: Partial<CustomerSupportLogRow> & { action: LogAction };
        Update: never;
      };
      auth_logs: {
        Row: AuthLogRow;
        Insert: Partial<AuthLogRow> & { action: LogAction };
        Update: never;
      };
      event_logs: {
        Row: EventLogRow;
        Insert: Partial<EventLogRow> & { action: LogAction };
        Update: never;
      };
      enrollment_logs: {
        Row: EnrollmentLogRow;
        Insert: Partial<EnrollmentLogRow> & { action: LogAction };
        Update: never;
      };
      access_logs: {
        Row: AccessLogRow;
        Insert: Partial<AccessLogRow> & { resource_type: string };
        Update: never;
      };
      error_logs: {
        Row: ErrorLogRow;
        Insert: Partial<ErrorLogRow> & { message: string };
        Update: never;
      };
      tickets: {
        Row: TicketRow;
        Insert: {
          title: string;
          creator_account_id: string;
        } & Partial<Omit<TicketRow, 'id' | 'title' | 'creator_account_id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<TicketRow, 'id' | 'created_at'>>;
      };
      ticket_logs: {
        Row: TicketLogRow;
        Insert: Partial<TicketLogRow> & { action: LogAction };
        Update: never;
      };
    };
    Functions: {
      admin_delete_managed_account: {
        Args: { p_account_id: string };
        Returns: undefined;
      };
      admin_create_staff_account: {
        Args: {
          p_email: string;
          p_password: string;
          p_name?: string;
          p_specialty?: string;
          p_staff_type?: string;
        };
        Returns: string;
      };
      set_coach_disciplines: {
        Args: {
          p_account_id: string;
          p_discipline_ids: string[];
        };
        Returns: undefined;
      };
      admin_create_class: {
        Args: {
          p_name: string;
          p_discipline_id: string;
          p_starts_at: string;
          p_class_limit: number;
          p_coach_account_ids: string[];
          p_status?: ClassStatus;
          p_description?: string;
          p_ends_at?: string | null;
          p_student_account_ids?: string[];
        };
        Returns: string;
      };
      admin_update_class: {
        Args: {
          p_class_id: string;
          p_name: string;
          p_discipline_id: string;
          p_starts_at: string;
          p_class_limit: number;
          p_coach_account_ids: string[];
          p_status: ClassStatus;
          p_description?: string;
          p_ends_at?: string | null;
          p_student_account_ids?: string[] | null;
        };
        Returns: undefined;
      };
      admin_delete_class: {
        Args: { p_class_id: string };
        Returns: undefined;
      };
      coach_directory_images: {
        Args: Record<string, never>;
        Returns: {
          first_name: string;
          photo: string;
          cover_image: string;
          auth_user_id: string;
        }[];
      };
      coach_directory: {
        Args: Record<string, never>;
        Returns: {
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
          legacy_classes: string[];
          discipline_names: string[];
        }[];
      };
    };
  };
}

export interface AccountRow {
  id: string;
  auth_user_id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProfileClientRow {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  middle_initial: string;
  name: string;
  birthday: string | null;
  sex: string;
  phone: string;
  nationality: string;
  address: string;
  weight: string;
  height: string;
  medical_history: string;
  health_declaration_signed: boolean;
  terms_accepted: boolean;
  share_availability: boolean;
  profile_complete: boolean;
  photo: string;
  cover_image: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileStaffRow {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  middle_initial: string;
  name: string;
  phone: string;
  nationality: string;
  display_name: string;
  photo: string;
  cover_image: string;
  bio: string;
  experience: string;
  /** @deprecated Legacy free-text labels. Prefer coach_disciplines → disciplines.id */
  classes: string[];
  staff_type: string;
  created_at: string;
  updated_at: string;
}

/** Coach specialty tags: many disciplines per coach account (role = coach). */
export interface CoachDisciplineRow {
  account_id: string;
  discipline_id: string;
  tagged_at: string;
  tagged_by: string | null;
}

/** @deprecated Use ProfileClientRow or ProfileStaffRow */
export type ProfileRow = ProfileClientRow | ProfileStaffRow;
/** @deprecated Use ProfileClientRow */
export type ProfileStudentRow = ProfileClientRow;

export interface AccountWithClientProfile {
  account: AccountRow;
  profile: ProfileClientRow;
}

export interface AccountWithStaffProfile {
  account: AccountRow;
  profile: ProfileStaffRow;
}

/** @deprecated Use AccountWithClientProfile */
export type AccountWithStudentProfile = AccountWithClientProfile;

export type AccountWithProfile = AccountWithClientProfile | AccountWithStaffProfile;

export function isStaffUserRole(role: UserRole): role is StaffUserRole {
  return (
    role === 'coach'
    || role === 'admin'
    || role === 'dev'
    || role === 'frontdesk'
    || role === 'marketing'
  );
}

export function hasAdminPrivileges(role: UserRole): boolean {
  return role === 'admin' || role === 'frontdesk' || role === 'marketing' || role === 'dev';
}

export interface DisciplineRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  image_url: string;
  sort_order: number;
  status_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusDisciplineRow {
  id: string;
  name: string;
  slug: string;
  hue: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  description: string;
  discipline_id: string;
  starts_at: string;
  ends_at: string | null;
  class_limit: number;
  status: ClassStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use ClassRow */
export type EventRow = ClassRow;

export interface ClassCoachRow {
  class_id: string;
  account_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface CoachDisciplineTag {
  disciplineId: string;
  name: string;
  slug: string;
}

/** @deprecated Use ClassCoachRow */
export type EventCoachRow = ClassCoachRow & { event_id?: string };

export interface ClassStudentRow {
  class_id: string;
  account_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
}

/** @deprecated Use ClassStudentRow */
export type EventEnrollmentRow = ClassStudentRow & { event_id?: string };

interface SystemLogBase {
  id: string;
  occurred_at: string;
  action: LogAction;
  actor_account_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  metadata: Record<string, unknown>;
  source: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AccountLogRow extends SystemLogBase {
  account_id: string | null;
  account_email: string | null;
  account_role: UserRole | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown>;
}

export interface ProfileLogRow extends SystemLogBase {
  profile_id: string | null;
  account_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown>;
}

export interface TransactionLogRow extends SystemLogBase {
  kind: TransactionLogKind;
  transaction_ref: string | null;
  payment_id: string | null;
  subscription_id: string | null;
  account_id: string | null;
  account_email: string | null;
  amount_centavos: number | null;
  currency: string;
  method: string | null;
  status_from: string | null;
  status_to: string | null;
  external_ref: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown>;
}

export interface CustomerSupportLogRow extends SystemLogBase {
  channel: SupportLogChannel;
  ticket_id: string | null;
  ticket_ref: string | null;
  subject: string | null;
  status_from: string | null;
  status_to: string | null;
  requester_account_id: string | null;
  requester_email: string | null;
  assignee_account_id: string | null;
  message_preview: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown>;
}

export interface AuthLogRow {
  id: string;
  occurred_at: string;
  action: LogAction;
  account_id: string | null;
  email: string | null;
  success: boolean;
  failure_reason: string | null;
  actor_account_id: string | null;
  metadata: Record<string, unknown>;
  source: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface EventLogRow extends SystemLogBase {
  class_id: string | null;
  event_name: string | null;
  discipline_id: string | null;
  status_from: string | null;
  status_to: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown>;
}

export interface EnrollmentLogRow {
  id: string;
  occurred_at: string;
  action: LogAction;
  class_id: string | null;
  student_account_id: string | null;
  coach_account_id: string | null;
  actor_account_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  source: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface AccessLogRow {
  id: string;
  occurred_at: string;
  action: LogAction;
  resource_type: string;
  resource_id: string | null;
  resource_label: string | null;
  actor_account_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  route: string | null;
  metadata: Record<string, unknown>;
  source: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ErrorLogRow {
  id: string;
  occurred_at: string;
  action: LogAction;
  severity: string;
  code: string | null;
  message: string;
  stack: string | null;
  route: string | null;
  rpc_name: string | null;
  actor_account_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  metadata: Record<string, unknown>;
  source: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface TicketRow {
  id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  level: number;
  image_url: string | null;
  status: TicketStatus;
  creator_account_id: string;
  creator_email: string;
  assignee_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketLogRow {
  id: string;
  occurred_at: string;
  action: LogAction;
  ticket_id: string | null;
  title: string | null;
  description: string | null;
  type: TicketType | null;
  priority: TicketPriority | null;
  level: number | null;
  image_url: string | null;
  status: TicketStatus | null;
  creator_account_id: string | null;
  creator_email: string | null;
  actor_account_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  source: string;
}
