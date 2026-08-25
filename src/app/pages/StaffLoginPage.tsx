import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ArrowLeft, Crown } from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import logoMainWhite from 'figma:asset/logo_main_white.svg';
import logoMain from 'figma:asset/logo_main.svg';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const { staffLogin } = useStaffAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

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
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = await staffLogin(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/staff-dashboard');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex">
      {/* ── LEFT PANEL — Brand ── */}
      <div
        className="hidden md:flex md:w-[42%] flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1E2A35 0%, #263545 60%, #1A2530 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full border border-white/05" />
        <div className="absolute top-[-40px] right-[-40px] w-48 h-48 rounded-full border border-white/08" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full border border-[#745b3c]/10" />

        {/* Logo */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-4 mb-14">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Back to site"
              className="shrink-0 flex items-center justify-center text-[#745b3c] hover:text-[#D4CDB5] active:opacity-70 transition-colors"
            >
              <ArrowLeft size={22} strokeWidth={2.25} />
            </button>
            <Link to="/" className="inline-block">
              <img src={logoMainWhite} alt="BALANSÉ Wellness Hub" className="h-10 w-auto object-contain" />
            </Link>
          </div>

          {/* Staff badge */}
          <div className="flex items-center gap-2 bg-[#745b3c]/15 border border-[#745b3c]/30 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck size={13} className="text-[#745b3c]" />
            <span className="text-[#745b3c] text-xs font-bold uppercase tracking-widest">Staff Access</span>
          </div>

          <h1
            className="text-white leading-tight mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.4rem, 4vw, 3.2rem)', letterSpacing: '0.05em' }}
          >
            Welcome Back,<br />Coach.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs">
            Manage your classes, review student bookings, and keep the studio running at its best.
          </p>
        </div>

        {/* Bottom quote */}
        <div className="border-t border-white/10 pt-6">
          <p
            className="text-white/30 italic"
            style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '1rem' }}
          >
            "Movement is medicine. Your guidance makes it possible."
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10">

        <div className="w-full max-w-md mx-auto">

          {/* Mobile logo */}
          <div className="md:hidden mb-8">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-1.5 bg-[#745b3c]/10 border border-[#745b3c]/25 rounded-full px-3 py-1 mb-3 w-fit">
              <ShieldCheck size={11} className="text-[#745b3c]" />
              <span className="text-[#5e4a30] text-xs font-bold uppercase tracking-widest">Staff Portal</span>
            </div>
            <h2
              className="text-[#1E2A35] leading-none mb-1"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.05em' }}
            >
              Staff Login
            </h2>
            <p className="text-[#8A7E6E] text-sm">Enter your staff credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="your@balanse.com"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="text-right -mt-1">
              <button type="button" className="text-[#745b3c] text-xs hover:text-[#5e4a30] transition-colors">
                Forgot Password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1E2A35] text-white rounded-full py-4 mt-1 font-semibold text-sm shadow-[0_4px_20px_rgba(30,42,53,0.25)] hover:bg-[#263545] active:scale-[0.97] transition-all disabled:opacity-60"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em', fontSize: '1rem' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Verifying...
                </span>
              ) : (
                <>
                  <ShieldCheck size={16} /> Log In as Staff
                </>
              )}
            </button>
          </form>

          {/* Back to student site */}
          <p className="text-center text-[#B0A898] text-xs mt-6">
            Not staff?{' '}
            <Link to="/" className="text-[#8A7E6E] hover:text-[#745b3c] transition-colors font-medium">
              Return to student site
            </Link>
          </p>

          {/* Admin separator */}
          <div className="mt-6 pt-6 border-t border-[#D4CDB5]/50">
            <p className="text-center text-[#B0A898] text-xs mb-3">Need admin-level access?</p>
            <button
              onClick={() => navigate('/admin-login')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm hover:border-[#1E2A35]/30 hover:bg-[#EDE8D8] active:scale-[0.97] transition-all"
            >
              <Crown size={14} className="text-[#745b3c]" />
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.88rem' }}>
                Log in as Admin
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}