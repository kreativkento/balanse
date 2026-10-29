import type { CSSProperties, ReactNode } from 'react';
import { Award, Check, Lock, Pencil, Save, User, X } from 'lucide-react';
import type { CoachProfileData } from '../../context/StaffAuthContext';

export const INPUT =
  'w-full rounded-xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] px-4 py-3 text-sm placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all';
export const INPUT_ERROR =
  'border-red-400 focus:border-red-400 focus:ring-red-200/80';
export const TEXTAREA = `${INPUT} resize-none`;
export const CARD =
  'bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-6 transition-[box-shadow,border-color] duration-500 ease-in-out delay-100 hover:border-[#c49a3c] hover:shadow-[inset_0_0_0_3px_#c49a3c]';
export const SLIM_SCROLL_OUTSET =
  'overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#C4B8A0_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C4B8A0] [&::-webkit-scrollbar-thumb:hover]:bg-[#c49a3c]/55';
export const SECTION_TITLE: CSSProperties = { fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem',
  letterSpacing: '0.05em' };

export const TABS = [
  { id: 'personal' as const, label: 'Personal Information', Icon: User },
  { id: 'credentials' as const, label: 'Credentials', Icon: Award },
];
export const ACCOUNT_TAB = { id: 'account' as const, label: 'Account Settings', Icon: Lock };
export type TabId = typeof TABS[number]['id'] | typeof ACCOUNT_TAB['id'];
export type EditableCardId = 'basic' | 'contact' | 'professional' | 'disciplines';

export const REQUIRED_MSG = 'This field is required.';

export function displayText(value?: string | null, suffix = ''): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '--';
  return suffix ? `${trimmed}${suffix}` : trimmed;
}

export function isFilled(value?: string | null): boolean {
  return Boolean((value ?? '').trim());
}

export function requiredErrors<K extends string>(checks: Record<K, boolean>): Partial<Record<K, string>> {
  const errors: Partial<Record<K, string>> = {};
  for (const key of Object.keys(checks) as K[]) {
    if (checks[key]) errors[key] = REQUIRED_MSG;
  }
  return errors;
}

export function computeCoachProfileScore(
  profile: CoachProfileData | null,
  disciplineCount: number,
): number {
  if (!profile) return 0;
  const checks = [
    profile.displayName?.trim(),
    profile.phone?.trim(),
    profile.photo?.trim(),
    profile.coverImage?.trim(),
    profile.bio?.trim(),
    profile.experience?.trim(),
    disciplineCount > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function computeOpsStaffProfileScore(profile: CoachProfileData | null): number {
  if (!profile) return 0;
  const checks = [
    profile.displayName?.trim(),
    profile.phone?.trim(),
    profile.photo?.trim(),
    profile.coverImage?.trim(),
    profile.bio?.trim(),
    profile.experience?.trim(),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function parseProfileTab(value: string | null): TabId | null {
  if (!value) return null;
  if (value === ACCOUNT_TAB.id) return ACCOUNT_TAB.id;
  return TABS.find((tab) => tab.id === value)?.id ?? null;
}

export function normalizeStaffPortalType(staffType: string | null | undefined): 'Coach' | 'Administrator' {
  const normalized = (staffType ?? '').trim().toLowerCase();
  if (normalized === 'administrator' || normalized === 'admin') return 'Administrator';
  return 'Coach';
}

export function Field({
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

export function DisplayField({
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

export function EditableCard({
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
            >
              <X size={16} /> Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className={`action-button flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-white transition-all active:scale-[0.97] ${
                saved
                  ? 'bg-[#8A9E7A] shadow-[0_4px_16px_rgba(138,158,122,0.3)]'
                  : 'bg-[#c49a3c] shadow-[0_4px_16px_rgba(196,154,60,0.3)] hover:bg-[#a67f2e]'
              }`}
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

export function SectionNavButton({
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
      className={`action-button flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all ${
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
