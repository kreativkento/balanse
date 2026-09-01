import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, User, Heart, Lock, Eye, EyeOff,
  Check, AlertTriangle, Shield, Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { ProfileImageHero } from '../components/ProfileImages';

// ─────────────────────────────────────────────
// SHARED STYLES
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────

const TABS = [
  { id: 'personal' as const, label: 'Personal Info',    Icon: User  },
  { id: 'medical'  as const, label: 'Medical History',  Icon: Heart },
  { id: 'account'  as const, label: 'Account',          Icon: Lock  },
];
type TabId = typeof TABS[number]['id'];

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();

  const [tab, setTab] = useState<TabId>('personal');

  // ── Personal ──
  const [name, setName]                 = useState(user?.name || '');
  const [phone, setPhone]               = useState('');
  const [address, setAddress]           = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [personalSaved, setPersonalSaved] = useState(false);

  // ── Medical ──
  const [conditions, setConditions]   = useState('');
  const [allergies, setAllergies]     = useState('');
  const [medications, setMedications] = useState('');
  const [medNotes, setMedNotes]       = useState('');
  const [consent, setConsent]         = useState(false);
  const [medSaved, setMedSaved]       = useState(false);

  // ── Password ──
  const [curPw, setCurPw]     = useState('');
  const [newPw, setNewPw]     = useState('');
  const [confPw, setConfPw]   = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk]       = useState(false);

  // ── Deactivate ──
  const [deactivating, setDeactivating]   = useState(false);
  const [deactivateVal, setDeactivateVal] = useState('');

  const savePersonal = () => {
    setPersonalSaved(true);
    setTimeout(() => setPersonalSaved(false), 2500);
  };

  const saveMedical = () => {
    setMedSaved(true);
    setTimeout(() => setMedSaved(false), 2500);
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

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'M';

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}
            >
              My Profile
            </h1>
            <p className="text-[#8A7E6E] text-xs mt-0.5">Manage your personal details and account settings</p>
          </div>
        </div>

        {/* ── Cover + Avatar ── */}
        <div className="mt-6 mb-2 overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
          <ProfileImageHero
            photoUrl={user?.profile.photo || ''}
            coverUrl={user?.profile.coverImage || ''}
            initials={initials}
            editable
            onPhotoUploaded={(url) => updateProfile({ photo: url })}
            onCoverUploaded={(url) => updateProfile({ coverImage: url })}
          />
          <div className="px-6 pb-5 pt-14 md:px-8 md:pt-16">
            <h2
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}
            >
              {user?.name || 'Member'}
            </h2>
            <p className="text-[#8A7E6E] text-sm">{user?.email}</p>
            <span className="inline-flex items-center gap-1.5 bg-[#745b3c]/10 text-[#5e4a30] text-xs font-bold px-2.5 py-1 rounded-full border border-[#745b3c]/25 mt-1.5">
              <Shield size={10} /> Gold Membership · Active
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

          {/* ══ PERSONAL INFO ══ */}
          {tab === 'personal' && (
            <div className="flex flex-col gap-4">
              {/* Basic */}
              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-5" style={SECTION_TITLE}>Basic Information</h3>
                <div className="flex flex-col gap-4">
                  <Field label="Full Name">
                    <input
                      className={INPUT}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </Field>
                  <Field label="Email Address">
                    <input
                      className={INPUT + ' bg-[#F8F3E8] text-[#9A8E7E] cursor-not-allowed'}
                      value={user?.email || ''}
                      readOnly
                    />
                    <p className="text-[#B0A898] text-xs mt-1">Email address cannot be changed.</p>
                  </Field>
                </div>
              </div>

              {/* Contact */}
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
                  <Field label="Home Address">
                    <textarea
                      className={TEXTAREA}
                      rows={2}
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Street, Barangay, City, Province"
                    />
                  </Field>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-1" style={SECTION_TITLE}>Emergency Contact</h3>
                <p className="text-[#8A7E6E] text-xs mb-5">Person to notify in case of emergency during class.</p>
                <div className="flex flex-col gap-4">
                  <Field label="Contact Name">
                    <input
                      className={INPUT}
                      value={emergencyName}
                      onChange={e => setEmergencyName(e.target.value)}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Contact Number">
                    <input
                      className={INPUT}
                      type="tel"
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </Field>
                </div>
              </div>

              <button
                onClick={savePersonal}
                className={`w-full flex items-center justify-center gap-2 rounded-full py-4 transition-all active:scale-[0.97] ${
                  personalSaved
                    ? 'bg-[#8A9E7A] shadow-[0_4px_16px_rgba(138,158,122,0.3)]'
                    : 'bg-[#745b3c] shadow-[0_4px_16px_rgba(116,91,60,0.3)] hover:bg-[#5e4a30]'
                } text-white`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '1rem' }}
              >
                {personalSaved
                  ? <><Check size={17} /> Changes Saved!</>
                  : <><Save size={17} /> Save Changes</>}
              </button>
            </div>
          )}

          {/* ══ MEDICAL HISTORY ══ */}
          {tab === 'medical' && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#745b3c]/06 border border-[#745b3c]/20 rounded-2xl px-4 py-3 flex items-start gap-3">
                <Shield size={15} className="text-[#745b3c] mt-0.5 shrink-0" />
                <p className="text-[#7A6A52] text-xs leading-relaxed">
                  This information is strictly confidential and shared only with your assigned coaches
                  to ensure your safety and wellbeing during every session.
                </p>
              </div>

              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-5" style={SECTION_TITLE}>Health Information</h3>
                <div className="flex flex-col gap-4">
                  <Field label="Known Medical Conditions">
                    <textarea
                      className={TEXTAREA}
                      rows={3}
                      value={conditions}
                      onChange={e => setConditions(e.target.value)}
                      placeholder="e.g. Asthma, Hypertension, Heart condition, Diabetes — leave blank if none"
                    />
                  </Field>
                  <Field label="Allergies">
                    <textarea
                      className={TEXTAREA}
                      rows={2}
                      value={allergies}
                      onChange={e => setAllergies(e.target.value)}
                      placeholder="e.g. Latex, dust, certain medications — leave blank if none"
                    />
                  </Field>
                  <Field label="Current Medications">
                    <textarea
                      className={TEXTAREA}
                      rows={2}
                      value={medications}
                      onChange={e => setMedications(e.target.value)}
                      placeholder="List any medications you are currently taking — leave blank if none"
                    />
                  </Field>
                  <Field label="Additional Notes">
                    <textarea
                      className={TEXTAREA}
                      rows={2}
                      value={medNotes}
                      onChange={e => setMedNotes(e.target.value)}
                      placeholder="Injuries, physical limitations, or anything your coach should know"
                    />
                  </Field>
                </div>
              </div>

              <div className={CARD}>
                <h3 className="text-[#1E2A35] mb-4" style={SECTION_TITLE}>Fitness Consent Declaration</h3>
                <label
                  className="flex items-start gap-3 cursor-pointer group"
                  onClick={() => setConsent(v => !v)}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      consent
                        ? 'bg-[#745b3c] border-[#745b3c]'
                        : 'border-[#D4CDB5] group-hover:border-[#745b3c]/60'
                    }`}
                  >
                    {consent && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <p className="text-[#5A5048] text-sm leading-relaxed">
                    I confirm that I am physically capable of participating in fitness activities at BALANSÉ.
                    I have disclosed all relevant medical conditions above and agree to notify BALANSÉ
                    of any changes to my health status before attending future sessions.
                  </p>
                </label>
              </div>

              <button
                onClick={saveMedical}
                className={`w-full flex items-center justify-center gap-2 rounded-full py-4 transition-all active:scale-[0.97] ${
                  medSaved
                    ? 'bg-[#8A9E7A] shadow-[0_4px_16px_rgba(138,158,122,0.3)]'
                    : 'bg-[#745b3c] shadow-[0_4px_16px_rgba(116,91,60,0.3)] hover:bg-[#5e4a30]'
                } text-white`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '1rem' }}
              >
                {medSaved
                  ? <><Check size={17} /> Saved!</>
                  : <><Save size={17} /> Save Medical Info</>}
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

              {/* Deactivate */}
              <div className="bg-white rounded-3xl border border-red-200/70 shadow-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-red-700 mb-1" style={SECTION_TITLE}>Deactivate Account</h3>
                    <p className="text-[#8A7E6E] text-xs leading-relaxed">
                      This will cancel all upcoming bookings and permanently remove your access to BALANSÉ.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                {!deactivating ? (
                  <button
                    onClick={() => setDeactivating(true)}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-full py-3 hover:bg-red-100 active:scale-[0.97] transition-all text-sm font-semibold"
                  >
                    Deactivate My Account
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-[#5A5048] text-sm">
                      Type <strong className="text-red-600 font-mono">DEACTIVATE</strong> to confirm:
                    </p>
                    <input
                      type="text"
                      className={INPUT}
                      value={deactivateVal}
                      onChange={e => setDeactivateVal(e.target.value)}
                      placeholder="DEACTIVATE"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setDeactivating(false); setDeactivateVal(''); }}
                        className="flex-1 py-3 bg-[#EDE8D8] text-[#1E2A35] rounded-full text-sm font-semibold active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={deactivateVal !== 'DEACTIVATE'}
                        onClick={() => { logout(); navigate('/'); }}
                        className="flex-1 py-3 bg-red-600 text-white rounded-full text-sm font-bold active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Confirm
                      </button>
                    </div>
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
