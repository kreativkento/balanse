import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Leaf, Mail, Lock, User, SkipForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [accountExistsError, setAccountExistsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const passwordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthBgColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-[#A67E2A]', 'bg-[#C49A3C]'];
  const strengthTextColor = ['', 'text-red-500', 'text-amber-500', 'text-[#A67E2A]', 'text-[#C49A3C]'];

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required.';
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

    const result = await signup(
      email.trim(),
      password,
      firstName.trim(),
      lastName.trim(),
      middleInitial.trim(),
    );
    setLoading(false);

    if (result.success) {
      setShowProfilePrompt(true);
    } else if (result.error === 'ACCOUNT_EXISTS') {
      setAccountExistsError(true);
    } else {
      setGlobalError(result.error || 'Sign up failed. Please try again.');
    }
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex flex-col">
      {showProfilePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-7 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[#C49A3C]/10 border border-[#C49A3C]/30 flex items-center justify-center">
                <User size={28} className="text-[#C49A3C]" />
              </div>
              <div>
                <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.7rem', letterSpacing: '0.05em' }}>Account Created!</h3>
                <p className="text-[#8A7E6E] text-sm mt-1.5 leading-relaxed">
                  Would you like to set up your profile now? You can always do this later from your dashboard.
                </p>
              </div>
            </div>
            <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 px-4 py-3">
              <p className="text-[#8A7E6E] text-xs leading-relaxed">Profile setup includes your name, birthday, health declaration, and terms acceptance — required before booking your first class.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/profile-setup')}
                className="w-full py-4 rounded-full bg-[#C49A3C] text-white font-bold hover:bg-[#A67E2A] active:scale-95 transition-all shadow-[0_4px_16px_rgba(196,154,60,0.3)] flex items-center justify-center gap-2"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '1rem' }}
              >
                <User size={16} /> Set Up Profile Now
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm font-medium hover:bg-[#EDE8D8] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <SkipForward size={14} /> Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile back */}
      <div className="md:hidden px-5 pt-5 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors active:opacity-70 min-h-[44px]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          {/* Desktop back */}
          <button
            onClick={() => navigate(-1)}
            className="hidden md:flex items-center gap-2 text-[#8A7E6E] hover:text-[#1E2A35] transition-colors mb-6 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-8 md:p-10">
            {/* Header */}
            <div className="mb-7">
              <div className="w-12 h-12 bg-[#C49A3C]/10 border border-[#C49A3C]/30 rounded-2xl flex items-center justify-center mb-4">
                <Leaf size={22} className="text-[#C49A3C]" />
              </div>
              <h1
                className="text-[#1E2A35] leading-tight"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.05em' }}
              >
                Create Account
              </h1>
              <p className="text-[#8A7E6E] text-sm mt-1">Create your account — we'll set up your profile next.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-6 bg-[#F8F3E8] rounded-2xl px-4 py-3 border border-[#D4CDB5]/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#C49A3C] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <span className="text-[#A67E2A] text-xs font-semibold">Create Account</span>
              </div>
              <div className="flex-1 h-px bg-[#D4CDB5]" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#EDE8D8] border border-[#D4CDB5] flex items-center justify-center shrink-0">
                  <span className="text-[#9A8E7E] text-xs font-bold">2</span>
                </div>
                <span className="text-[#9A8E7E] text-xs">Profile Setup</span>
              </div>
            </div>

            {/* Account exists error */}
            {accountExistsError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-4 flex items-start gap-3 mb-4">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 text-sm font-semibold mb-0.5">Account already exists.</p>
                  <p className="text-red-500 text-xs">
                    This email is already registered.{' '}
                    <button onClick={() => navigate('/login')} className="text-[#C49A3C] underline font-medium">
                      Please log in
                    </button>{' '}
                    with the same password. If you deleted the account from Supabase Table Editor, remove it from{' '}
                    <strong>Authentication → Users</strong> as well, or log in to restore it.
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

              {/* Name row: First + M.I. */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[#5A5048] text-sm font-semibold mb-2 block">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); setErrors(p => ({ ...p, firstName: '' })); }}
                    placeholder="Juan"
                    className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl px-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#C49A3C]/20 transition-all ${errors.firstName ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#C49A3C]/60'}`}
                    autoComplete="given-name"
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.firstName}</p>}
                </div>
                <div className="w-20">
                  <label className="text-[#5A5048] text-sm font-semibold mb-2 block">
                    M.I. <span className="text-[#B0A898] font-normal">(opt.)</span>
                  </label>
                  <input
                    type="text"
                    value={middleInitial}
                    onChange={e => setMiddleInitial(e.target.value.slice(0, 2))}
                    placeholder="A"
                    maxLength={2}
                    className="w-full bg-[#F8F3E8] border border-[#D4CDB5] text-[#1E2A35] placeholder-[#B0A898] rounded-2xl px-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#C49A3C]/20 focus:border-[#C49A3C]/60 transition-all text-center"
                    autoComplete="additional-name"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => { setLastName(e.target.value); setErrors(p => ({ ...p, lastName: '' })); }}
                  placeholder="dela Cruz"
                  className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl px-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#C49A3C]/20 transition-all ${errors.lastName ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#C49A3C]/60'}`}
                  autoComplete="family-name"
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.lastName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">Email Address</label>
                <div className="relative">
                  <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); setAccountExistsError(false); }}
                    placeholder="you@example.com"
                    className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-11 pr-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#C49A3C]/20 transition-all ${
                      errors.email || accountExistsError ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#C49A3C]/60'
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

              {/* Password */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">Password</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                    placeholder="Create a password"
                    className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-11 pr-12 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#C49A3C]/20 transition-all ${
                      errors.password ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#C49A3C]/60'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthBgColor[strength] : 'bg-[#D4CDB5]'}`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${strengthTextColor[strength]}`}>{strengthLabel[strength]} password</p>
                  </div>
                )}

                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">Confirm Password</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: '' })); }}
                    placeholder="Repeat your password"
                    className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-11 pr-12 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#C49A3C]/20 transition-all ${
                      errors.confirm ? 'border-red-400' : confirm && confirm === password ? 'border-[#C49A3C]/50' : 'border-[#D4CDB5] focus:border-[#C49A3C]/60'
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white font-bold text-base rounded-full py-4 min-h-[56px] shadow-[0_4px_24px_rgba(196,154,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#A67E2A] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Continue to Profile Setup →'
                )}
              </button>
            </form>

            {/* Login link */}
            <p className="text-center text-[#8A7E6E] text-sm mt-6">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-[#C49A3C] font-semibold hover:underline active:opacity-70"
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
