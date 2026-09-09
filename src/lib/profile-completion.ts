import type { UserProfile } from '../app/context/AuthContext';
import { isHealthDeclarationAcknowledged } from './health-declaration';

/** Profile completion at or above this is treated as ready (green). */
export const PROFILE_COMPLETION_READY = 90;

const CARD_SCORE_WEIGHTS = {
  basic: 30,
  contact: 10,
  emergency: 10,
} as const;

const DOCUMENT_SCORE_WEIGHTS = {
  healthRecord: 10,
  termsRecord: 15,
  privacyRecord: 15,
  healthValid: 2,
  termsValid: 2,
  privacyValid: 2,
  phoneValid: 4,
} as const;

function isFilled(value?: string | null): boolean {
  return Boolean((value ?? '').trim());
}

function hasClientRecord(...values: Array<string | boolean | null | undefined>): boolean {
  return values.some((value) => (typeof value === 'boolean' ? value : isFilled(value)));
}

export function computeProfileScore(profile?: UserProfile): number {
  const basicComplete = [
    profile?.firstName,
    profile?.lastName,
    profile?.birthday,
    profile?.sex,
    profile?.nationality,
    profile?.weight,
    profile?.height,
  ].every(isFilled);
  const contactComplete = [
    profile?.phone,
    profile?.province,
    profile?.city,
  ].every(isFilled);
  const emergencyComplete = [
    profile?.emergencyContactName,
    profile?.emergencyContactNumber,
    profile?.emergencyContactRelationship,
  ].every(isFilled);
  const healthRecord = hasClientRecord(
    profile?.healthDeclarationDocumentPath,
    profile?.healthDeclarationSignedAt,
  ) || isHealthDeclarationAcknowledged(profile?.healthDeclaration);
  const termsRecord = hasClientRecord(
    profile?.termsDocumentPath,
    profile?.termsSignedAt,
    profile?.termsAcceptedVersion,
    profile?.termsAccepted,
  );
  const privacyRecord = hasClientRecord(
    profile?.privacyPolicyDocumentPath,
    profile?.privacySignedAt,
    profile?.privacyAcceptedVersion,
  );
  return (
    (basicComplete ? CARD_SCORE_WEIGHTS.basic : 0)
    + (contactComplete ? CARD_SCORE_WEIGHTS.contact : 0)
    + (emergencyComplete ? CARD_SCORE_WEIGHTS.emergency : 0)
    + (healthRecord ? DOCUMENT_SCORE_WEIGHTS.healthRecord : 0)
    + (termsRecord ? DOCUMENT_SCORE_WEIGHTS.termsRecord : 0)
    + (privacyRecord ? DOCUMENT_SCORE_WEIGHTS.privacyRecord : 0)
    + (profile?.healthValid ? DOCUMENT_SCORE_WEIGHTS.healthValid : 0)
    + (profile?.termsValid ? DOCUMENT_SCORE_WEIGHTS.termsValid : 0)
    + (profile?.privacyValid ? DOCUMENT_SCORE_WEIGHTS.privacyValid : 0)
    + (profile?.phoneValid ? DOCUMENT_SCORE_WEIGHTS.phoneValid : 0)
  );
}

export function profileScoreBarClasses(score: number) {
  if (score <= 20) {
    return { bar: 'bg-red-500', track: 'bg-red-100', text: 'text-red-600' };
  }
  if (score <= 45) {
    return { bar: 'bg-orange-500', track: 'bg-orange-100', text: 'text-orange-600' };
  }
  if (score < 70) {
    return { bar: 'bg-yellow-400', track: 'bg-yellow-100', text: 'text-yellow-700' };
  }
  if (score >= PROFILE_COMPLETION_READY) {
    return { bar: 'bg-green-500', track: 'bg-green-100', text: 'text-green-700' };
  }
  return { bar: 'bg-lime-500', track: 'bg-lime-100', text: 'text-lime-700' };
}

/** Setup-complete: required personal fields, terms, and a health acknowledgment. */
export function isProfileComplete(profile?: Pick<
  UserProfile,
  | 'firstName'
  | 'lastName'
  | 'birthday'
  | 'sex'
  | 'phone'
  | 'nationality'
  | 'termsAccepted'
  | 'termsDocumentPath'
  | 'termsAcceptedVersion'
  | 'healthDeclaration'
> | null): boolean {
  return [
    profile?.firstName,
    profile?.lastName,
    profile?.birthday,
    profile?.sex,
    profile?.phone,
    profile?.nationality,
  ].every(isFilled)
    && (!!profile?.termsAccepted || !!profile?.termsDocumentPath || !!profile?.termsAcceptedVersion)
    && isHealthDeclarationAcknowledged(profile?.healthDeclaration);
}
