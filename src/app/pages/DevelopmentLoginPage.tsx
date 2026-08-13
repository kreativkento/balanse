import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Lock, Mail, Code2 } from 'lucide-react';
import { useDevAuth } from '../context/DevAuthContext';
import logoMain from 'figma:asset/logo_main.svg';

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function DevelopmentLoginPage() {
  const navigate = useNavigate();
  const { devLogin, devUser } = useDevAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (devUser) navigate('/development/dashboard', { replace: true });
  }, [devUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.');
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
    const result = await devLogin(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/development/dashboard');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  if (devUser) return null;

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logoMain} alt="BALANSÉ Wellness Hub" className="h-[60px] w-auto object-contain mx-auto mb-6" />
          <div className="inline-flex items-center gap-1.5 bg-[#1E2A35]/08 border border-[#1E2A35]/15 rounded-full px-3 py-1 mb-3">
            <Code2 size={11} className="text-[#C49A3C]" />
            <span className="text-[#1E2A35] text-xs font-bold uppercase tracking-widest">Development</span>
          </div>
          <h1
            className="text-[#1E2A35] leading-none mb-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.05em' }}
          >
            Dev Access
          </h1>
          <p className="text-[#8A7E6E] text-sm">Enter your development credentials.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-7">
          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="dev@yourdomain.com"
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-12 py-3.5 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] placeholder-[#C0B8A8] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all"
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

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
                <Code2 size={16} /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
