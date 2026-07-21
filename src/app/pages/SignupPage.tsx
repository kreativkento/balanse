import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Leaf, User, Mail, Lock, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
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

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthBgColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-[#A67E2A]', 'bg-[#C49A3C]'];
  const strengthTextColor = ['', 'text-red-500', 'text-amber-500', 'text-[#A67E2A]', 'text-[#C49A3C]'];

  const validate = (): boolean => {
    const newErrors: FieldErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required.';
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
    await new Promise((r) => setTimeout(r, 700));

    const result = signup(name.trim(), email.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else if (result.error === 'ACCOUNT_EXISTS') {
      setAccountExistsError(true);
    } else {
      setGlobalError(result.error || 'Sign up failed. Please try again.');
    }
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex flex-col">
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

      {/* Centered card */}
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
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '2.2rem',
                  letterSpacing: '0.05em',
                }}
              >
                Create Account
              </h1>
              <p className="text-[#8A7E6E] text-sm mt-1">Join BALANSÉ and begin your journey</p>
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
                      Please log in.
                    </button>
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
              {/* Full Name */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">Full Name</label>
                <div className="relative">
                  <User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
                    placeholder="Your full name"
                    className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-11 pr-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#C49A3C]/20 transition-all ${
                      errors.name ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#C49A3C]/60'
                    }`}
                    autoComplete="name"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
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
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength ? strengthBgColor[strength] : 'bg-[#D4CDB5]'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${strengthTextColor[strength]}`}>
                      {strengthLabel[strength]} password
                    </p>
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
                    {confirm && confirm === password ? (
                      <Check size={18} className="text-[#C49A3C]" />
                    ) : showConfirm ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
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
                  'Create Account'
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
