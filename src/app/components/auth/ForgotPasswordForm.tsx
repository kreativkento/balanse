import { useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import {
  requestPasswordResetEmail,
  type PasswordRecoveryPortal,
} from '../../../lib/password-recovery';

type ForgotPasswordFormProps = {
  portal: PasswordRecoveryPortal;
  returnTo: string;
  returnLabel: string;
  title: string;
  subtitle: string;
  emailPlaceholder: string;
};

export function ForgotPasswordForm({
  portal,
  returnTo,
  returnLabel,
  title,
  subtitle,
  emailPlaceholder,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSent(false);
    setLoading(true);

    const result = await requestPasswordResetEmail(email, portal);
    setLoading(false);

    if (result.ok) {
      setSent(true);
      return;
    }
    setError(result.error);
  };

  const inputClass =
    'w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all';

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2">
        <h2
          className="text-[#1E2A35] leading-none mb-1"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.05em' }}
        >
          {title}
        </h2>
        <p className="text-[#8A7E6E] text-sm">{subtitle}</p>
      </div>

      {sent ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-emerald-900 leading-relaxed">
            <p className="font-semibold mb-1">Reset link sent</p>
            <p>
              If <span className="font-medium">{email.trim()}</span> matches your account, you will receive an email
              with a link to choose a new password. Check your inbox and spam folder. Links expire after a limited time.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" aria-hidden />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder={emailPlaceholder}
                className={inputClass}
                autoComplete="email"
                disabled={loading}
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
            className="action-button w-full flex items-center justify-center bg-[#1E2A35] text-white rounded-full py-4 shadow-[0_4px_20px_rgba(30,42,53,0.25)] hover:bg-[#263545] active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sending...
              </span>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>
      )}

      <p className="text-center text-[#B0A898] text-xs">
        <Link to={returnTo} className="text-[#8A7E6E] hover:text-[#c49a3c] transition-colors">
          {returnLabel}
        </Link>
      </p>
    </div>
  );
}
