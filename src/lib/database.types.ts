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
export type FeedbackLabel = 'positive' | 'bug' | 'feature' | 'question' | 'improvement';
export type FeedbackStatus = 'unresolved' | 'in_progress' | 'resolved';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';
export type BulletinPostType = 'Event' | 'Promo' | 'Announcement' | 'Update';
export type BulletinVisibility =
  | 'public'
  | 'private'
  | 'staff'
  | 'user'
  | 'coach'
  | 'marketing'
  | 'frontdesk';
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
export type LogSystemTableName =
  | 'accounts'
  | 'profiles_client'
  | 'profiles_staff'
  | 'disciplines'
  | 'coach_disciplines'
  | 'classes'
  | 'class_students'
  | 'class_coaches'
  | 'bulletin_posts'
  | 'feedback_system';

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
      log_system: {
        Row: LogSystemRow;
        Insert: Partial<LogSystemRow> & { action: LogAction; table_name: string };
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
      feedback_system: {
        Row: FeedbackRow;
        Insert: {
          title: string;
          description: string;
          label: FeedbackLabel;
          account_id: string;
        } & Partial<Omit<FeedbackRow, 'title' | 'description' | 'label' | 'account_id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<FeedbackRow, 'id' | 'created_at' | 'account_id'>>;
      };
      bulletin_posts: {
        Row: BulletinPostRow;
        Insert: {
          title: string;
          body: string;
          category: BulletinPostType;
        } & Partial<Omit<BulletinPostRow, 'id' | 'title' | 'body' | 'category' | 'is_public' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<BulletinPostRow, 'id' | 'is_public' | 'created_at'>>;
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
  nickname: string;
  name: string;
  birthday: string | null;
  sex: string;
  phone: string;
  phone_valid: boolean;
  nationality: string;
  province: string | null;
  city: string | null;
  barangay: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relationship: string | null;
  weight: string;
  height: string;
  health_declaration: string;
  health_declaration_document_path: string | null;
  health_declaration_signed_at: string | null;
  health_valid: boolean;
  terms_accepted: boolean;
  terms_document_path: string | null;
  terms_accepted_version: string | null;
  terms_signed_at: string | null;
  terms_valid: boolean;
  privacy_policy_document_path: string | null;
  privacy_accepted_version: string | null;
  privacy_signed_at: string | null;
  privacy_valid: boolean;
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
  status: string;
  status_name: string;
  status_hue: number;
  is_active: boolean;
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

export interface LogSystemRow {
  id: string;
  occurred_at: string;
  action: LogAction;
  table_name: string;
  record_id: string;
  record_label: string | null;
  account_id: string | null;
  actor_account_id: string | null;
  actor_email: string | null;
  actor_role: UserRole | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  changed_fields: Record<string, unknown>;
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

export interface BulletinPostRow {
  id: string;
  uid: string;
  title: string;
  body: string;
  category: BulletinPostType;
  visibility: BulletinVisibility;
  is_public: boolean;
  admin_approved: boolean;
  pinned: boolean;
  image_path: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  created_by: string | null;
  created_at: string;
  posted_at: string;
  active_until: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface FeedbackRow {
  id: string;
  account_id: string;
  title: string;
  description: string;
  label: FeedbackLabel;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  ticket_level: number;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
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
