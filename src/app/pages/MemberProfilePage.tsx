import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  User, Heart, Lock, Eye, EyeOff,
  Check, AlertTriangle, Shield, Save, FileText, Download, Pencil, X, LogOut, ShieldCheck, Eraser,
} from 'lucide-react';
import { useAuth, type UserProfile } from '../context/AuthContext';
import { ProfileImageHero } from '../components/ProfileImages';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CountryFlag, CountrySelect } from '../components/CountrySelect';
import { ClearableInput, ClearableTextarea } from '../components/FieldClearButton';
import { SearchableSelect } from '../components/SearchableSelect';
import { exportTransparentSignaturePng, SignaturePad } from '../components/SignaturePad';
import { usePhAddressOptions } from '../components/usePhAddressOptions';
import { toCountryName } from '../data/nationalities';
import { buildFullName } from '../../lib/auth-helpers';
import {
  HEALTH_FORM_VERSION,
  HEALTH_QUESTIONS,
  emptyHealthAnswers,
  parseHealthDeclaration,
  serializeHealthDeclaration,
  type HealthAnswers,
} from '../../lib/health-declaration';
import { computeProfileScore, profileScoreBarClasses } from '../../lib/profile-completion';
import {
  CURRENT_DOCUMENTS,
  documentStatus,
  downloadMemberDocument,
  generateAndUploadHealthDeclarationPdf,
  loadMemberSignatureUrl,
  memberDocumentFileName,
  uploadMemberSignaturePng,
} from '../../lib/member-documents';
import {
  downloadSignedTermsPdf,
  getSignedTermsRecord,
  type SignedTermsRecord,
} from '../../lib/signed-terms';

// ─────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────

const INPUT =
  'w-full rounded-xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] px-4 py-3 text-sm placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all';
const INPUT_ERROR =
  'border-red-400 focus:border-red-400 focus:ring-red-200/80';
const TEXTAREA = INPUT + ' resize-none';
const CARD =
  'bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-6 transition-[box-shadow,border-color] duration-500 ease-in-out delay-100 hover:border-[#c49a3c] hover:shadow-[inset_0_0_0_3px_#c49a3c]';
const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: '1.2rem',
  letterSpacing: '0.06em',
};

const SEX_OPTIONS: { value: UserProfile['sex']; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const EMERGENCY_RELATIONSHIPS = [
  'Parent',
  'Spouse',
  'Partner',
  'Sibling',
  'Child',
  'Relative',
  'Friend',
  'Guardian',
  'Other',
];

type EditableCardId = 'basic' | 'contact' | 'emergency' | 'health';
type BasicRequiredKey = 'firstName' | 'lastName' | 'birthday' | 'sex' | 'nationality' | 'weight' | 'height';
type ContactRequiredKey = 'phone' | 'province' | 'city';
type EmergencyRequiredKey = 'name' | 'phone' | 'relationship';
const REQUIRED_MSG = 'This field is required.';

function requiredErrors<K extends string>(checks: Record<K, boolean>): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const key of Object.keys(checks) as K[]) {
    if (checks[key]) errors[key] = REQUIRED_MSG;
  }
  return errors;
}

function displayText(value?: string | null, suffix = ''): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '--';
  return suffix ? `${trimmed}${suffix}` : trimmed;
}

