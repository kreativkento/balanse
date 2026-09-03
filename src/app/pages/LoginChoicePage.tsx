import { useNavigate } from 'react-router';
import { LogIn, UserPlus, Leaf, ArrowLeft } from 'lucide-react';

export default function LoginChoicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex flex-col">
      {/* Mobile back button */}
      <div className="md:hidden px-5 pt-5 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors active:opacity-70 min-h-[44px]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Go Back</span>
        </button>
      </div>

      {/* Content — centered card on desktop */}
      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          {/* Desktop back link */}
          <button
            onClick={() => navigate(-1)}
            className="hidden md:flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>

          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-8 md:p-10">
            {/* Logo / Icon */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-[#c49a3c]/10 border border-[#c49a3c]/30 rounded-3xl flex items-center justify-center mb-5">
                <Leaf size={36} className="text-[#c49a3c]" />
              </div>
              <h1
                className="text-[#1E2A35] text-center leading-tight mb-2"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '2.2rem',
                  letterSpacing: '0.05em',
                }}
              >
                Continue to Booking
              </h1>
              <p className="text-[#8A7E6E] text-sm text-center max-w-[260px] leading-relaxed">
                Sign in or create a free account to book classes and manage your wellness schedule.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center gap-4 bg-[#c49a3c] text-white font-bold rounded-2xl px-6 py-5 min-h-[72px] shadow-[0_4px_24px_rgba(196,154,60,0.35)] active:scale-[0.97] transition-all hover:bg-[#a67f2e]"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <LogIn size={20} />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold">Log In</p>
                  <p className="text-white/70 text-xs font-medium">Already have an account</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/signup')}
                className="w-full flex items-center gap-4 bg-[#F8F3E8] text-[#1E2A35] font-bold rounded-2xl px-6 py-5 min-h-[72px] border border-[#D4CDB5] active:scale-[0.97] transition-all hover:bg-[#EDE8D8] shadow-sm"
              >
                <div className="w-10 h-10 bg-[#EDE8D8] rounded-xl flex items-center justify-center shrink-0">
                  <UserPlus size={20} className="text-[#c49a3c]" />
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold">Sign Up</p>
                  <p className="text-[#8A7E6E] text-xs font-medium">Create a free account</p>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-[#D4CDB5]" />
              <span className="text-[#B0A898] text-xs">or</span>
              <div className="flex-1 h-px bg-[#D4CDB5]" />
            </div>

            {/* Guest note */}
            <p className="text-[#A09080] text-xs text-center leading-relaxed">
              By continuing, you agree to BALANSÉ's{' '}
              <span className="text-[#8A7E6E] underline cursor-pointer">Terms of Service</span>{' '}
              and{' '}
              <span className="text-[#8A7E6E] underline cursor-pointer">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
