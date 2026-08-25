import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, User, Award, Lock, Eye, EyeOff,
  Check, AlertTriangle, Save, Camera, ShieldCheck,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { NATIONALITIES } from '../data/nationalities';

// ─────────────────────────────────────────────
// SHARED STYLES  (mirrors ProfilePage exactly)
// ─────────────────────────────────────────────

const INPUT =
  'w-full rounded-xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] px-4 py-3 text-sm placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all';
const TEXTAREA = INPUT + ' resize-none';
const CARD = `bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-6 ${CARD_HOVER_GROW}`;
const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: '1.2rem',
  letterSpacing: '0.06em',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[#B0A898] text-xs mt-1">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────

const TABS = [
  { id: 'info'        as const, label: 'Coach Info',   Icon: User  },
  { id: 'credentials' as const, label: 'Credentials',  Icon: Award },
  { id: 'account'     as const, label: 'Account',      Icon: Lock  },
];
type TabId = typeof TABS[number]['id'];

const ALL_CLASSES = [
  'Yoga', 'Mat Pilates', 'Calisthenics', 'Animal Flow',
  'Kickboxing', 'Groundworks', 'Circuit Training', 'Capoeira', 'Personal Coaching',
];

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function StaffProfilePage() {
  const navigate = useNavigate();
  const { staffUser, staffProfile, updateStaffProfile, staffLogout } = useStaffAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<TabId>('info');

  // ── Coach Info ──
  const [displayName, setDisplayName] = useState(staffProfile?.displayName || staffUser?.name || '');
  const [phone, setPhone]             = useState('');
  const [nationality, setNationality] = useState(staffProfile?.nationality || '');
  const [photo, setPhoto]             = useState(staffProfile?.photo || '');
  const [photoPreview, setPhotoPreview] = useState(staffProfile?.photo || '');
  const [infoSaved, setInfoSaved]     = useState(false);

  // ── Credentials ──
  const [bio, setBio]               = useState(staffProfile?.bio || '');
  const [experience, setExperience] = useState(staffProfile?.experience || '');
  const [classes, setClasses]       = useState<string[]>(staffProfile?.classes || []);
  const [specialties, setSpecialties] = useState('');
  const [certifications, setCertifications] = useState('');
  const [credSaved, setCredSaved]   = useState(false);

  // ── Account / Password ──
  const [curPw, setCurPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk]     = useState(false);

  // ── Deactivate / Logout ──
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!staffUser) navigate('/staff-login');
  }, [staffUser, navigate]);

  useEffect(() => {
    if (!staffProfile) return;
    setDisplayName(staffProfile.displayName || staffUser?.name || '');
    setNationality(staffProfile.nationality || '');
    setPhoto(staffProfile.photo || '');
    setPhotoPreview(staffProfile.photo || '');
    setBio(staffProfile.bio || '');
    setExperience(staffProfile.experience || '');
    setClasses(staffProfile.classes || []);
  }, [staffProfile, staffUser?.name]);

  if (!staffUser) return null;

  const initials = (staffProfile?.displayName || staffUser.name)
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setPhoto(url);
      setPhotoPreview(url);
    };
    reader.readAsDataURL(file);
  };

  const saveInfo = () => {
    updateStaffProfile({
      displayName: displayName.trim() || staffUser.name,
      photo,
      nationality: nationality.trim(),
    });
    setInfoSaved(true);
    setTimeout(() => setInfoSaved(false), 2500);
  };

  const saveCredentials = () => {
    updateStaffProfile({ bio, experience, classes });
    setCredSaved(true);
    setTimeout(() => setCredSaved(false), 2500);
  };

  const changePassword = () => {
    setPwError('');
    if (!curPw)           return setPwError('Please enter your current password.');
    if (newPw.length < 6) return setPwError('New password must be at least 6 characters.');
    if (newPw !== confPw) return setPwError('New passwords do not match.');
    setPwOk(true);
    setCurPw(''); setNewPw(''); setConfPw('');
    setTimeout(() => setPwOk(false), 3000);
  };

  const toggleClass = (cls: string) =>
    setClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60 flex items-center gap-4">
          <button
            onClick={() => navigate('/staff-dashboard')}
            className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}
            >
              Coach Profile
            </h1>
            <p className="text-[#8A7E6E] text-xs mt-0.5">Manage your public profile and account settings</p>
          </div>
        </div>

        {/* ── Avatar + Identity ── */}
        <div className="py-6 flex items-center gap-4 border-b border-[#D4CDB5]/50">
          {/* Clickable photo avatar */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change photo"
            className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#745b3c]/40 bg-[#745b3c]/15 flex items-center justify-center shrink-0 group hover:border-[#745b3c]/70 transition-all"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" onError={() => setPhotoPreview('')} />
            ) : (
              <span className="text-[#5e4a30] font-black text-xl">{initials}</span>
            )}
            <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
              <Camera size={14} className="text-white" />
              <span className="text-white text-[9px] font-bold tracking-wide">EDIT</span>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <div>
            <h2
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}
            >
              {staffProfile?.displayName || staffUser.name}
            </h2>
            <p className="text-[#8A7E6E] text-sm">{staffUser.email}</p>
            <span className="inline-flex items-center gap-1.5 bg-[#745b3c]/10 text-[#5e4a30] text-xs font-bold px-2.5 py-1 rounded-full border border-[#745b3c]/25 mt-1.5">
              <ShieldCheck size={10} /> {staffUser.role}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-[#D4CDB5]/60 mt-2 mb-6">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                  active
                    ? 'border-[#745b3c] text-[#745b3c]'
                    : 'border-transparent text-[#8A7E6E] hover:text-[#1E2A35] hover:border-[#D4CDB5]'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="pb-12">

          {/* ══ COACH INFO ══ */}
          {tab === 'info' && (
            <div className="flex flex-col gap-4">

              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-5" style={SECTION_TITLE}>Basic Information</h3>
                <div className="flex flex-col gap-4">
                  <Field label="Display Name" hint="This is how your name appears to students.">
                    <input
                      className={INPUT}
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                    />
                  </Field>
                  <Field label="Email Address" hint="Email address cannot be changed.">
                    <input
                      className={INPUT + ' bg-[#F8F3E8] text-[#9A8E7E] cursor-not-allowed'}
                      value={staffUser.email}
                      readOnly
                    />
                  </Field>
                  <Field label="Nationality">
                    <select
                      className={`${INPUT} appearance-none ${!nationality ? 'text-[#C0B8A8]' : ''}`}
                      value={nationality}
                      onChange={e => setNationality(e.target.value)}
                    >
                      <option value="">Select nationality…</option>
                      {NATIONALITIES.map((item) => (
                        <option key={item} value={item} className="text-[#1E2A35]">
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-5" style={SECTION_TITLE}>Contact Information</h3>
                <div className="flex flex-col gap-4">
                  <Field label="Phone Number">
                    <input
                      className={INPUT}
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </Field>
                </div>
              </div>

              <button
                onClick={saveInfo}
                className={`w-full flex items-center justify-center gap-2 rounded-full py-4 transition-all active:scale-[0.97] ${
                  infoSaved
                    ? 'bg-[#8A9E7A] shadow-[0_4px_16px_rgba(138,158,122,0.3)]'
                    : 'bg-[#745b3c] shadow-[0_4px_16px_rgba(116,91,60,0.3)] hover:bg-[#5e4a30]'
                } text-white`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '1rem' }}
              >
                {infoSaved
                  ? <><Check size={17} /> Changes Saved!</>
                  : <><Save size={17} /> Save Changes</>}
              </button>
            </div>
          )}

          {/* ══ CREDENTIALS ══ */}
          {tab === 'credentials' && (
            <div className="flex flex-col gap-4">

              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-5" style={SECTION_TITLE}>Professional Background</h3>
                <div className="flex flex-col gap-4">
                  <Field label="Years of Experience">
                    <input
                      className={INPUT}
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      placeholder="e.g. 8 years"
                    />
                  </Field>
                  <Field label="Bio">
                    <textarea
                      className={TEXTAREA}
                      rows={4}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell students about your coaching background, style, and philosophy…"
                    />
                  </Field>
                  <Field label="Specialties">
                    <input
                      className={INPUT}
                      value={specialties}
                      onChange={e => setSpecialties(e.target.value)}
                      placeholder="e.g. Mobility & Flexibility, Strength Conditioning"
                    />
                  </Field>
                  <Field label="Certifications">
                    <textarea
                      className={TEXTAREA}
                      rows={3}
                      value={certifications}
                      onChange={e => setCertifications(e.target.value)}
                      placeholder="e.g. NSCA-CPT, Animal Flow Instructor L2, First Aid & CPR"
                    />
                  </Field>
                </div>
              </div>

              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-1" style={SECTION_TITLE}>Classes Taught</h3>
                <p className="text-[#8A7E6E] text-xs mb-5">Select all classes you coach at BALANSÉ.</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CLASSES.map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        classes.includes(cls)
                          ? 'bg-[#1E2A35] text-white border-[#1E2A35]'
                          : 'bg-white text-[#8A7E6E] border-[#D4CDB5]/70 hover:border-[#745b3c]/40'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={saveCredentials}
                className={`w-full flex items-center justify-center gap-2 rounded-full py-4 transition-all active:scale-[0.97] ${
                  credSaved
                    ? 'bg-[#8A9E7A] shadow-[0_4px_16px_rgba(138,158,122,0.3)]'
                    : 'bg-[#745b3c] shadow-[0_4px_16px_rgba(116,91,60,0.3)] hover:bg-[#5e4a30]'
                } text-white`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '1rem' }}
              >
                {credSaved
                  ? <><Check size={17} /> Saved!</>
                  : <><Save size={17} /> Save Credentials</>}
              </button>
            </div>
          )}

          {/* ══ ACCOUNT ══ */}
          {tab === 'account' && (
            <div className="flex flex-col gap-4">

              {/* Change Password */}
              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-1" style={SECTION_TITLE}>Change Password</h3>
                <p className="text-[#8A7E6E] text-xs mb-5">Choose a strong password — minimum 6 characters.</p>

                {pwOk && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 mb-4">
                    <Check size={15} className="text-green-600 shrink-0" />
                    <p className="text-green-700 text-sm">Password updated successfully.</p>
                  </div>
                )}
                {pwError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                    <p className="text-red-600 text-sm">{pwError}</p>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <Field label="Current Password">
                    <div className="relative">
                      <input
                        type={showCur ? 'text' : 'password'}
                        className={INPUT + ' pr-12'}
                        value={curPw}
                        onChange={e => { setCurPw(e.target.value); setPwError(''); }}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCur(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                      >
                        {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="New Password">
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        className={INPUT + ' pr-12'}
                        value={newPw}
                        onChange={e => { setNewPw(e.target.value); setPwError(''); }}
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                      >
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm New Password">
                    <input
                      type="password"
                      className={INPUT}
                      value={confPw}
                      onChange={e => { setConfPw(e.target.value); setPwError(''); }}
                      placeholder="Re-enter new password"
                    />
                  </Field>
                </div>

                <button
                  onClick={changePassword}
                  className="mt-5 w-full flex items-center justify-center gap-2 bg-[#1E2A35] text-white rounded-full py-3.5 hover:bg-[#263545] active:scale-[0.97] transition-all"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
                >
                  <Lock size={15} /> Update Password
                </button>
              </div>

              {/* Sign Out */}
              <div className="bg-white rounded-3xl border border-red-200/70 shadow-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-red-700 mb-1" style={SECTION_TITLE}>Sign Out</h3>
                    <p className="text-[#8A7E6E] text-xs leading-relaxed">
                      You will be signed out of the BALANSÉ coach portal and returned to the login screen.
                    </p>
                  </div>
                </div>

                {!confirmLogout ? (
                  <button
                    onClick={() => setConfirmLogout(true)}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-full py-3 hover:bg-red-100 active:scale-[0.97] transition-all text-sm font-semibold"
                  >
                    Sign Out of Portal
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmLogout(false)}
                      className="flex-1 py-3 bg-[#EDE8D8] text-[#1E2A35] rounded-full text-sm font-semibold active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { staffLogout(); navigate('/staff-login'); }}
                      className="flex-1 py-3 bg-red-600 text-white rounded-full text-sm font-bold active:scale-95 transition-all"
                    >
                      Confirm Sign Out
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
