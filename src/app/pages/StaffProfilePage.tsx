import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  User, Award, Lock, Eye, EyeOff, LogOut, ShieldCheck,
  Check, AlertTriangle, Save, Pencil, X,
} from 'lucide-react';
import { useStaffAuth, type CoachProfileData } from '../context/StaffAuthContext';
import { ProfileImageHero } from '../components/ProfileImages';
import { DashboardGreetingBar } from '../components/layout/DashboardGreetingBar';
import { AccountMenu } from '../components/layout/AccountMenu';
import { CountryFlag, CountrySelect } from '../components/CountrySelect';
import { ClearableInput, ClearableTextarea } from '../components/FieldClearButton';
import { getPhilippinesGreeting } from '../../lib/philippines-time';
import { profileScoreBarClasses } from '../../lib/profile-completion';
import { toCountryName } from '../data/nationalities';

const INPUT =
  'w-full rounded-xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] px-4 py-3 text-sm placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all';
const INPUT_ERROR =
  'border-red-400 focus:border-red-400 focus:ring-red-200/80';
const TEXTAREA = `${INPUT} resize-none`;
const CARD =
  'bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-6 transition-[box-shadow,border-color] duration-500 ease-in-out delay-100 hover:border-[#c49a3c] hover:shadow-[inset_0_0_0_3px_#c49a3c]';
const SLIM_SCROLL_OUTSET =
  'overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#C4B8A0_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C4B8A0] [&::-webkit-scrollbar-thumb:hover]:bg-[#c49a3c]/55';
const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: '1.2rem',
  letterSpacing: '0.06em',
};

const TABS = [
  { id: 'personal' as const, label: 'Personal Information', Icon: User },
  { id: 'credentials' as const, label: 'Credentials', Icon: Award },
];
const ACCOUNT_TAB = { id: 'account' as const, label: 'Account Settings', Icon: Lock };
type TabId = typeof TABS[number]['id'] | typeof ACCOUNT_TAB['id'];
type EditableCardId = 'basic' | 'contact' | 'professional' | 'classes';

const ALL_CLASSES = [
  'Yoga', 'Mat Pilates', 'Calisthenics', 'Animal Flow',
  'Kickboxing', 'Groundworks', 'Circuit Training', 'Capoeira', 'Personal Coaching',
];

const REQUIRED_MSG = 'This field is required.';

function displayText(value?: string | null, suffix = ''): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '--';
  return suffix ? `${trimmed}${suffix}` : trimmed;
}

function isFilled(value?: string | null): boolean {
  return Boolean((value ?? '').trim());
}

function requiredErrors<K extends string>(checks: Record<K, boolean>): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const key of Object.keys(checks) as K[]) {
    if (checks[key]) errors[key] = REQUIRED_MSG;
  }
  return errors;
}

