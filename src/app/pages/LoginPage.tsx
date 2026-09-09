import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address (e.g. you@example.com).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate(result.profileComplete ? '/dashboard' : '/profile');
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
  };

  const inputBase =
    'w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl py-3.5 min-h-[52px] outline-none focus:ring-2 focus:ring-[#c49a3c]/20 transition-all';

  return (
    <div className="h-full overflow-hidden bg-[#F8F3E8] flex flex-col">
      {/* Mobile back */}
      <div className="md:hidden px-5 pt-6 pb-1 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors active:opacity-70 min-h-[44px]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-5 py-4 overflow-hidden">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-7 md:p-9">
            <div className="mb-5 flex items-stretch justify-between gap-4">
              <div className="min-w-0 flex-1 flex flex-col border-b border-[#D4CDB5]/60 pb-3">
                <button
                  onClick={() => navigate(-1)}
                  className="hidden md:flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors text-sm font-medium shrink-0"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <div className="mt-auto">
                  <h1
                    className="text-[#1E2A35] leading-tight"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.05em' }}
                  >
                    Welcome Back
                  </h1>
                  <p className="text-[#8A7E6E] text-sm mt-1">Sign in to continue to BALANSÉ</p>
                </div>
              </div>
              <img
                src="/favicon_32x32.svg"
                alt="BALANSÉ"
                className="h-40 w-40 shrink-0 object-contain"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3 mb-4">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    className={`${inputBase} pl-11 pr-4 border-[#D4CDB5] focus:border-[#c49a3c]/60`}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    className={`${inputBase} pl-11 pr-12 border-[#D4CDB5] focus:border-[#c49a3c]/60`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end -mt-1">
                <button type="button" className="text-[#c49a3c] text-sm font-medium hover:underline active:opacity-70">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#c49a3c] text-white font-bold text-base rounded-full py-3.5 min-h-[52px] shadow-[0_4px_24px_rgba(196,154,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#a67f2e] disabled:opacity-60 disabled:cursor-not-allowed mt-5"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>
            </form>

            <p className="text-center text-[#8A7E6E] text-sm mt-5">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-[#c49a3c] font-semibold hover:underline active:opacity-70"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}