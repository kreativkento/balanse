import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  completePasswordReset,
  loginPathAfterReset,
  type PasswordRecoveryPortal,
} from '../../lib/password-recovery';

function parsePortal(value: string | null): PasswordRecoveryPortal | null {
  if (value === 'internal' || value === 'member') return value;
  return null;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const portal = parsePortal(params.get('portal'));

  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let settled = false;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const awaitingRecoveryFromUrl =
      hashParams.get('type') === 'recovery'
      || params.get('type') === 'recovery'
      || hashParams.has('access_token');

    const markInvalid = () => {
      if (!mounted || settled) return;
      settled = true;
      setSessionError('This reset link is invalid or has expired. Request a new one from the login page.');
      setSessionReady(true);
    };

    const markReady = () => {
      if (!mounted || settled) return;
      settled = true;
      setSessionError('');
      setSessionReady(true);
    };

    const verifyRecoverySession = async () => {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (!mounted || settled) return;

      if (sessionErr) {
        markInvalid();
        return;
      }

      if (session) {
        markReady();
        return;
      }

      if (!awaitingRecoveryFromUrl) {
        markInvalid();
      }
    };

    void verifyRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        markReady();
      }
    });

    const timeout = window.setTimeout(() => {
      if (!mounted || settled) return;
      if (awaitingRecoveryFromUrl) {
        markInvalid();
      }
    }, 8000);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await completePasswordReset(password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
  };

  const loginPath = loginPathAfterReset(portal);
  const forgotPath =
    portal === 'internal'
      ? '/internal-forgot-password?from=staff'
      : '/member-forgot-password';

  const inputClass =
    'w-full pl-10 pr-12 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all';

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-7 md:p-9">
        <h1
          className="text-[#1E2A35] leading-none mb-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}
        >
          Set new password
        </h1>
        <p className="text-[#8A7E6E] text-sm mb-6">Choose a strong password for your account.</p>

        {!sessionReady ? (
          <div className="flex justify-center py-8">
            <span className="w-8 h-8 rounded-full border-2 border-[#c49a3c]/30 border-t-[#c49a3c] animate-spin" />
          </div>
        ) : success ? (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
              <p className="text-emerald-900 text-sm leading-relaxed">
                Your password has been updated. Sign in with your new password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(loginPath)}
              className="action-button w-full bg-[#c49a3c] text-white font-bold rounded-full py-3.5 hover:bg-[#a67f2e] transition-colors"
            >
              Go to login
            </button>
          </div>
        ) : sessionError ? (
          <div className="flex flex-col gap-4">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" aria-hidden />
              <p className="text-red-700 text-sm leading-snug">{sessionError}</p>
            </div>
            <Link
              to={forgotPath}
              className="text-center text-[#c49a3c] text-sm font-medium hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">New password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" aria-hidden />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="At least 6 characters"
                  className={inputClass}
                  autoComplete="new-password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E]"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" aria-hidden />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError('');
                  }}
                  placeholder="Repeat password"
                  className={inputClass}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" aria-hidden />
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="action-button w-full flex items-center justify-center bg-[#1E2A35] text-white rounded-full py-4 hover:bg-[#263545] disabled:opacity-60 transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving...
                </span>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
