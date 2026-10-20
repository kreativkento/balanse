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
/** @deprecated Legacy lifecycle enum; use ClassOpenStatus + ClassBlockStatus. */
export type ClassStatus = 'draft' | 'published' | 'cancelled' | 'completed';
/** @deprecated Use ClassOpenStatus */
export type EventStatus = ClassStatus;
/** True when the class is open for enrollment (`classes.status_class`). */
export type ClassStatusClass = boolean;
export type ClassBlockStatus =
  | 'vacant'
  | 'assigned'
  | 'active'
  | 'completed'
  | 'cancelled';
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
export type GalleryTag = 'Studio' | 'Classes' | 'Events' | 'Community' | 'Amenities';
export type GalleryMediaKind = 'image' | 'video';
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
      staff_availability: {
        Row: StaffAvailabilityRow;
        Insert: {
          account_id: string;
          availability_date: string;
        } & Partial<Omit<StaffAvailabilityRow, 'id' | 'account_id' | 'availability_date' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<StaffAvailabilityRow, 'id' | 'account_id' | 'created_at'>>;
      };
      portal_requests: {
        Row: PortalRequestRow;
        Insert: never;
        Update: never;
      };
      gallery_posts: {
        Row: GalleryPostRow;
        Insert: {
          caption: string;
          tag: GalleryTag;
        } & Partial<Omit<GalleryPostRow, 'id' | 'caption' | 'tag' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<GalleryPostRow, 'id' | 'created_at'>>;
      };
      studio_amenities_config: {
        Row: StudioAmenitiesConfigRow;
        Insert: {
          id?: number;
          selected_labels?: string[];
        } & Partial<Omit<StudioAmenitiesConfigRow, 'id' | 'updated_at'>>;
        Update: Partial<Omit<StudioAmenitiesConfigRow, 'id'>>;
      };
      gallery_post_media: {
        Row: GalleryPostMediaRow;
        Insert: {
          post_id: string;
          sort_order: number;
          storage_path: string;
          media_kind: GalleryMediaKind;
        } & Partial<Omit<GalleryPostMediaRow, 'id' | 'post_id' | 'sort_order' | 'storage_path' | 'media_kind' | 'created_at'>>;
        Update: Partial<Omit<GalleryPostMediaRow, 'id' | 'post_id' | 'created_at'>>;
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
          p_starts_at: string;
          p_ends_at?: string | null;
          p_class_limit?: number;
          p_status_class?: boolean;
          p_status_block?: ClassBlockStatus;
          p_name?: string;
          p_description?: string;
          p_discipline_id?: string | null;
          p_coach_account_ids?: string[];
          p_student_account_ids?: string[];
        };
        Returns: string;
      };
      admin_update_class: {
        Args: {
          p_class_id: string;
          p_starts_at: string;
          p_ends_at?: string | null;
          p_class_limit?: number;
          p_status_class?: boolean;
          p_status_block?: ClassBlockStatus;
          p_name?: string;
          p_description?: string;
          p_discipline_id?: string | null;
          p_coach_account_ids?: string[];
          p_student_account_ids?: string[] | null;
        };
        Returns: undefined;
      };
      admin_delete_class: {
        Args: { p_class_id: string };
        Returns: undefined;
      };
      close_started_class_blocks: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      upsert_staff_availability: {
        Args: {
          p_availability_date: string;
          p_day_off: boolean;
          p_note?: string;
          p_periods?: { start: string; end: string }[];
        };
        Returns: StaffAvailabilityRow;
      };
      delete_staff_availability: {
        Args: { p_id: string };
        Returns: undefined;
      };
      submit_portal_request: {
        Args: {
          p_request_type: PortalRequestType;
          p_target_class_id: string;
          p_payload: Record<string, unknown>;
          p_requester_note?: string;
        };
        Returns: PortalRequestRow;
      };
      review_portal_request: {
        Args: {
          p_request_id: string;
          p_status: PortalRequestStatus;
          p_review_note?: string;
          p_replacement_coach_account_id?: string | null;
          p_cancel_entire_class?: boolean;
        };
        Returns: PortalRequestRow;
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
      password_reset_eligible: {
        Args: { p_email: string; p_portal: string };
        Returns: boolean;
      };
      admin_force_lock_escrow_payment: {
        Args: { p_escrow_id: string };
        Returns: string;
      };
      admin_mark_cash_refund_disbursed: {
        Args: { p_escrow_payment_id: string; p_note?: string };
        Returns: unknown;
      };
      admin_grant_courtesy_credits: {
        Args: {
          p_account_id: string;
          p_quantity: number;
          p_expires_at: string;
          p_reason: string;
        };
        Returns: unknown;
      };
      admin_extend_credit_lot: {
        Args: { p_lot_id: string; p_expires_at: string; p_reason: string };
        Returns: unknown;
      };
      admin_adjust_credit_lot: {
        Args: { p_lot_id: string; p_delta: number; p_reason: string };
        Returns: unknown;
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
  is_active: boolean;
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
  color_hex: string;
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
  /** Present after migration 040_classes_uid.sql */
  uid?: string;
  name: string;
  description: string;
  discipline_id: string | null;
  starts_at: string;
  ends_at: string | null;
  class_limit: number;
  status_class: boolean;
  status_block: ClassBlockStatus;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

/** @deprecated Use ClassRow */
export type EventRow = ClassRow;

export interface ClassCoachRow {
  class_id: string;
  account_id: string;
  assigned_at: string;
  assigned_by: string | null;
  coach_confirmation: boolean;
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
  wants_physical_receipt: boolean;
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

export interface StaffAvailabilityRow {
  id: string;
  account_id: string;
  availability_date: string;
  day_off: boolean;
  note: string;
  periods: { start: string; end: string }[];
  created_at: string;
  updated_at: string;
}

export type PortalRequestType =
  | 'slot_request'
  | 'cancellation_request'
  | 'member_enrollment_cancellation';
export type PortalRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PortalRequestRow {
  id: string;
  request_type: PortalRequestType;
  status: PortalRequestStatus;
  requester_account_id: string;
  target_class_id: string | null;
  result_class_id: string | null;
  payload: Record<string, unknown>;
  requester_note: string;
  review_note: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioAmenitiesConfigRow {
  id: number;
  selected_labels: string[];
  updated_at: string;
}

export interface GalleryPostRow {
  id: string;
  caption: string;
  tag: GalleryTag;
  featured_in_gallery: boolean;
  featured_in_home_studio: boolean;
  featured_in_amenities: boolean;
  masonry_tall: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryPostMediaRow {
  id: string;
  post_id: string;
  sort_order: number;
  storage_path: string;
  media_kind: GalleryMediaKind;
  created_at: string;
}

export interface FeedbackRow {
  id: string;
  uid: string;
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
