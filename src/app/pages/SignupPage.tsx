import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [accountExistsError, setAccountExistsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthLabel = ['Invalid password', 'Weak password', 'Fair password', 'Good password', 'Strong password'];
  const strengthBgColor = ['bg-[#D4CDB5]', 'bg-red-400', 'bg-yellow-400', 'bg-green-500', 'bg-blue-500'];
  const strengthTextColor = ['text-[#9A8E7E]', 'text-red-500', 'text-yellow-600', 'text-green-600', 'text-blue-600'];

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (!confirm) {
      newErrors.confirm = 'Please confirm your password.';
    } else if (password !== confirm) {
      newErrors.confirm = 'Passwords do not match.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    setAccountExistsError(false);

    if (!validate()) return;

    setLoading(true);

    const result = await signup(email.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate(typeof result.profileComplete === 'boolean' ? '/profile' : '/login');
    } else if (result.error === 'ACCOUNT_EXISTS') {
      setAccountExistsError(true);
    } else {
      setGlobalError(result.error || 'Sign up failed. Please try again.');
    }
  };

  const strength = passwordStrength();
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
                    Sign Up
                  </h1>
                  <p className="text-[#8A7E6E] text-sm mt-1">Join BALANSÉ to book classes and manage your membership.</p>
                </div>
              </div>
              <img
                src="/favicon_32x32.svg"
                alt="BALANSÉ"
                className="h-40 w-40 shrink-0 object-contain"
              />
            </div>

            {accountExistsError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3 mb-4">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-semibold mb-0.5">Account already exists.</p>
                  <p className="text-red-500 text-xs">
                    This email is already registered.{' '}
                    <button onClick={() => navigate('/login')} className="text-[#c49a3c] underline font-medium">
                      Please log in
                    </button>
                    .
                  </p>
                </div>
              </div>
            )}

            {globalError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3 mb-4">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-snug">{globalError}</p>
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
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); setAccountExistsError(false); }}
                    placeholder="you@example.com"
                    className={`${inputBase} pl-11 pr-4 ${
                      errors.email || accountExistsError ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'
                    }`}
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.email}
                  </p>
                )}
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
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                    placeholder="Create a password"
                    className={`${inputBase} pl-11 pr-12 ${
                      errors.password ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2 flex items-center gap-3">
                    <p className={`text-xs leading-none shrink-0 ${strengthTextColor[strength]}`}>{strengthLabel[strength]}</p>
                    <div className="flex min-w-0 flex-1 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthBgColor[strength] : 'bg-[#D4CDB5]'}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: '' })); }}
                    placeholder="Repeat your password"
                    className={`${inputBase} pl-11 pr-12 ${
                      errors.confirm
                        ? 'border-red-400'
                        : confirm && confirm === password
                          ? 'border-[#c49a3c]/50'
                          : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirm && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.confirm}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#c49a3c] text-white font-bold text-base rounded-full py-3.5 min-h-[52px] shadow-[0_4px_24px_rgba(196,154,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#a67f2e] disabled:opacity-60 disabled:cursor-not-allowed mt-5"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <p className="text-center text-[#8A7E6E] text-sm mt-5">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#c49a3c] font-semibold hover:underline active:opacity-70"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
