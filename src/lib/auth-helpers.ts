import type { AuthError } from '@supabase/supabase-js';
import type { UserProfile } from '../app/context/AuthContext';
import type { CoachProfileData } from '../app/context/StaffAuthContext';
import type { ProfileClientRow, ProfileStaffRow, UserRole } from './database.types';

export const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export type AuthResult = {
  success: boolean;
  error?: string;
  profileComplete?: boolean;
  redirectTo?: string;
};

export function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0];
  return local
    .replace(/[._\-+]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function validateEmailPassword(email: string, password: string): AuthResult | null {
  if (!EMAIL_RE.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }
  return null;
}

type AuthErrorLike = AuthError & { status?: number; name?: string };

const SIGNUP_EMAIL_500_HELP =
  'Sign up could not send the confirmation email. In Supabase Dashboard → Authentication → Providers → Email, configure SMTP or turn off “Confirm email” for testing.';

export function mapAuthError(
  error: AuthErrorLike | null | undefined,
  fallback: string,
  context?: 'signup' | 'login',
): string {
  if (!error) return fallback;

  const rawMessage = error.message?.trim() ?? '';
  const message = rawMessage.toLowerCase();

  // auth-js throws AuthRetryableFetchError on HTTP 500 before reading the JSON body,
  // so msg is often empty even when GoTrue returns "Error sending confirmation email".
  if (
    context === 'signup'
    && error.status === 500
    && (!rawMessage || rawMessage === '{}' || error.name === 'AuthRetryableFetchError')
  ) {
    return SIGNUP_EMAIL_500_HELP;
  }

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }
  if (message.includes('user already registered') || message.includes('already been registered')) {
    return 'ACCOUNT_EXISTS';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (message.includes('database error') || message.includes('error saving new user')) {
    return 'Sign up could not finish on the server (database setup). Ask the studio to verify Supabase migrations, especially the signup trigger on auth.users.';
  }
  if (message.includes('error sending') && message.includes('email')) {
    return 'Sign up failed while sending email. In Supabase, configure SMTP or turn off “Confirm email” under Authentication → Providers → Email.';
  }
  if (message.includes('signup is disabled') || message.includes('signups not allowed')) {
    return 'New sign-ups are disabled for this app. Please contact the studio.';
  }

  return error.message || fallback;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function profileRowToUserProfile(row: ProfileClientRow, email: string): UserProfile {
  return {
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    middleInitial: row.middle_initial ?? '',
    nickname: row.nickname ?? '',
    name: row.name || deriveNameFromEmail(email),
    birthday: row.birthday ?? '',
    sex: (row.sex as UserProfile['sex']) || '',
    phone: row.phone ?? '',
    phoneValid: row.phone_valid ?? false,
    nationality: row.nationality ?? '',
    province: row.province ?? '',
    city: row.city ?? '',
    barangay: row.barangay ?? '',
    emergencyContactName: row.emergency_contact_name ?? '',
    emergencyContactNumber: row.emergency_contact_number ?? '',
    emergencyContactRelationship: row.emergency_contact_relationship ?? '',
    weight: row.weight ?? '',
    height: row.height ?? '',
    healthDeclaration: row.health_declaration ?? '',
    healthDeclarationDocumentPath: row.health_declaration_document_path ?? '',
    healthDeclarationSignedAt: row.health_declaration_signed_at ?? '',
    healthValid: row.health_valid ?? false,
    termsAccepted: row.terms_accepted ?? false,
    termsDocumentPath: row.terms_document_path ?? '',
    termsAcceptedVersion: row.terms_accepted_version ?? '',
    termsSignedAt: row.terms_signed_at ?? '',
    termsValid: row.terms_valid ?? false,
    privacyPolicyDocumentPath: row.privacy_policy_document_path ?? '',
    privacyAcceptedVersion: row.privacy_accepted_version ?? '',
    privacySignedAt: row.privacy_signed_at ?? '',
    privacyValid: row.privacy_valid ?? false,
    photo: row.photo ?? '',
    coverImage: row.cover_image ?? '',
  };
}

export function profileRowToCoachProfile(row: ProfileStaffRow, email: string): CoachProfileData {
  return {
    displayName: row.display_name || row.name || deriveNameFromEmail(email),
    photo: row.photo ?? '',
    coverImage: row.cover_image ?? '',
    bio: row.bio ?? '',
    experience: row.experience ?? '',
    classes: row.classes ?? [],
    nationality: row.nationality ?? '',
    phone: row.phone ?? '',
  };
}

export function withDocumentValidReset(data: Partial<UserProfile>): Partial<UserProfile> {
  const next = { ...data };
  if (
    data.healthDeclaration !== undefined
    || data.healthDeclarationDocumentPath !== undefined
    || data.healthDeclarationSignedAt !== undefined
  ) {
    next.healthValid = false;
  }
  if (
    data.termsAccepted !== undefined
    || data.termsDocumentPath !== undefined
    || data.termsAcceptedVersion !== undefined
    || data.termsSignedAt !== undefined
  ) {
    next.termsValid = false;
  }
  if (
    data.privacyPolicyDocumentPath !== undefined
    || data.privacyAcceptedVersion !== undefined
    || data.privacySignedAt !== undefined
  ) {
    next.privacyValid = false;
  }
  return next;
}

export function withPhoneChangeValidReset(
  data: Partial<UserProfile>,
  currentPhone?: string | null,
): Partial<UserProfile> {
  if (data.phone === undefined) return data;
  if (data.phone.trim() === (currentPhone ?? '').trim()) return data;
  if (data.phoneValid === true) return data;
  return { ...data, phoneValid: false };
}

export function userProfileToDbUpdate(data: Partial<UserProfile>): Record<string, unknown> {
  data = withDocumentValidReset(data);
  const update: Record<string, unknown> = {};

  if (data.firstName !== undefined) update.first_name = data.firstName;
  if (data.lastName !== undefined) update.last_name = data.lastName;
  if (data.middleInitial !== undefined) update.middle_initial = data.middleInitial;
  if (data.nickname !== undefined) update.nickname = data.nickname;
  if (data.name !== undefined) update.name = data.name;
  if (data.birthday !== undefined) update.birthday = data.birthday || null;
  if (data.sex !== undefined) update.sex = data.sex;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.nationality !== undefined) update.nationality = data.nationality;
  if (data.province !== undefined) update.province = emptyToNull(data.province);
  if (data.city !== undefined) update.city = emptyToNull(data.city);
  if (data.barangay !== undefined) update.barangay = emptyToNull(data.barangay);
  if (data.emergencyContactName !== undefined) {
    update.emergency_contact_name = emptyToNull(data.emergencyContactName);
  }
  if (data.emergencyContactNumber !== undefined) {
    update.emergency_contact_number = emptyToNull(data.emergencyContactNumber);
  }
  if (data.emergencyContactRelationship !== undefined) {
    update.emergency_contact_relationship = emptyToNull(data.emergencyContactRelationship);
  }
  if (data.weight !== undefined) update.weight = data.weight;
  if (data.height !== undefined) update.height = data.height;
  if (data.healthDeclaration !== undefined) update.health_declaration = data.healthDeclaration;
  if (data.healthDeclarationDocumentPath !== undefined) {
    update.health_declaration_document_path = emptyToNull(data.healthDeclarationDocumentPath);
  }
  if (data.healthDeclarationSignedAt !== undefined) {
    update.health_declaration_signed_at = data.healthDeclarationSignedAt || null;
  }
  if (data.termsAccepted !== undefined) update.terms_accepted = data.termsAccepted;
  if (data.termsDocumentPath !== undefined) update.terms_document_path = emptyToNull(data.termsDocumentPath);
  if (data.termsAcceptedVersion !== undefined) {
    update.terms_accepted_version = emptyToNull(data.termsAcceptedVersion);
  }
  if (data.termsSignedAt !== undefined) update.terms_signed_at = data.termsSignedAt || null;
  if (data.privacyPolicyDocumentPath !== undefined) {
    update.privacy_policy_document_path = emptyToNull(data.privacyPolicyDocumentPath);
  }
  if (data.privacyAcceptedVersion !== undefined) {
    update.privacy_accepted_version = emptyToNull(data.privacyAcceptedVersion);
  }
  if (data.privacySignedAt !== undefined) update.privacy_signed_at = data.privacySignedAt || null;
  if (data.healthValid !== undefined) update.health_valid = data.healthValid;
  if (data.termsValid !== undefined) update.terms_valid = data.termsValid;
  if (data.privacyValid !== undefined) update.privacy_valid = data.privacyValid;
  if (data.phoneValid !== undefined) update.phone_valid = data.phoneValid;
  if (data.photo) update.photo = data.photo;
  if (data.coverImage) update.cover_image = data.coverImage;

  return update;
}

export function coachProfileToDbUpdate(data: Partial<CoachProfileData>): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  if (data.displayName !== undefined) update.display_name = data.displayName;
  if (data.photo) update.photo = data.photo;
  if (data.coverImage) update.cover_image = data.coverImage;
  if (data.bio !== undefined) update.bio = data.bio;
  if (data.experience !== undefined) update.experience = data.experience;
  if (data.classes !== undefined) update.classes = data.classes;
  if (data.nationality !== undefined) update.nationality = data.nationality;
  if (data.phone !== undefined) update.phone = data.phone;

  return update;
}

export function buildFullName(firstName: string, middleInitial: string, lastName: string): string {
  return [firstName.trim(), middleInitial.trim() ? `${middleInitial.trim()}.` : '', lastName.trim()]
    .filter(Boolean)
    .join(' ');
}

export function wrongRoleMessage(expected: UserRole): string {
  if (expected === 'user') {
    return 'This account is not registered as a student. Please use the correct login portal.';
  }
  if (expected === 'coach') {
    return 'Access denied. This account is not authorized for the coach portal.';
  }
  if (expected === 'dev') {
    return 'Access denied. This account is not authorized for the development portal.';
  }
  if (expected === 'frontdesk' || expected === 'marketing') {
    return 'Access denied. This account is not authorized for the admin portal.';
  }
  return 'Access denied. This account is not authorized for the admin portal.';
}

export function wrongStaffPortalMessage(): string {
  return 'Access denied. This account is not authorized for the staff portal.';
}
