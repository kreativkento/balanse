import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { AccountImagesCard } from '../components/ProfileImages';

export default function StaffAccountPage() {
  const navigate = useNavigate();
  const { staffUser, staffProfile, updateStaffProfile } = useStaffAuth();

  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (!staffUser) navigate('/staff-login'); }, [staffUser, navigate]);
  if (!staffUser) return null;

  const handleSave = () => {
    setError('');
    if (!currentPw.trim()) { setError('Please enter your current password.'); return; }
    if (newPw.length < 6)  { setError('New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
    setSuccess(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setSuccess(false), 4000);
  };

  const INP = 'w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60 flex items-center gap-4">
          <button
            onClick={() => navigate('/staff-dashboard')}
            className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}>
              Account Settings
            </h1>
            <p className="text-[#8A7E6E] text-xs mt-0.5">Manage your staff account</p>
          </div>
        </div>

        <div className="py-6 pb-10 flex flex-col gap-5">

          <AccountImagesCard
            name={staffProfile?.displayName || staffUser.name}
            email={staffUser.email}
            roleLabel={staffUser.role}
            photoUrl={staffProfile?.photo || ''}
            coverUrl={staffProfile?.coverImage || ''}
            initials={staffUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            onPhotoUploaded={(url) => updateStaffProfile({ photo: url })}
            onCoverUploaded={(url) => updateStaffProfile({ coverImage: url })}
          />

          {/* Change Password */}
          <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
            <div className="px-6 py-4 border-b border-[#D4CDB5]/50 flex items-center gap-2 bg-[#F8F3E8]/60">
              <KeyRound size={15} className="text-[#745b3c]" />
              <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}>Change Password</h2>
            </div>

            <div className="px-6 py-6 flex flex-col gap-4">

              {/* Success banner */}
              {success && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                  <p className="text-green-700 text-sm font-semibold">Password updated successfully.</p>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => { setCurrentPw(e.target.value); setError(''); }}
                    placeholder="Enter your current password"
                    className={INP + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setError(''); }}
                    placeholder="Min. 6 characters"
                    className={INP + ' pr-12'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength bar */}
                {newPw.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          newPw.length >= i * 3
                            ? newPw.length < 6 ? 'bg-red-400' : newPw.length < 9 ? 'bg-amber-400' : 'bg-green-500'
                            : 'bg-[#EDE8D8]'
                        }`} />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${newPw.length < 6 ? 'text-red-500' : newPw.length < 9 ? 'text-amber-600' : 'text-green-600'}`}>
                      {newPw.length < 6 ? 'Weak' : newPw.length < 9 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                    placeholder="Re-enter your new password"
                    className={`${INP} pr-12 ${confirmPw && confirmPw !== newPw ? 'border-red-300 focus:ring-red-200/30' : confirmPw && confirmPw === newPw ? 'border-green-300 focus:ring-green-200/30' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPw && confirmPw === newPw && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><CheckCircle2 size={11} /> Passwords match</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-[#1E2A35] text-white rounded-full py-4 shadow-[0_4px_20px_rgba(30,42,53,0.2)] hover:bg-[#263545] active:scale-[0.97] transition-all mt-1"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
              >
                <KeyRound size={16} /> Update Password
              </button>

              <p className="text-[#B0A898] text-xs text-center leading-relaxed">
                Make sure to use a strong password you haven't used before.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
