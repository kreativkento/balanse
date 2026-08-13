import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, Lock, Mail, Crown, ArrowLeft, ChevronRight } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import logoMainWhite from 'figma:asset/logo_main_white.svg';
import logoMain from 'figma:asset/logo_main.svg';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin } = useAdminAuth();

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
    const result = await adminLogin(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/admin-dashboard');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex">

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden md:flex md:w-[42%] flex-col justify-between px-12 py-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F1A24 0%, #1E2A35 55%, #152030 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-[-90px] right-[-90px] w-80 h-80 rounded-full border border-white/04" />
        <div className="absolute top-[-45px] right-[-45px] w-52 h-52 rounded-full border border-[#C49A3C]/08" />
        <div className="absolute bottom-[-70px] left-[-70px] w-72 h-72 rounded-full border border-[#C49A3C]/08" />
        <div className="absolute bottom-[120px] right-[-30px] w-36 h-36 rounded-full border border-white/04" />

        {/* Logo */}
        <div className="flex flex-col items-start">
          <Link to="/" className="inline-block mb-12">
            <img src={logoMainWhite} alt="BALANSÉ Wellness Hub" className="h-10 w-auto object-contain" />
          </Link>

          {/* Admin badge */}
          <div className="flex items-center gap-2 bg-[#C49A3C]/15 border border-[#C49A3C]/35 rounded-full px-4 py-1.5 mb-7">
            <Crown size={13} className="text-[#C49A3C]" />
            <span className="text-[#C49A3C] text-xs font-bold uppercase tracking-widest">Admin Portal</span>
          </div>

          <h1
            className="text-white leading-tight mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.4rem, 4vw, 3.2rem)', letterSpacing: '0.05em' }}
          >
            Full Studio<br />Control.
          </h1>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">
            Manage staff, students, class schedules, and studio operations from one central dashboard.
          </p>

          {/* Feature list */}
          <div className="mt-8 flex flex-col gap-3">
            {[
              'Manage staff & coach accounts',
              'Create and edit student profiles',
              'Build and schedule weekly classes',
              'Review bookings and payments',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#C49A3C]/20 border border-[#C49A3C]/40 flex items-center justify-center shrink-0">
                  <ChevronRight size={10} className="text-[#C49A3C]" />
                </div>
                <span className="text-white/50 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="border-t border-white/10 pt-6">
          <p
            className="text-white/25 italic"
            style={{ fontFamily: "'Cormorant Garant', serif", fontSize: '1rem' }}
          >
            "Behind every great studio is a great system."
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-16 py-10">

        {/* Mobile back */}
        <Link to="/staff-login" className="md:hidden flex items-center gap-2 text-[#8A7E6E] text-sm mb-8 hover:text-[#1E2A35] transition-colors">
          <ArrowLeft size={16} /> Back to staff login
        </Link>

        <div className="w-full max-w-md mx-auto">

          {/* Mobile logo */}
          <div className="md:hidden mb-8">
            <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-8 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-1.5 bg-[#1E2A35]/08 border border-[#1E2A35]/15 rounded-full px-3 py-1 mb-3 w-fit">
              <Crown size={11} className="text-[#C49A3C]" />
              <span className="text-[#1E2A35] text-xs font-bold uppercase tracking-widest">Admin Access</span>
            </div>
            <h2
              className="text-[#1E2A35] leading-none mb-1"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.05em' }}
            >
              Admin Login
            </h2>
            <p className="text-[#8A7E6E] text-sm">Enter your admin credentials to access the control panel.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div>
              <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Admin Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="admin@yourdomain.com"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all"
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
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
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
              className="w-full flex items-center justify-center gap-2 bg-[#1E2A35] text-white rounded-full py-4 mt-1 shadow-[0_4px_20px_rgba(30,42,53,0.25)] hover:bg-[#263545] active:scale-[0.97] transition-all disabled:opacity-60"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em', fontSize: '1rem' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Verifying...
                </span>
              ) : (
                <>
                  <Crown size={16} /> Access Admin Panel
                </>
              )}
            </button>
          </form>

          {/* Back to staff */}
          <p className="text-center text-[#B0A898] text-xs mt-6">
            Not an admin?{' '}
            <Link to="/staff-login" className="text-[#8A7E6E] hover:text-[#C49A3C] transition-colors font-medium">
              Back to Staff Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}