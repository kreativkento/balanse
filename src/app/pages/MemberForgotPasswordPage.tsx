import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

export default function MemberForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-hidden bg-[#F8F3E8] flex flex-col">
      <div className="md:hidden px-5 pt-6 pb-1 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors active:opacity-70 min-h-[44px]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-5 py-4 overflow-hidden">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-7 md:p-9">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hidden md:flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors text-sm font-medium shrink-0 mb-4"
            >
              <ArrowLeft size={16} />
              Back to login
            </button>
            <ForgotPasswordForm
              portal="member"
              returnTo="/login"
              returnLabel="Back to member login"
              title="Forgot password"
              subtitle="Enter the email you used to sign up as a member. We will send a link to set a new password."
              emailPlaceholder="you@example.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
