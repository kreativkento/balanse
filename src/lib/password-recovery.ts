import { supabase } from './supabase';
import { EMAIL_RE, mapAuthError } from './auth-helpers';

export type PasswordRecoveryPortal = 'internal' | 'member';

export type PasswordResetRequestResult =
  | { ok: true }
  | { ok: false; error: string; notEligible?: boolean };

function resetPasswordRedirectUrl(portal: PasswordRecoveryPortal): string {
  const url = new URL('/reset-password', window.location.origin);
  url.searchParams.set('portal', portal);
  return url.toString();
}

export async function requestPasswordResetEmail(
  email: string,
  portal: PasswordRecoveryPortal,
): Promise<PasswordResetRequestResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return { ok: false, error: 'Please enter your email address.' };
  }
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, error: 'Please enter a valid email address (e.g. you@example.com).' };
  }

  const { data: eligible, error: rpcError } = await supabase.rpc('password_reset_eligible', {
    p_email: normalized,
    p_portal: portal,
  });

  if (rpcError) {
    return {
      ok: false,
      error:
        'We could not verify your account right now. If this keeps happening, ask the studio to apply the latest database migration (password reset eligibility).',
    };
  }

  if (!eligible) {
    if (portal === 'internal') {
      return {
        ok: false,
        notEligible: true,
        error:
          'No coach, front desk, marketing, or admin account uses this email. Enter the address from your staff or admin login, or contact your studio administrator.',
      };
    }
    return {
      ok: false,
      notEligible: true,
      error:
        'No member account uses this email. Use the address from your sign-up, or create an account from the student site.',
    };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
    redirectTo: resetPasswordRedirectUrl(portal),
  });

  if (error) {
    return {
      ok: false,
      error: mapAuthError(error, 'Could not send the reset email. Please try again.', 'login'),
    };
  }

  return { ok: true };
}

export async function completePasswordReset(newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return {
      ok: false,
      error: mapAuthError(error, 'Could not update your password. Request a new reset link and try again.', 'login'),
    };
  }

  await supabase.auth.signOut();
  return { ok: true };
}

export function loginPathAfterReset(portal: PasswordRecoveryPortal | null): string {
  if (portal === 'internal') return '/staff-login';
  return '/login';
}

export async function changeLoggedInUserPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: currentPassword,
  });

  if (verifyError) {
    const mapped = mapAuthError(verifyError, 'Current password is incorrect.', 'login');
    if (mapped.toLowerCase().includes('incorrect')) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    return { ok: false, error: mapped };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    return {
      ok: false,
      error: mapAuthError(updateError, 'Could not update your password. Please try again.', 'login'),
    };
  }

  return { ok: true };
}