function computeStaffProfileScore(profile: CoachProfileData | null): number {
  if (!profile) return 0;
  const checks = [
    profile.displayName?.trim(),
    profile.nationality?.trim(),
    profile.phone?.trim(),
    profile.photo?.trim(),
    profile.bio?.trim(),
    profile.experience?.trim(),
    profile.classes?.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function parseProfileTab(value: string | null): TabId | null {
  if (!value) return null;
  if (value === ACCOUNT_TAB.id) return ACCOUNT_TAB.id;
  return TABS.find((tab) => tab.id === value)?.id ?? null;
}

function Field({
  label,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-widest text-[#8A7E6E]">
        {label}
        {optional ? (
          <span className="ml-1.5 normal-case tracking-normal italic text-[#B0A898]">optional</span>
        ) : (
          <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs italic text-[#B0A898]">{hint}</p>
      ) : null}
    </div>
  );
}

function DisplayField({
  label,
  optional,
  value,
  multiline,
  leading,
}: {
  label: string;
  optional?: boolean;
  value: string;
  multiline?: boolean;
  leading?: ReactNode;
}) {
  const empty = value === '--';
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-widest text-[#8A7E6E]">
        {label}
        {optional && (
          <span className="ml-1.5 normal-case tracking-normal italic text-[#B0A898]">optional</span>
        )}
      </p>
      <div className="flex items-start gap-2">
        {!empty && leading}
        <p
          className={`text-sm ${empty ? 'text-[#B0A898]' : 'text-[#1E2A35]'} ${
            multiline ? 'whitespace-pre-wrap leading-relaxed' : ''
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function EditableCard({
  title,
  description,
  editing,
  onEdit,
  onCancel,
  onSave,
  saved,
  children,
  display,
}: {
  title: string;
  description?: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saved?: boolean;
  children: ReactNode;
  display: ReactNode;
}) {
  return (
    <div className={CARD}>
      <div className={`flex items-start justify-between gap-3 ${description ? 'mb-1' : 'mb-5'}`}>
        <h3 className="min-w-0 text-[#1E2A35]" style={SECTION_TITLE}>{title}</h3>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-2.5 py-1.5 text-xs font-semibold text-[#5A5048] transition-all hover:border-[#c49a3c]/40 hover:text-[#a67f2e]"
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
      {description && <p className="mb-5 text-xs text-[#8A7E6E]">{description}</p>}
      {editing ? (
        <>
          {children}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#D4CDB5]/80 bg-white py-3.5 text-[#5A5048] transition-all hover:bg-[#EDE8D8] active:scale-[0.97]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-white transition-all active:scale-[0.97] ${
                saved
                  ? 'bg-[#8A9E7A] shadow-[0_4px_16px_rgba(138,158,122,0.3)]'
                  : 'bg-[#c49a3c] shadow-[0_4px_16px_rgba(196,154,60,0.3)] hover:bg-[#a67f2e]'
              }`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
            >
              {saved ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save</>}
            </button>
          </div>
        </>
      ) : (
        display
      )}
    </div>
  );
}

function SectionNavButton({
  active,
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  const danger = tone === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all ${
        danger
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
          : active
            ? 'bg-[#1E2A35] text-white shadow-sm'
            : 'text-[#5A5048] hover:bg-[#EDE8D8] hover:text-[#1E2A35]'
      }`}
    >
      <span className={danger ? 'text-red-500' : active ? 'text-[#c49a3c]' : 'text-[#8A7E6E]'}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

export default function StaffProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { staffUser, staffProfile, updateStaffProfile, staffLogout } = useStaffAuth();

  const [tab, setTab] = useState<TabId>(() => parseProfileTab(searchParams.get('tab')) ?? 'personal');
  const [editingCard, setEditingCard] = useState<EditableCardId | null>(null);
  const [cardSaved, setCardSaved] = useState<EditableCardId | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [nationality, setNationality] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [basicErrors, setBasicErrors] = useState<{ displayName?: string; nationality?: string }>({});
  const [contactErrors, setContactErrors] = useState<{ phone?: string }>({});

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);

  useEffect(() => {
    if (!staffUser) navigate('/staff-login');
  }, [staffUser, navigate]);

  useEffect(() => {
    const next = parseProfileTab(searchParams.get('tab'));
    if (next) setTab(next);
  }, [searchParams]);

  const hydrateFromProfile = () => {
    if (!staffProfile) return;
    setDisplayName(staffProfile.displayName || staffUser?.name || '');
    setNationality(toCountryName(staffProfile.nationality));
    setPhone(staffProfile.phone || '');
    setBio(staffProfile.bio || '');
    setExperience(staffProfile.experience || '');
    setClasses(staffProfile.classes || []);
  };

  useEffect(() => {
    hydrateFromProfile();
    setEditingCard(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffUser?.email]);

  if (!staffUser || !staffProfile) return null;

  const initials = (staffProfile.displayName || staffUser.name)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const profileScore = computeStaffProfileScore(staffProfile);
  const profileScoreBar = profileScoreBarClasses(profileScore);
  const activeTab = tab === ACCOUNT_TAB.id
    ? ACCOUNT_TAB
    : (TABS.find((item) => item.id === tab) ?? TABS[0]);
  const ActiveIcon = activeTab.Icon;

  const cancelEdit = () => {
    setEditingCard(null);
    setCardSaved(null);
    setBasicErrors({});
    setContactErrors({});
    hydrateFromProfile();
  };

  const markSaved = (card: EditableCardId) => {
    setCardSaved(card);
    setTimeout(() => {
      setCardSaved((current) => (current === card ? null : current));
      setEditingCard((current) => (current === card ? null : current));
    }, 900);
  };

  const startEdit = (card: EditableCardId) => {
    hydrateFromProfile();
    setCardSaved(null);
    setBasicErrors({});
    setContactErrors({});
    if (card === 'basic') {
      setBasicErrors(requiredErrors({
        displayName: !isFilled(staffProfile.displayName),
        nationality: !isFilled(staffProfile.nationality),
      }));
    }
    if (card === 'contact') {
      setContactErrors(requiredErrors({
        phone: !isFilled(staffProfile.phone),
      }));
    }
    setEditingCard(card);
  };

  const saveBasic = () => {
    const nextErrors = requiredErrors({
      displayName: !displayName.trim(),
      nationality: !nationality.trim(),
    });
    if (Object.keys(nextErrors).length > 0) {
      setBasicErrors(nextErrors);
      return;
    }
    setBasicErrors({});
    updateStaffProfile({
      displayName: displayName.trim(),
      nationality: nationality.trim(),
    });
    markSaved('basic');
  };

  const saveContact = () => {
    const nextErrors = requiredErrors({
      phone: !phone.trim(),
    });
    if (Object.keys(nextErrors).length > 0) {
      setContactErrors(nextErrors);
      return;
    }
    setContactErrors({});
    updateStaffProfile({ phone: phone.trim() });
    markSaved('contact');
  };

  const saveProfessional = () => {
    updateStaffProfile({ bio: bio.trim(), experience: experience.trim() });
    markSaved('professional');
  };

  const saveClasses = () => {
    updateStaffProfile({ classes });
    markSaved('classes');
  };

  const toggleClass = (cls: string) => {
    setClasses((current) =>
      current.includes(cls) ? current.filter((item) => item !== cls) : [...current, cls],
    );
  };

  const changePassword = () => {
    setPwError('');
    if (!curPw) return setPwError('Please enter your current password.');
    if (newPw.length < 6) return setPwError('New password must be at least 6 characters.');
    if (newPw !== confPw) return setPwError('New passwords do not match.');
    setPwOk(true);
    setCurPw('');
    setNewPw('');
    setConfPw('');
    setTimeout(() => setPwOk(false), 3000);
  };

  const handleLogout = () => {
    void staffLogout();
    navigate('/staff-login');
  };

  return (
    <div className="min-h-full bg-[#F8F3E8]">
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-16 md:px-8">
        <DashboardGreetingBar
          greeting={getPhilippinesGreeting()}
          firstName={staffProfile.displayName || staffUser.name}
          searchPlaceholder="Search profile…"
          leadingExtra={
            <span className="mb-1 inline-flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-[#c49a3c]" />
              <span className="rounded-full border border-[#c49a3c]/25 bg-[#c49a3c]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#a67f2e]">
                {staffUser.role}
              </span>
            </span>
          }
          accountMenu={
            <AccountMenu
              onLogout={handleLogout}
              name={staffProfile.displayName || staffUser.name}
              email={staffUser.email}
              photo={staffProfile.photo}
              profilePath="/staff-profile?tab=account"
            />
          }
        />

        <div className="grid min-w-0 gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start lg:gap-0">
          <div className="order-2 flex min-w-0 flex-col lg:order-1 lg:pr-6">
            <div className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#D4CDB5]/60 pb-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
                  <ActiveIcon size={16} />
                </span>
                <h2
                  className="min-w-0 truncate leading-tight text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
                >
                  {activeTab.label}
                </h2>
              </div>
              <div className="w-full max-w-[12rem] shrink-0 rounded-2xl border border-[#D4CDB5]/60 bg-white px-3.5 py-2.5 shadow-sm">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-xs text-[#5A5048]">Profile Completion</p>
                  <span
                    className={`font-semibold ${profileScoreBar.text}`}
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.04em' }}
                  >
                    {profileScore}%
                  </span>
                </div>
                <div
                  className={`h-2 w-full overflow-hidden rounded-full ${profileScoreBar.track}`}
                  role="progressbar"
                  aria-valuenow={profileScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completion"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${profileScoreBar.bar}`}
                    style={{ width: `${Math.min(100, Math.max(0, profileScore))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className={`pb-4 ${SLIM_SCROLL_OUTSET}`}>
              {tab === 'personal' && (
                <div className="flex flex-col gap-4">
                  <EditableCard
                    title="Basic Information"
                    editing={editingCard === 'basic'}
                    onEdit={() => startEdit('basic')}
                    onCancel={cancelEdit}
                    onSave={saveBasic}
                    saved={cardSaved === 'basic'}
                    display={
                      <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
                        <DisplayField label="Display Name" value={displayText(staffProfile.displayName)} />
                        <DisplayField label="Email Address" value={displayText(staffUser.email)} />
                        <div className="sm:col-span-2">
                          <DisplayField
                            label="Nationality"
                            value={displayText(toCountryName(staffProfile.nationality))}
                            leading={
                              staffProfile.nationality
                                ? <CountryFlag country={toCountryName(staffProfile.nationality)} />
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-4">
                      <Field label="Display Name" hint="This is how your name appears to students." error={basicErrors.displayName}>
                        <ClearableInput
                          className={`${INPUT} ${basicErrors.displayName ? INPUT_ERROR : ''}`}
                          value={displayName}
                          onChange={(event) => {
                            setDisplayName(event.target.value);
                            if (basicErrors.displayName) {
                              setBasicErrors((current) => {
                                const next = { ...current };
                                delete next.displayName;
                                return next;
                              });
                            }
                          }}
                          onClear={() => setDisplayName('')}
                          placeholder="Your display name"
                        />
                      </Field>
                      <Field label="Email Address" optional hint="Email address cannot be changed.">
                        <ClearableInput
                          className={`${INPUT} cursor-not-allowed bg-[#F8F3E8] text-[#9A8E7E]`}
                          value={staffUser.email}
                          readOnly
                          onChange={() => {}}
                          onClear={() => {}}
                        />
                      </Field>
                      <Field label="Nationality" error={basicErrors.nationality}>
                        <CountrySelect
                          value={nationality}
                          invalid={Boolean(basicErrors.nationality)}
                          onChange={(next) => {
                            setNationality(next);
                            if (basicErrors.nationality) {
                              setBasicErrors((current) => {
                                const nextErrors = { ...current };
                                delete nextErrors.nationality;
                                return nextErrors;
                              });
                            }
                          }}
                        />
                      </Field>
                    </div>
                  </EditableCard>

                  <EditableCard
                    title="Contact Information"
                    editing={editingCard === 'contact'}
                    onEdit={() => startEdit('contact')}
                    onCancel={cancelEdit}
                    onSave={saveContact}
                    saved={cardSaved === 'contact'}
                    display={
                      <DisplayField label="Phone Number" value={displayText(staffProfile.phone)} />
                    }
                  >
                    <Field label="Phone Number" error={contactErrors.phone}>
                      <ClearableInput
                        className={`${INPUT} ${contactErrors.phone ? INPUT_ERROR : ''}`}
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        value={phone}
                        onChange={(event) => {
                          setPhone(event.target.value);
                          if (contactErrors.phone) {
                            setContactErrors((current) => {
                              const next = { ...current };
                              delete next.phone;
                              return next;
                            });
                          }
                        }}
                        onClear={() => setPhone('')}
                        placeholder="09171234567"
                        autoComplete="tel"
                      />
                    </Field>
                  </EditableCard>
                </div>
              )}

              {tab === 'credentials' && (
                <div className="flex flex-col gap-4">
                  <EditableCard
                    title="Professional Background"
                    editing={editingCard === 'professional'}
                    onEdit={() => startEdit('professional')}
                    onCancel={cancelEdit}
                    onSave={saveProfessional}
                    saved={cardSaved === 'professional'}
                    display={
                      <div className="grid grid-cols-1 gap-x-5 gap-y-3">
                        <DisplayField label="Years of Experience" value={displayText(staffProfile.experience)} />
                        <DisplayField label="Bio" multiline value={displayText(staffProfile.bio)} />
                      </div>
                    }
                  >
                    <div className="flex flex-col gap-4">
                      <Field label="Years of Experience">
                        <ClearableInput
                          className={INPUT}
                          value={experience}
                          onChange={(event) => setExperience(event.target.value)}
                          onClear={() => setExperience('')}
                          placeholder="e.g. 8 years"
                        />
                      </Field>
                      <Field label="Bio">
                        <ClearableTextarea
                          className={TEXTAREA}
                          rows={4}
                          value={bio}
                          onChange={(event) => setBio(event.target.value)}
                          onClear={() => setBio('')}
                          placeholder="Tell students about your coaching background, style, and philosophy…"
                        />
                      </Field>
                    </div>
                  </EditableCard>

                  <EditableCard
                    title="Classes Taught"
                    description="Select all classes you coach at BALANSÉ."
                    editing={editingCard === 'classes'}
                    onEdit={() => startEdit('classes')}
                    onCancel={cancelEdit}
                    onSave={saveClasses}
                    saved={cardSaved === 'classes'}
                    display={
                      <div className="flex flex-wrap gap-2">
                        {staffProfile.classes.length > 0 ? (
                          staffProfile.classes.map((cls) => (
                            <span
                              key={cls}
                              className="rounded-full border border-[#1E2A35] bg-[#1E2A35] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              {cls}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-[#B0A898]">--</p>
                        )}
                      </div>
                    }
                  >
                    <div className="flex flex-wrap gap-2">
                      {ALL_CLASSES.map((cls) => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleClass(cls)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                            classes.includes(cls)
                              ? 'border-[#1E2A35] bg-[#1E2A35] text-white'
                              : 'border-[#D4CDB5]/70 bg-white text-[#8A7E6E] hover:border-[#c49a3c]/40'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </EditableCard>
                </div>
              )}

              {tab === 'account' && (
                <div className="flex flex-col gap-4">
                  <div className={CARD}>
                    <h3 className="mb-1 text-[#1E2A35]" style={SECTION_TITLE}>Change Password</h3>
                    <p className="mb-5 text-xs text-[#8A7E6E]">Choose a strong password — minimum 6 characters.</p>

                    {pwOk && (
                      <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                        <Check size={15} className="shrink-0 text-green-600" />
                        <p className="text-sm text-green-700">Password updated successfully.</p>
                      </div>
                    )}
                    {pwError && (
                      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-sm text-red-600">{pwError}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      <Field label="Current Password">
                        <div className="relative">
                          <ClearableInput
                            type={showCur ? 'text' : 'password'}
                            className={`${INPUT} ${curPw ? 'pr-24' : 'pr-12'}`}
                            value={curPw}
                            onChange={(event) => { setCurPw(event.target.value); setPwError(''); }}
                            onClear={() => { setCurPw(''); setPwError(''); }}
                            placeholder="••••••••"
                            clearClassName="right-10 top-1/2 -translate-y-1/2"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCur((value) => !value)}
                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#B0A898] transition-colors hover:text-[#8A7E6E]"
                          >
                            {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </Field>

                      <Field label="New Password">
                        <div className="relative">
                          <ClearableInput
                            type={showNew ? 'text' : 'password'}
                            className={`${INPUT} ${newPw ? 'pr-24' : 'pr-12'}`}
                            value={newPw}
                            onChange={(event) => { setNewPw(event.target.value); setPwError(''); }}
                            onClear={() => { setNewPw(''); setPwError(''); }}
                            placeholder="At least 6 characters"
                            clearClassName="right-10 top-1/2 -translate-y-1/2"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((value) => !value)}
                            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[#B0A898] transition-colors hover:text-[#8A7E6E]"
                          >
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </Field>

                      <Field label="Confirm New Password">
                        <ClearableInput
                          type="password"
                          className={INPUT}
                          value={confPw}
                          onChange={(event) => { setConfPw(event.target.value); setPwError(''); }}
                          onClear={() => { setConfPw(''); setPwError(''); }}
                          placeholder="Re-enter new password"
                        />
                      </Field>
                    </div>

                    <button
                      type="button"
                      onClick={changePassword}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#1E2A35] py-3.5 text-white transition-all hover:bg-[#263545] active:scale-[0.97]"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
                    >
                      <Lock size={15} /> Update Password
                    </button>
                  </div>

                  <div className="rounded-3xl border border-red-200/70 bg-white p-6 opacity-55" aria-disabled="true">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50">
                        <AlertTriangle size={16} className="text-red-500" />
                      </div>
                      <div>
                        <h3 className="mb-1 text-red-700" style={SECTION_TITLE}>Deactivate Account</h3>
                        <p className="text-xs leading-relaxed text-[#8A7E6E]">
                          This will remove your access to the BALANSÉ coach portal until an administrator reactivates your account.
                        </p>
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-[#B0A898]">
                          Coming soon
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 opacity-70"
                    >
                      Deactivate My Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="order-1 flex min-w-0 max-w-full flex-col gap-3 lg:sticky lg:top-6 lg:order-2 lg:self-start lg:border-l lg:border-[#D4CDB5]/50 lg:pl-6">
            <div className="w-full min-w-0 shrink-0 overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
              <ProfileImageHero
                photoUrl={staffProfile.photo}
                coverUrl={staffProfile.coverImage}
                initials={initials}
                editable
                coverClassName="h-28 md:h-32"
                onPhotoUploaded={(url) => updateStaffProfile({ photo: url })}
                onCoverUploaded={(url) => updateStaffProfile({ coverImage: url })}
              />
              <div className="px-5 pb-4 pt-12 md:px-6 md:pt-14">
                <h2
                  className="truncate leading-tight text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.04em' }}
                >
                  {staffProfile.displayName || staffUser.name}
                </h2>
                <p className="truncate text-sm text-[#8A7E6E]">{staffUser.email}</p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#c49a3c]/25 bg-[#c49a3c]/10 px-2.5 py-1 text-xs font-bold text-[#a67f2e]">
                  <ShieldCheck size={10} /> {staffUser.role}
                </span>
              </div>
            </div>

            <nav
              className="w-full min-w-0 shrink-0 rounded-3xl border border-[#D4CDB5]/60 bg-white px-4 py-3 shadow-sm"
              aria-label="Profile sections"
            >
              <div className="flex flex-col gap-1">
                {TABS.map(({ id, label, Icon }) => (
                  <SectionNavButton
                    key={id}
                    active={tab === id}
                    icon={<Icon size={14} />}
                    label={label}
                    onClick={() => {
                      setTab(id);
                      cancelEdit();
                    }}
                  />
                ))}
              </div>
            </nav>

            <nav
              className="w-full min-w-0 shrink-0 rounded-3xl border border-[#D4CDB5]/60 bg-white px-4 py-3 shadow-sm"
              aria-label="Account"
            >
              <div className="flex flex-col gap-1">
                <SectionNavButton
                  active={tab === ACCOUNT_TAB.id}
                  icon={<ACCOUNT_TAB.Icon size={14} />}
                  label={ACCOUNT_TAB.label}
                  onClick={() => {
                    setTab(ACCOUNT_TAB.id);
                    cancelEdit();
                  }}
                />
                <SectionNavButton
                  tone="danger"
                  icon={<LogOut size={14} />}
                  label="Log Out"
                  onClick={handleLogout}
                />
              </div>
            </nav>
          </aside>
        </div>
      </div>
    </div>
  );
}
