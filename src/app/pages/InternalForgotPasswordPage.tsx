import { Link, useSearchParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';
import logoMainWhite from 'figma:asset/logo_main_white.svg';
import logoMain from 'figma:asset/logo_main.svg';

export default function InternalForgotPasswordPage() {
  const [params] = useSearchParams();
  const fromAdmin = params.get('from') === 'admin';
  const returnTo = fromAdmin ? '/admin-login' : '/staff-login';
  const returnLabel = fromAdmin ? 'Back to admin login' : 'Back to staff login';

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex">
      <div
        className="hidden md:flex md:w-[42%] flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F1A24 0%, #1E2A35 55%, #152030 100%)' }}
      >
        <div className="flex flex-col items-start">
          <div className="flex items-center justify-between w-full gap-4 mb-12">
            <Link to="/" className="inline-block">
              <img src={logoMainWhite} alt="BALANSÉ Wellness Hub" className="h-10 w-auto object-contain" />
            </Link>
            <Link
              to={returnTo}
              className="shrink-0 flex items-center gap-1 text-[#c49a3c] hover:text-[#D4CDB5] transition-colors"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
              <span>Back</span>
            </Link>
          </div>
          <div className="bg-[#c49a3c]/15 border border-[#c49a3c]/35 rounded-full px-4 py-1.5 mb-7">
            <span className="text-[#c49a3c] text-xs font-bold uppercase tracking-widest">Account recovery</span>
          </div>
          <h1
            className="text-white leading-tight mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.4rem, 4vw, 3.2rem)', letterSpacing: '0.05em' }}
          >
            Reset your<br />portal password
          </h1>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">
            For coaches, front desk, marketing, and admin accounts only. We will email a secure link to set a new password.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="md:hidden mb-8">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          </div>
          <ForgotPasswordForm
            portal="internal"
            returnTo={returnTo}
            returnLabel={returnLabel}
            title="Forgot password"
            subtitle="Enter your staff or admin email. We only send a reset link when it matches an authorized portal account."
            emailPlaceholder={fromAdmin ? 'admin@yourdomain.com' : 'your@balanse.com'}
          />
        </div>
      </div>
    </div>
  );
}
