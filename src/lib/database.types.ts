export type UserRole = 'user' | 'coach' | 'admin' | 'dev';

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
      profiles: {
        Row: ProfileRow;
        Insert: {
          account_id: string;
        } & Partial<Omit<ProfileRow, 'id' | 'account_id' | 'created_at' | 'updated_at'>>;
        Update: Partial<ProfileRow>;
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

export interface ProfileRow {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  middle_initial: string;
  name: string;
  birthday: string | null;
  sex: string;
  phone: string;
  cell_number: string;
  address: string;
  weight: string;
  height: string;
  medical_history: string;
  health_declaration_signed: boolean;
  terms_accepted: boolean;
  share_availability: boolean;
  profile_complete: boolean;
  display_name: string;
  photo: string;
  bio: string;
  experience: string;
  classes: string[];
  created_at: string;
  updated_at: string;
}

export interface AccountWithProfile {
  account: AccountRow;
  profile: ProfileRow;
}
