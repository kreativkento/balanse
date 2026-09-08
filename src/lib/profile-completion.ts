import type { UserProfile } from '../app/context/AuthContext';
import { isHealthDeclarationAcknowledged } from './health-declaration';

/** Profile completion at or above this is treated as ready (green). */
export const PROFILE_COMPLETION_READY = 90;

const CARD_SCORE_WEIGHTS = {
  basic: 30,
  contact: 10,
  emergency: 10,
} as const;

function isFilled(value?: string | null): boolean {
  return Boolean((value ?? '').trim());
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
  return (
    (basicComplete ? CARD_SCORE_WEIGHTS.basic : 0)
    + (contactComplete ? CARD_SCORE_WEIGHTS.contact : 0)
    + (emergencyComplete ? CARD_SCORE_WEIGHTS.emergency : 0)
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