function formatBirthday(value?: string | null): string {
  const raw = (value ?? '').trim().slice(0, 10);
  if (!raw) return '--';
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function sexLabel(value?: UserProfile['sex'] | string | null): string {
  const match = SEX_OPTIONS.find((option) => option.value === value);
  return match?.label ?? '--';
}

function healthAnswerLabel(value: HealthAnswers[keyof HealthAnswers]): string {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return '--';
}

function isFilled(value?: string | null): boolean {
  return Boolean((value ?? '').trim());
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
      <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
        {label}
        {optional ? (
          <span className="ml-1.5 normal-case tracking-normal italic text-[#B0A898]">optional</span>
        ) : (
          <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      ) : hint ? (
        <p className="text-[#B0A898] text-xs mt-1 italic">{hint}</p>
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
      <p className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
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
        <h3 className="text-[#1E2A35] min-w-0" style={SECTION_TITLE}>{title}</h3>
        {!editing && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-2.5 py-1.5 text-xs font-semibold text-[#5A5048] hover:border-[#c49a3c]/40 hover:text-[#a67f2e] transition-all"
          >
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
      {description && <p className="text-[#8A7E6E] text-xs mb-5">{description}</p>}
      {editing ? (
        <>
          {children}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 rounded-full border border-[#D4CDB5]/80 bg-white py-3.5 text-[#5A5048] hover:bg-[#EDE8D8] active:scale-[0.97] transition-all"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3.5 transition-all active:scale-[0.97] ${
                saved
                  ? 'bg-[#8A9E7A] shadow-[0_4px_16px_rgba(138,158,122,0.3)]'
                  : 'bg-[#c49a3c] shadow-[0_4px_16px_rgba(196,154,60,0.3)] hover:bg-[#a67f2e]'
              } text-white`}
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

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────

const TABS = [
  { id: 'personal' as const, label: 'Personal Information', Icon: User },
  { id: 'medical'  as const, label: 'Health Declaration',   Icon: Heart },
  { id: 'terms'    as const, label: 'Terms & Conditions',   Icon: FileText },
  { id: 'privacy'  as const, label: 'Privacy Policy',     Icon: ShieldCheck },
];
const ACCOUNT_TAB = { id: 'account' as const, label: 'Account Settings', Icon: Lock };
type TabId = typeof TABS[number]['id'] | typeof ACCOUNT_TAB['id'];

function parseProfileTab(value: string | null): TabId | null {
  if (!value) return null;
  if (value === ACCOUNT_TAB.id) return ACCOUNT_TAB.id;
  return TABS.find((tab) => tab.id === value)?.id ?? null;
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
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
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

function SignedDocumentTab({
  email,
  name,
  kind,
  documentName,
  subtitle,
  unsignedAccepted,
  unsignedPending,
  path,
  acceptedVersion,
  signedAt,
  accepted,
  localRecord,
}: {
  email?: string;
  name?: string;
  kind: 'terms' | 'privacy';
  documentName: string;
  subtitle: string;
  unsignedAccepted: string;
  unsignedPending: string;
  path?: string;
  acceptedVersion?: string;
  signedAt?: string;
  accepted: boolean;
  localRecord?: SignedTermsRecord | null;
}) {
  const navigate = useNavigate();
  const current = CURRENT_DOCUMENTS[kind];
  const status = documentStatus(kind, { path, version: acceptedVersion, signedAt, accepted });
  const signed = Boolean(path) || Boolean(localRecord?.pdfDataUrl);
  const signedLabel = signedAt
    ? new Date(signedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
    : localRecord?.signedAt
      ? new Date(localRecord.signedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
      : null;

  const handleDownload = async () => {
    if (path) {
      await downloadMemberDocument(path, memberDocumentFileName(kind, acceptedVersion || current.version));
      return;
    }
    if (localRecord) downloadSignedTermsPdf(localRecord);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={CARD}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="text-[#1E2A35] mb-1" style={SECTION_TITLE}>Signed Document</h3>
            <p className="text-[#8A7E6E] text-xs">{subtitle}</p>
          </div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
              signed
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60'
            }`}
          >
            {signed ? 'Signed' : 'Not signed'}
          </span>
        </div>

        {signed ? (
          <>
            <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-4 flex flex-col gap-2.5 mb-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">Document</span>
                <span className="text-[#1E2A35] text-xs font-semibold text-right">{documentName}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">Signed by</span>
                <span className="text-[#1E2A35] text-xs font-semibold text-right">{localRecord?.signerName || name}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">Account</span>
                <span className="text-[#1E2A35] text-xs font-semibold text-right break-all">{localRecord?.email || email}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">Signed on</span>
                <span className="text-[#1E2A35] text-xs font-semibold text-right">{signedLabel ?? '--'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">You signed</span>
                <span className="text-[#1E2A35] text-xs font-semibold text-right">{acceptedVersion || '--'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">Current policy</span>
                <span className="text-[#1E2A35] text-xs font-semibold text-right">{current.label}</span>
              </div>
            </div>

            {status === 'accepted_legacy' && (
              <p className="mb-4 text-xs leading-relaxed text-[#8A7E6E]">
                Your agreement dated {signedLabel ?? acceptedVersion} remains in effect. The studio policy was later updated to {current.label}. That update did not replace this signed PDF.
              </p>
            )}
            {status === 'reaccept_required' && (
              <p className="mb-4 text-xs leading-relaxed text-red-600">
                This policy changed in a way that requires a new signature. Please complete Profile Setup again for the current version.
              </p>
            )}

            {localRecord?.signatureDataUrl && (
              <div className="mb-5">
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Electronic signature</p>
                <div className="rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8] px-4 py-3">
                  <img src={localRecord.signatureDataUrl} alt="Your electronic signature" className="h-16 w-auto max-w-full object-contain" />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void handleDownload().catch((err) => {
                  console.error('Failed to download signed PDF:', err);
                });
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#1E2A35] text-white rounded-full py-3.5 hover:bg-[#263545] active:scale-[0.97] transition-all"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
            >
              <Download size={16} /> Download Signed PDF
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center mb-3">
              <FileText size={22} className="text-[#c49a3c]/70" />
            </div>
            <p className="text-[#1E2A35] text-sm font-semibold mb-1">No signed PDF on file</p>
            <p className="text-[#8A7E6E] text-xs leading-relaxed max-w-sm">
              {accepted ? unsignedAccepted : unsignedPending}
            </p>
            <button
              type="button"
              onClick={() => navigate('/profile-setup')}
              className="mt-4 flex items-center justify-center gap-1 text-[#c49a3c] text-xs font-bold border border-[#c49a3c]/40 px-4 py-2 rounded-xl hover:bg-[#c49a3c]/08 transition-all"
            >
              Go to Profile Setup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

export default function MemberProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const profile = user?.profile;

  const [tab, setTab] = useState<TabId>(() => parseProfileTab(searchParams.get('tab')) ?? 'personal');
  const [editingCard, setEditingCard] = useState<EditableCardId | null>(null);
  const [cardSaved, setCardSaved] = useState<EditableCardId | null>(null);

  // ── Personal draft (active while a personal card is editing) ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [birthday, setBirthday] = useState('');
  const [sex, setSex] = useState<UserProfile['sex']>('');
  const [nationality, setNationality] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [barangay, setBarangay] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [basicErrors, setBasicErrors] = useState<Partial<Record<BasicRequiredKey, string>>>({});
  const [contactErrors, setContactErrors] = useState<Partial<Record<ContactRequiredKey, string>>>({});
  const [emergencyErrors, setEmergencyErrors] = useState<Partial<Record<EmergencyRequiredKey, string>>>({});

  // ── Medical draft ──
  const [healthAnswers, setHealthAnswers] = useState<HealthAnswers>(() => emptyHealthAnswers());
  const [healthDetails, setHealthDetails] = useState('');
  const [consent, setConsent] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [healthHasInk, setHealthHasInk] = useState(false);
  const [healthPadKey, setHealthPadKey] = useState(0);
  const [healthSignaturePath, setHealthSignaturePath] = useState('');
  const [healthSignatureUrl, setHealthSignatureUrl] = useState('');
  const healthSignatureRef = useRef<HTMLCanvasElement>(null);

  // ── Password ──
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confPw, setConfPw] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);

  const hydratePersonalFromProfile = () => {
    if (!profile) return;
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setMiddleInitial(profile.middleInitial || '');
    setBirthday((profile.birthday || '').slice(0, 10));
    setSex(profile.sex || '');
    setNationality(toCountryName(profile.nationality));
    setWeight(profile.weight || '');
    setHeight(profile.height || '');
    setPhone(profile.phone || '');
    setProvince(profile.province || '');
    setCity(profile.city || '');
    setBarangay(profile.barangay || '');
    setEmergencyName(profile.emergencyContactName || '');
    setEmergencyPhone(profile.emergencyContactNumber || '');
    setEmergencyRelationship(profile.emergencyContactRelationship || '');
  };

  const hydrateMedicalFromProfile = () => {
    if (!profile) return;
    const medical = parseHealthDeclaration(profile.healthDeclaration);
    setHealthAnswers(medical.answers);
    setHealthDetails(medical.details);
    setConsent(medical.acknowledged);
    setHealthSignaturePath(medical.signaturePath || '');
    setHealthHasInk(false);
    setHealthPadKey((key) => key + 1);
    setHealthError('');
    if (medical.signaturePath) {
      void loadMemberSignatureUrl(medical.signaturePath).then(setHealthSignatureUrl);
    } else {
      setHealthSignatureUrl('');
    }
  };

  useEffect(() => {
    hydratePersonalFromProfile();
    hydrateMedicalFromProfile();
    setEditingCard(null);
    // Re-hydrate when the signed-in account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const clearBasicError = (key: BasicRequiredKey) => {
    setBasicErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const clearContactError = (key: ContactRequiredKey) => {
    setContactErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const clearEmergencyError = (key: EmergencyRequiredKey) => {
    setEmergencyErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const startEdit = (card: EditableCardId) => {
    if (card === 'health') hydrateMedicalFromProfile();
    else hydratePersonalFromProfile();
    setCardSaved(null);
    setBasicErrors({});
    setContactErrors({});
    setEmergencyErrors({});
    setHealthError('');

    if (card === 'basic') {
      setBasicErrors(requiredErrors({
        firstName: !isFilled(profile?.firstName),
        lastName: !isFilled(profile?.lastName),
        birthday: !isFilled(profile?.birthday),
        sex: !isFilled(profile?.sex),
        nationality: !isFilled(toCountryName(profile?.nationality)),
        weight: !isFilled(profile?.weight),
        height: !isFilled(profile?.height),
      }));
    }
    if (card === 'contact') {
      setContactErrors(requiredErrors({
        phone: !isFilled(profile?.phone),
        province: !isFilled(profile?.province),
        city: !isFilled(profile?.city),
      }));
    }
    if (card === 'emergency') {
      setEmergencyErrors(requiredErrors({
        name: !isFilled(profile?.emergencyContactName),
        phone: !isFilled(profile?.emergencyContactNumber),
        relationship: !isFilled(profile?.emergencyContactRelationship),
      }));
    }

    setEditingCard(card);
  };

  const cancelEdit = () => {
    setEditingCard(null);
    setCardSaved(null);
    setBasicErrors({});
    setContactErrors({});
    setEmergencyErrors({});
    setHealthError('');
  };

  const markSaved = (card: EditableCardId) => {
    setCardSaved(card);
    setTimeout(() => {
      setCardSaved((current) => (current === card ? null : current));
      setEditingCard((current) => (current === card ? null : current));
    }, 900);
  };

  const saveBasic = () => {
    const nextErrors = requiredErrors({
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
      birthday: !birthday.trim(),
      sex: !sex,
      nationality: !nationality.trim(),
      weight: !weight.trim(),
      height: !height.trim(),
    });
    if (Object.keys(nextErrors).length > 0) {
      setBasicErrors(nextErrors);
      return;
    }

    setBasicErrors({});
    const fullName = buildFullName(firstName, middleInitial, lastName);
    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleInitial: middleInitial.trim(),
      name: fullName,
      birthday,
      sex,
      nationality: nationality.trim(),
      weight: weight.trim(),
      height: height.trim(),
    });
    markSaved('basic');
  };

  const saveContact = () => {
    const nextErrors = requiredErrors({
      phone: !phone.trim(),
      province: !province.trim(),
      city: !city.trim(),
    });
    if (Object.keys(nextErrors).length > 0) {
      setContactErrors(nextErrors);
      return;
    }

    setContactErrors({});
    updateProfile({
      phone: phone.trim(),
      province: province.trim(),
      city: city.trim(),
      barangay: barangay.trim(),
    });
    markSaved('contact');
  };

  const saveEmergency = () => {
    const nextErrors = requiredErrors({
      name: !emergencyName.trim(),
      phone: !emergencyPhone.trim(),
      relationship: !emergencyRelationship.trim(),
    });
    if (Object.keys(nextErrors).length > 0) {
      setEmergencyErrors(nextErrors);
      return;
    }

    setEmergencyErrors({});
    updateProfile({
      emergencyContactName: emergencyName.trim(),
      emergencyContactNumber: emergencyPhone.trim(),
      emergencyContactRelationship: emergencyRelationship.trim(),
    });
    markSaved('emergency');
  };

  const saveHealth = async () => {
    const unanswered = HEALTH_QUESTIONS.some((question) => !healthAnswers[question.id]);
    if (unanswered) {
      setHealthError('Please answer every medical question.');
      return;
    }
    if (!consent) {
      setHealthError('Please confirm the acknowledgment to submit this declaration.');
      return;
    }
    const signatureDataUrl = healthSignatureRef.current
      ? exportTransparentSignaturePng(healthSignatureRef.current)
      : null;
    if (!healthHasInk || !signatureDataUrl) {
      setHealthError('Please draw your e-signature to submit this declaration.');
      return;
    }

    const fields = {
      answers: healthAnswers,
      details: healthDetails,
      acknowledged: true,
      schemaVersion: HEALTH_FORM_VERSION,
      signaturePath: healthSignaturePath,
    };

    setHealthError('');
    const payload: Partial<UserProfile> = {
      healthDeclaration: serializeHealthDeclaration(fields),
    };

    try {
      const uploadedSignature = await uploadMemberSignaturePng(signatureDataUrl);
      if (uploadedSignature.ok) {
        fields.signaturePath = uploadedSignature.path;
        payload.healthDeclaration = serializeHealthDeclaration(fields);
        setHealthSignaturePath(uploadedSignature.path);
        setHealthSignatureUrl(signatureDataUrl);
      }

      const uploaded = await generateAndUploadHealthDeclarationPdf({
        email: user?.email || '',
        signerName: user?.name || 'Member',
        fields,
        signatureDataUrl,
      });
      payload.healthDeclarationDocumentPath = uploaded.path;
      payload.healthDeclarationSignedAt = uploaded.signedAt;
    } catch (err) {
      console.error('Failed to save Health Declaration PDF:', err);
    }

    updateProfile(payload);
    markSaved('health');
  };

  const changePassword = () => {
    setPwError('');
    if (!curPw) return setPwError('Please enter your current password.');
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

  const medicalDisplay = parseHealthDeclaration(profile?.healthDeclaration);
  const profileScore = computeProfileScore(profile);
  const profileScoreBar = profileScoreBarClasses(profileScore);
  const {
    provinces,
    cities,
    barangays,
    loadingCities,
    loadingBarangays,
  } = usePhAddressOptions(province, city);

  const activeTab = tab === ACCOUNT_TAB.id
    ? ACCOUNT_TAB
    : (TABS.find((item) => item.id === tab) ?? TABS[0]);
  const ActiveIcon = activeTab.Icon;

  return (
    <MemberPageShell searchPlaceholder="Search profile…">
      <div className="pt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start lg:gap-0">
        {/* ── Left: selected section title + forms ── */}
        <div className="min-w-0 order-2 lg:order-1 lg:pr-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#D4CDB5]/60 pb-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
                <ActiveIcon size={16} />
              </span>
              <h2
                className="min-w-0 truncate text-[#1E2A35] leading-tight"
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

          <div className="pb-4">

          {/* ══ PERSONAL INFO ══ */}
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
                  <div className="flex flex-col gap-4">
                    <DisplayField
                      label="Full Name"
                      value={displayText(buildFullName(
                        profile?.firstName || '',
                        profile?.middleInitial || '',
                        profile?.lastName || '',
                      ))}
                    />
                    <DisplayField label="Birthday" value={formatBirthday(profile?.birthday)} />
                    <DisplayField label="Sex" value={sexLabel(profile?.sex)} />
                    <DisplayField
                      label="Nationality"
                      value={displayText(toCountryName(profile?.nationality))}
                      leading={
                        profile?.nationality
                          ? <CountryFlag country={toCountryName(profile.nationality)} />
                          : undefined
                      }
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <DisplayField label="Weight" value={displayText(profile?.weight, ' kg')} />
                      <DisplayField label="Height" value={displayText(profile?.height, ' cm')} />
                    </div>
                  </div>
                }
              >
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <Field label="First Name" error={basicErrors.firstName}>
                        <ClearableInput
                          className={`${INPUT} ${basicErrors.firstName ? INPUT_ERROR : ''}`}
                          value={firstName}
                          onChange={e => { setFirstName(e.target.value); clearBasicError('firstName'); }}
                          onClear={() => { setFirstName(''); clearBasicError('firstName'); }}
                          placeholder="Juan"
                          autoComplete="given-name"
                        />
                      </Field>
                    </div>
                    <div className="w-[6.5rem] shrink-0">
                      <Field label="M.I." optional>
                        <ClearableInput
                          className={`${INPUT} text-center`}
                          value={middleInitial}
                          onChange={e => setMiddleInitial(e.target.value.slice(0, 2))}
                          onClear={() => setMiddleInitial('')}
                          placeholder="A"
                          maxLength={2}
                          autoComplete="additional-name"
                        />
                      </Field>
                    </div>
                  </div>
                  <Field label="Last Name" error={basicErrors.lastName}>
                    <ClearableInput
                      className={`${INPUT} ${basicErrors.lastName ? INPUT_ERROR : ''}`}
                      value={lastName}
                      onChange={e => { setLastName(e.target.value); clearBasicError('lastName'); }}
                      onClear={() => { setLastName(''); clearBasicError('lastName'); }}
                      placeholder="dela Cruz"
                      autoComplete="family-name"
                    />
                  </Field>
                  <Field label="Birthday" error={basicErrors.birthday}>
                    <ClearableInput
                      className={`${INPUT} ${basicErrors.birthday ? INPUT_ERROR : ''}`}
                      type="date"
                      value={birthday}
                      onChange={e => { setBirthday(e.target.value); clearBasicError('birthday'); }}
                      onClear={() => { setBirthday(''); clearBasicError('birthday'); }}
                    />
                  </Field>
                  <Field label="Sex" error={basicErrors.sex}>
                    <div className="flex items-center gap-2">
                      <div className="grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-3 gap-2">
                        {SEX_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => { setSex(value); clearBasicError('sex'); }}
                            className={`py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-all text-center ${
                              sex === value
                                ? 'border-[#c49a3c] bg-[#c49a3c]/08 text-[#c49a3c]'
                                : basicErrors.sex
                                  ? 'border-red-300 bg-white text-[#5A5048]'
                                  : 'border-[#D4CDB5]/60 bg-white text-[#5A5048] hover:border-[#c49a3c]/40'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {sex ? (
                        <button
                          type="button"
                          onClick={() => setSex('')}
                          className="shrink-0 text-[11px] font-semibold tracking-wide text-[#9A8E7E] hover:text-[#c49a3c]"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </Field>
                  <Field label="Nationality" error={basicErrors.nationality}>
                    <CountrySelect
                      value={nationality}
                      invalid={Boolean(basicErrors.nationality)}
                      onChange={(next) => { setNationality(next); clearBasicError('nationality'); }}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Weight" error={basicErrors.weight}>
                      <ClearableInput
                        className={`${INPUT} ${basicErrors.weight ? INPUT_ERROR : ''}`}
                        type="number"
                        min={1}
                        value={weight}
                        onChange={e => { setWeight(e.target.value); clearBasicError('weight'); }}
                        onClear={() => { setWeight(''); clearBasicError('weight'); }}
                        placeholder="65"
                        suffix="kg"
                      />
                    </Field>
                    <Field label="Height" error={basicErrors.height}>
                      <ClearableInput
                        className={`${INPUT} ${basicErrors.height ? INPUT_ERROR : ''}`}
                        type="number"
                        min={1}
                        value={height}
                        onChange={e => { setHeight(e.target.value); clearBasicError('height'); }}
                        onClear={() => { setHeight(''); clearBasicError('height'); }}
                        placeholder="170"
                        suffix="cm"
                      />
                    </Field>
                  </div>
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
                  <div className="flex flex-col gap-4">
                    <DisplayField label="Phone Number" value={displayText(profile?.phone)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <DisplayField label="Province" value={displayText(profile?.province)} />
                      <DisplayField label="City" value={displayText(profile?.city)} />
                    </div>
                    <DisplayField label="Barangay" optional value={displayText(profile?.barangay)} />
                  </div>
                }
              >
                <div className="flex flex-col gap-4">
                  <Field label="Phone Number" error={contactErrors.phone}>
                    <ClearableInput
                      className={`${INPUT} ${contactErrors.phone ? INPUT_ERROR : ''}`}
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value); clearContactError('phone'); }}
                      onClear={() => setPhone('')}
                      placeholder="+63 9XX XXX XXXX"
                      autoComplete="tel"
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Province" error={contactErrors.province}>
                      <SearchableSelect
                        value={province}
                        invalid={Boolean(contactErrors.province)}
                        onChange={(next) => {
                          setProvince(next);
                          setCity('');
                          setBarangay('');
                          setContactErrors((current) => {
                            const nextErrors = { ...current };
                            if (next) delete nextErrors.province;
                            else nextErrors.province = REQUIRED_MSG;
                            nextErrors.city = REQUIRED_MSG;
                            return nextErrors;
                          });
                        }}
                        options={provinces}
                        placeholder="Select province…"
                        searchPlaceholder="Search province…"
                        emptyText="No province found."
                        suggested={['Cebu']}
                      />
                    </Field>
                    <Field label="City" error={contactErrors.city}>
                      <SearchableSelect
                        value={city}
                        invalid={Boolean(contactErrors.city)}
                        onChange={(next) => {
                          setCity(next);
                          setBarangay('');
                          if (next) clearContactError('city');
                        }}
                        options={cities}
                        placeholder={province ? 'Select city…' : 'Select province first'}
                        searchPlaceholder="Search city…"
                        emptyText="No city found."
                        disabled={!province}
                        loading={Boolean(province) && loadingCities}
                      />
                    </Field>
                  </div>
                  <Field label="Barangay" optional>
                    <SearchableSelect
                      value={barangay}
                      onChange={setBarangay}
                      options={barangays}
                      placeholder={
                        !province ? 'Select province first' : !city ? 'Select city first' : 'Select barangay…'
                      }
                      searchPlaceholder="Search barangay…"
                      emptyText="No barangay found."
                      disabled={!province || !city}
                      loading={loadingBarangays}
                    />
                  </Field>
                </div>
              </EditableCard>

              <EditableCard
                title="Emergency Contact"
                description="Person to notify in case of emergency during class."
                editing={editingCard === 'emergency'}
                onEdit={() => startEdit('emergency')}
                onCancel={cancelEdit}
                onSave={saveEmergency}
                saved={cardSaved === 'emergency'}
                display={
                  <div className="flex flex-col gap-4">
                    <DisplayField label="Contact Name" value={displayText(profile?.emergencyContactName)} />
                    <DisplayField label="Contact Number" value={displayText(profile?.emergencyContactNumber)} />
                    <DisplayField label="Relationship" value={displayText(profile?.emergencyContactRelationship)} />
                  </div>
                }
              >
                <div className="flex flex-col gap-4">
                  <Field label="Contact Name" error={emergencyErrors.name}>
                    <ClearableInput
                      className={`${INPUT} ${emergencyErrors.name ? INPUT_ERROR : ''}`}
                      value={emergencyName}
                      onChange={e => { setEmergencyName(e.target.value); clearEmergencyError('name'); }}
                      onClear={() => setEmergencyName('')}
                      placeholder="Full name"
                    />
                  </Field>
                  <Field label="Contact Number" error={emergencyErrors.phone}>
                    <ClearableInput
                      className={`${INPUT} ${emergencyErrors.phone ? INPUT_ERROR : ''}`}
                      type="tel"
                      value={emergencyPhone}
                      onChange={e => { setEmergencyPhone(e.target.value); clearEmergencyError('phone'); }}
                      onClear={() => setEmergencyPhone('')}
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </Field>
                  <Field label="Relationship" error={emergencyErrors.relationship}>
                    <SearchableSelect
                      value={emergencyRelationship}
                      invalid={Boolean(emergencyErrors.relationship)}
                      onChange={(next) => {
                        setEmergencyRelationship(next);
                        if (next) clearEmergencyError('relationship');
                      }}
                      options={EMERGENCY_RELATIONSHIPS}
                      placeholder="Select relationship…"
                      searchPlaceholder="Search relationship…"
                      emptyText="No relationship found."
                    />
                  </Field>
                </div>
              </EditableCard>
            </div>
          )}

          {/* ══ HEALTH DECLARATION ══ */}
          {tab === 'medical' && (
            <EditableCard
              title="Health Declaration Form"
              description="Welcome to Balansé Wellness! Your safety and well-being are our top priorities. Please complete this health declaration accurately before participating in any of our movement sessions."
              editing={editingCard === 'health'}
              onEdit={() => startEdit('health')}
              onCancel={cancelEdit}
              onSave={saveHealth}
              saved={cardSaved === 'health'}
              display={
                <div className="flex flex-col gap-6">
                  <div className="bg-[#c49a3c]/06 border border-[#c49a3c]/20 rounded-2xl px-4 py-3 flex items-start gap-3">
                    <Shield size={15} className="text-[#c49a3c] mt-0.5 shrink-0" />
                    <p className="text-[#7A6A52] text-xs leading-relaxed">
                      This information is strictly confidential and shared only with your assigned coaches
                      to ensure your safety and wellbeing during every session.
                    </p>
                  </div>

                  <div>
                    <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Medical Questionnaire</p>
                    <div className="flex flex-col gap-2.5">
                      {HEALTH_QUESTIONS.map((question) => {
                        const answer = medicalDisplay.answers[question.id];
                        return (
                          <div
                            key={question.id}
                            className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 rounded-2xl border border-[#D4CDB5]/50 px-3.5 py-3"
                          >
                            <p className="text-[#5A5048] text-sm flex-1 min-w-0 leading-relaxed">{question.text}</p>
                            <span
                              className={`shrink-0 text-xs font-bold uppercase tracking-widest ${
                                answer === 'yes'
                                  ? 'text-red-600'
                                  : answer === 'no'
                                    ? 'text-[#6B8E6B]'
                                    : 'text-[#B0A898]'
                              }`}
                            >
                              {healthAnswerLabel(answer)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <DisplayField
                    label="Additional Details"
                    optional
                    multiline
                    value={displayText(medicalDisplay.details)}
                  />

                  <div>
                    <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Acknowledgment and Declaration</p>
                    <DisplayField
                      label="Status"
                      value={medicalDisplay.acknowledged ? 'Declared' : '--'}
                    />
                    <p className="mt-2 text-[#5A5048] text-sm leading-relaxed">
                      I confirm that I am physically capable of participating in fitness activities at BALANSÉ.
                      I have disclosed all relevant medical conditions above and agree to notify BALANSÉ
                      of any changes to my health status before attending future sessions.
                    </p>
                    <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mt-4 mb-1.5">E-signature</p>
                    {healthSignatureUrl ? (
                      <div className="rounded-2xl border border-[#D4CDB5]/60 bg-[#F8F3E8] px-4 py-3">
                        <img
                          src={healthSignatureUrl}
                          alt="Your electronic signature"
                          className="h-16 w-auto max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <p className="text-[#B0A898] text-sm">--</p>
                    )}
                  </div>
                </div>
              }
            >
              <div className="flex flex-col gap-6">
                <div className="bg-[#c49a3c]/06 border border-[#c49a3c]/20 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <Shield size={15} className="text-[#c49a3c] mt-0.5 shrink-0" />
                  <p className="text-[#7A6A52] text-xs leading-relaxed">
                    This information is strictly confidential and shared only with your assigned coaches
                    to ensure your safety and wellbeing during every session.
                  </p>
                </div>

                <div>
                  <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Medical Questionnaire</p>
                  <p className="text-[#8A7E6E] text-xs mb-3">
                    Please check the appropriate box for each question below to help our coaches ensure your safety during training.
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {HEALTH_QUESTIONS.map((question) => {
                      const answer = healthAnswers[question.id];
                      return (
                        <div
                          key={question.id}
                          className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-2xl border border-[#D4CDB5]/50 hover:border-[#c49a3c]/30 transition-colors"
                        >
                          <p className="text-[#5A5048] text-sm flex-1 min-w-0 leading-relaxed">{question.text}</p>
                          <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setHealthAnswers((current) => ({ ...current, [question.id]: 'yes' }));
                                setHealthError('');
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                answer === 'yes'
                                  ? 'bg-red-500 text-white border-red-500'
                                  : 'bg-white text-[#8A7E6E] border-[#D4CDB5]/60 hover:border-red-300'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHealthAnswers((current) => ({ ...current, [question.id]: 'no' }));
                                setHealthError('');
                              }}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                answer === 'no'
                                  ? 'bg-[#6B8E6B] text-white border-[#6B8E6B]'
                                  : 'bg-white text-[#8A7E6E] border-[#D4CDB5]/60 hover:border-green-300'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Field
                  label="Additional Details"
                  optional
                  hint="If you answered Yes to any question above, please provide brief details so our coaching staff can accommodate you."
                >
                  <ClearableTextarea
                    className={TEXTAREA}
                    rows={4}
                    value={healthDetails}
                    onChange={e => setHealthDetails(e.target.value)}
                    onClear={() => setHealthDetails('')}
                    placeholder="Brief details about any Yes answers, injuries, or anything your coach should know"
                  />
                </Field>

                <div>
                  <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Acknowledgment and Declaration</p>
                  <label
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => {
                      setConsent(v => !v);
                      setHealthError('');
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        consent
                          ? 'bg-[#c49a3c] border-[#c49a3c]'
                          : 'border-[#D4CDB5] group-hover:border-[#c49a3c]/60'
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

                <div>
                  <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">E-signature</p>
                  <p className="text-[#8A7E6E] text-xs mb-3">
                    Draw your signature below. It is saved as a transparent image and embedded on your signed Health Declaration PDF.
                  </p>
                  <SignaturePad
                    key={healthPadKey}
                    canvasRef={healthSignatureRef}
                    onInkChange={(ink) => {
                      setHealthHasInk(ink);
                      if (ink) setHealthError('');
                    }}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    {!healthHasInk ? (
                      <p className="text-[#B0A898] text-xs">A signature is required to save this declaration.</p>
                    ) : (
                      <p className="text-[#6B8E6B] text-xs">Signature captured.</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setHealthPadKey((key) => key + 1);
                        setHealthHasInk(false);
                      }}
                      disabled={!healthHasInk}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition-all ${
                        healthHasInk
                          ? 'border-[#D4CDB5]/70 text-[#5A5048] hover:bg-[#EDE8D8]'
                          : 'border-[#D4CDB5]/40 text-[#B0A898] cursor-not-allowed'
                      }`}
                    >
                      <Eraser size={13} /> Clear
                    </button>
                  </div>
                </div>

                {healthError && (
                  <p className="text-red-500 text-xs">{healthError}</p>
                )}
              </div>
            </EditableCard>
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
                      <ClearableInput
                        type={showCur ? 'text' : 'password'}
                        className={`${INPUT} ${curPw ? 'pr-24' : 'pr-12'}`}
                        value={curPw}
                        onChange={e => { setCurPw(e.target.value); setPwError(''); }}
                        onClear={() => { setCurPw(''); setPwError(''); }}
                        placeholder="••••••••"
                        clearClassName="right-10 top-1/2 -translate-y-1/2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCur(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                      >
                        {showCur ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Current Password">
                    <div className="relative">
                      <ClearableInput
                        type={showCur ? 'text' : 'password'}
                        className={`${INPUT} ${curPw ? 'pr-24' : 'pr-12'}`}
                        value={curPw}
                        onChange={e => { setCurPw(e.target.value); setPwError(''); }}
                        onClear={() => { setCurPw(''); setPwError(''); }}
                        placeholder="••••••••"
                        clearClassName="right-10 top-1/2 -translate-y-1/2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCur(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
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
                        onChange={e => { setNewPw(e.target.value); setPwError(''); }}
                        onClear={() => { setNewPw(''); setPwError(''); }}
                        placeholder="At least 6 characters"
                        clearClassName="right-10 top-1/2 -translate-y-1/2"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
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
                      onChange={e => { setConfPw(e.target.value); setPwError(''); }}
                      onClear={() => { setConfPw(''); setPwError(''); }}
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

              {/* Deactivate — disabled for now */}
              <div
                className="rounded-3xl border border-red-200/70 bg-white p-6 opacity-55"
                aria-disabled="true"
              >
                <div className="mb-4 flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-red-700" style={SECTION_TITLE}>Deactivate Account</h3>
                    <p className="text-xs leading-relaxed text-[#8A7E6E]">
                      This will cancel all upcoming bookings and temporarily remove your access to BALANSÉ.
                      You can reactivate later by contacting the studio.
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

              {/* Delete — disabled for now */}
              <div
                className="rounded-3xl border border-red-200/70 bg-white p-6 opacity-55"
                aria-disabled="true"
              >
                <div className="mb-4 flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-red-700" style={SECTION_TITLE}>Delete Account</h3>
                    <p className="text-xs leading-relaxed text-[#8A7E6E]">
                      Permanently erase your profile, bookings, and payment history from BALANSÉ.
                      This action cannot be undone.
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
                  Delete My Account
                </button>
              </div>
            </div>
          )}

          {/* ══ TERMS & CONDITIONS ══ */}
          {tab === 'terms' && (
            <SignedDocumentTab
              email={user?.email}
              name={user?.name}
              kind="terms"
              accepted={!!profile?.termsAccepted}
              subtitle="Your personal copy of the Balansé Terms & Conditions."
              documentName="Terms & Conditions PDF"
              unsignedAccepted="Your Terms & Conditions acceptance is recorded, but a signed PDF is not available for this account yet. Complete the e-signature step in Profile Setup to generate your downloadable copy."
              unsignedPending="You have not completed the Terms & Conditions agreement and e-signature yet. Once you sign, your personal PDF will appear here."
              path={profile?.termsDocumentPath}
              acceptedVersion={profile?.termsAcceptedVersion}
              signedAt={profile?.termsSignedAt}
              localRecord={getSignedTermsRecord(user?.email)}
            />
          )}

          {/* ══ PRIVACY POLICY ══ */}
          {tab === 'privacy' && (
            <SignedDocumentTab
              email={user?.email}
              name={user?.name}
              kind="privacy"
              accepted={!!profile?.privacyPolicyDocumentPath || !!profile?.privacyAcceptedVersion}
              subtitle="Your personal copy of the Balansé Privacy Policy."
              documentName="Privacy Policy PDF"
              unsignedAccepted="Your Privacy Policy acceptance is recorded, but a signed PDF is not available for this account yet. Complete acceptance in Profile Setup to generate your downloadable copy."
              unsignedPending="You have not completed the Privacy Policy agreement yet. Once you accept, your personal PDF will appear here."
              path={profile?.privacyPolicyDocumentPath}
              acceptedVersion={profile?.privacyAcceptedVersion}
              signedAt={profile?.privacySignedAt}
            />
          )}
          </div>
        </div>

        {/* ── Right: profile card + section selection ── */}
        <aside className="order-1 lg:order-2 flex flex-col gap-4 lg:sticky lg:top-4 lg:border-l lg:border-[#D4CDB5]/50 lg:pl-6">
          <div className="overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm">
            <ProfileImageHero
              photoUrl={user?.profile.photo || ''}
              coverUrl={user?.profile.coverImage || ''}
              initials={initials}
              editable
              onPhotoUploaded={(url) => updateProfile({ photo: url })}
              onCoverUploaded={(url) => updateProfile({ coverImage: url })}
            />
            <div className="px-5 pb-5 pt-14 md:px-6 md:pt-16">
              <h2
                className="text-[#1E2A35] leading-tight truncate"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.04em' }}
              >
                {user?.name || 'Member'}
              </h2>
              <p className="text-[#8A7E6E] text-sm truncate">{user?.email}</p>
              <span className="inline-flex items-center gap-1.5 bg-[#c49a3c]/10 text-[#a67f2e] text-xs font-bold px-2.5 py-1 rounded-full border border-[#c49a3c]/25 mt-1.5">
                <Shield size={10} /> Gold Membership · Active
              </span>
            </div>
          </div>

          <nav
            className="overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white p-3 shadow-sm"
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
            className="overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white p-3 shadow-sm"
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
                onClick={() => {
                  void logout();
                  navigate('/');
                }}
              />
            </div>
          </nav>
        </aside>
      </div>
    </MemberPageShell>
  );
}
