import type { AuthError } from '@supabase/supabase-js';
import type { UserProfile } from '../app/context/AuthContext';
import type { CoachProfileData } from '../app/context/StaffAuthContext';
import type { ProfileClientRow, ProfileStaffRow, UserRole } from './database.types';

export const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export type AuthResult = { success: boolean; error?: string };

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

export function mapAuthError(error: AuthError | null | undefined, fallback: string): string {
  if (!error) return fallback;

  const message = error.message.toLowerCase();

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

  return error.message || fallback;
}

export function profileRowToUserProfile(row: ProfileClientRow, email: string): UserProfile {
  return {
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    middleInitial: row.middle_initial ?? '',
    name: row.name || deriveNameFromEmail(email),
    birthday: row.birthday ?? '',
    sex: (row.sex as UserProfile['sex']) || '',
    phone: row.phone ?? '',
    nationality: row.nationality ?? '',
    address: row.address ?? '',
    weight: row.weight ?? '',
    height: row.height ?? '',
    medicalHistory: row.medical_history ?? '',
    healthDeclarationSigned: row.health_declaration_signed ?? false,
    termsAccepted: row.terms_accepted ?? false,
    shareAvailability: row.share_availability ?? false,
    profileComplete: row.profile_complete ?? false,
  };
}

export function profileRowToCoachProfile(row: ProfileStaffRow, email: string): CoachProfileData {
  return {
    displayName: row.display_name || row.name || deriveNameFromEmail(email),
    photo: row.photo ?? '',
    bio: row.bio ?? '',
    experience: row.experience ?? '',
    classes: row.classes ?? [],
    nationality: row.nationality ?? '',
  };
}

export function userProfileToDbUpdate(data: Partial<UserProfile>): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  if (data.firstName !== undefined) update.first_name = data.firstName;
  if (data.lastName !== undefined) update.last_name = data.lastName;
  if (data.middleInitial !== undefined) update.middle_initial = data.middleInitial;
  if (data.name !== undefined) update.name = data.name;
  if (data.birthday !== undefined) update.birthday = data.birthday || null;
  if (data.sex !== undefined) update.sex = data.sex;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.nationality !== undefined) update.nationality = data.nationality;
  if (data.address !== undefined) update.address = data.address;
  if (data.weight !== undefined) update.weight = data.weight;
  if (data.height !== undefined) update.height = data.height;
  if (data.medicalHistory !== undefined) update.medical_history = data.medicalHistory;
  if (data.healthDeclarationSigned !== undefined) {
    update.health_declaration_signed = data.healthDeclarationSigned;
  }
  if (data.termsAccepted !== undefined) update.terms_accepted = data.termsAccepted;
  if (data.shareAvailability !== undefined) update.share_availability = data.shareAvailability;
  if (data.profileComplete !== undefined) update.profile_complete = data.profileComplete;

  return update;
}

export function coachProfileToDbUpdate(data: Partial<CoachProfileData>): Record<string, unknown> {
  const update: Record<string, unknown> = {};

  if (data.displayName !== undefined) update.display_name = data.displayName;
  if (data.photo !== undefined) update.photo = data.photo;
  if (data.bio !== undefined) update.bio = data.bio;
  if (data.experience !== undefined) update.experience = data.experience;
  if (data.classes !== undefined) update.classes = data.classes;
  if (data.nationality !== undefined) update.nationality = data.nationality;

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
