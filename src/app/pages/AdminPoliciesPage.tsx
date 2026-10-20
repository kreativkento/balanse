import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { toastSaved } from '../../lib/operation-toast';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminHeaderActions } from '../context/AdminHeaderActionsContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  fetchStudioPolicySettings,
  STUDIO_POLICY_DEFAULTS,
  updateStudioPolicySettings,
  type StudioPolicySettings,
} from '../../lib/studio-policy-service';

type Settings = Omit<StudioPolicySettings, 'updatedAt'>;

const DEFAULTS: Settings = { ...STUDIO_POLICY_DEFAULTS };

function settingsFromLoaded(loaded: StudioPolicySettings): Settings {
  return {
    cancelWindowHours: loaded.cancelWindowHours,
    loyaltyThreshold: loaded.loyaltyThreshold,
    referralBonus: loaded.referralBonus,
    sessionExpiryDays: loaded.sessionExpiryDays,
    maxBookingsPerDay: loaded.maxBookingsPerDay,
    classCapacityDefault: loaded.classCapacityDefault,
    gracePeriodHours: loaded.gracePeriodHours,
  };
}

function settingsEqual(a: Settings, b: Settings): boolean {
  return (Object.keys(DEFAULTS) as (keyof Settings)[]).every((key) => a[key] === b[key]);
}

// ── Section Component ──────────────────────────────────────────

function PolicySection({
  title,
  desc,
  children,
  disabled = false,
  disabledLabel = 'Not editable yet',
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  return (
    <div
      className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW} ${disabled ? 'opacity-[0.72]' : ''}`}
    >
      <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}
          >
            {title}
          </h2>
          {disabled ? (
            <span className="rounded-full border border-[#D4CDB5]/70 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9A8E7E]">
              {disabledLabel}
            </span>
          ) : null}
        </div>
        <p className="text-[#8A7E6E] text-xs mt-0.5">{desc}</p>
      </div>
      <div className={`px-6 py-5 flex flex-col gap-5 ${disabled ? 'pointer-events-none select-none' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function PolicyField({
  label,
  desc,
  value,
  onChange,
  unit,
  type = 'number',
  min,
  max,
  disabled = false,
}: {
  label: string;
  desc?: string;
  value: number | string;
  onChange: (v: string) => void;
  unit?: string;
  type?: 'number' | 'text';
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex-1">
        <p className="text-[#1E2A35] text-sm font-semibold">{label}</p>
        {desc && <p className="text-[#9A8E7E] text-xs mt-0.5 leading-relaxed">{desc}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {unit && unit.startsWith('₱') && <span className="text-[#8A7E6E] text-sm font-semibold">₱</span>}
        <input
          type={type}
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 text-center px-3 py-2 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm font-semibold outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all disabled:opacity-60"
        />
        {unit && !unit.startsWith('₱') && <span className="text-[#8A7E6E] text-sm">{unit}</span>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function AdminPoliciesPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS });
  const baselineRef = useRef<Settings>({ ...DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (!adminUser) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await fetchStudioPolicySettings();
      if (cancelled) return;
      if (error) toast.error(error);
      const next = settingsFromLoaded(data);
      baselineRef.current = next;
      setSettings(next);
      setHasChanges(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [adminUser]);

  useEffect(() => {
    if (loading) return;
    setHasChanges(!settingsEqual(settings, baselineRef.current));
  }, [settings, loading]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const result = await updateStudioPolicySettings({ ...settings, updatedAt: null });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error ?? 'Could not save policy settings.');
      return;
    }
    const { data: refreshed, error: refreshError } = await fetchStudioPolicySettings();
    if (refreshError) toast.error(refreshError);
    const next = settingsFromLoaded(refreshed);
    baselineRef.current = next;
    setSettings(next);
    setSaved(true);
    setHasChanges(false);
    toastSaved('Policy settings');
    setTimeout(() => setSaved(false), 3000);
  }, [settings]);

  const handleReset = useCallback(() => {
    setSettings({ ...baselineRef.current });
    setHasChanges(false);
  }, []);

  useAdminHeaderActions(
    useMemo(
      () => (
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] active:scale-95 transition-all disabled:opacity-50"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || !hasChanges}
            className={`action-button flex items-center gap-2 px-5 py-2.5 rounded-full transition-all shadow-sm active:scale-[0.97] disabled:opacity-50 ${
              saved
                ? 'bg-green-600 text-white'
                : hasChanges
                  ? 'bg-[#c49a3c] text-white hover:bg-[#a67f2e] shadow-[0_4px_16px_rgba(196,154,60,0.35)]'
                  : 'bg-[#1E2A35] text-white hover:bg-[#263545]'
            }`}
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : saved ? (
              <>
                <Check size={14} /> Saved
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      ),
      [hasChanges, saved, saving, loading, handleReset, handleSave],
    ),
  );

  if (!adminUser) return null;

  const update = (key: keyof Settings, val: string) => {
    const parsed = val.trim() === '' ? 0 : Number(val);
    setSettings((s) => ({
      ...s,
      [key]: Number.isFinite(parsed) ? parsed : s[key],
    }));
  };

  const INP = (key: keyof Settings) => String(settings[key]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center gap-2 text-[#8A7E6E] text-sm">
        <Loader2 size={18} className="animate-spin text-[#c49a3c]" />
        Loading policy settings…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {hasChanges && !saved && (
        <div className="sticky top-0 z-20 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#c49a3c]/40 bg-[#FFF9EE] px-4 py-3 shadow-sm">
          <p className="text-[#8a6824] text-sm font-semibold">You have unsaved policy changes.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-white transition-all disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="action-button inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#c49a3c] text-white text-sm font-bold hover:bg-[#a67f2e] shadow-sm disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                'Save to database'
              )}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
          <Check size={16} className="text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-semibold">
            Policy settings saved to the database. Cancellation and session rules use these values.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <PolicySection
          title="Cancellation Policy"
          desc="Define the minimum notice required for clients to cancel a booking. Referenced by cancellation flows."
        >
          <PolicyField
            label="Free Cancellation Window"
            desc="Clients may cancel their booking if they do so at least this many hours before the class starts."
            value={INP('cancelWindowHours')}
            onChange={(v) => update('cancelWindowHours', v)}
            unit="hrs before class"
            min={0}
          />
          <div className="mt-1 bg-[#F8F3E8] border border-[#D4CDB5]/50 rounded-2xl p-4">
            <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-2">Current Policy Summary</p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: `${settings.cancelWindowHours}+ hrs before class`, note: 'Free cancellation — no charge' },
                { label: `Within ${settings.cancelWindowHours} hrs`, note: 'Cancellation not permitted' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <span className="text-[#5A5048] font-medium">{r.label}</span>
                  <span className="text-[#8A7E6E]">{r.note}</span>
                </div>
              ))}
            </div>
          </div>
        </PolicySection>

        <PolicySection
          title="Promo Eligibility Rules"
          desc="Set the session milestones and referral rewards that trigger automatic promo access."
          disabled
          disabledLabel="Coming soon"
        >
          <PolicyField
            label="Loyalty Promo Threshold"
            desc="Clients who have completed this many total sessions qualify for loyalty-based promos."
            value={INP('loyaltyThreshold')}
            onChange={(v) => update('loyaltyThreshold', v)}
            unit="sessions"
            min={1}
            disabled
          />
          <div className="h-px bg-[#D4CDB5]/40" />
          <PolicyField
            label="Referral Bonus Amount"
            desc="Flat discount (₱) awarded to the referring member when a referred client signs up and completes their first session."
            value={INP('referralBonus')}
            onChange={(v) => update('referralBonus', v)}
            unit="₱"
            min={0}
            disabled
          />
        </PolicySection>

        <PolicySection
          title="Session & Booking Rules"
          desc="Control how sessions are managed, capacity limits, and credit expiry. Stored for booking and credit logic."
        >
          <PolicyField
            label="Session Credit Expiry"
            desc="Unused session credits in monthly memberships expire after this many days from purchase."
            value={INP('sessionExpiryDays')}
            onChange={(v) => update('sessionExpiryDays', v)}
            unit="days"
            min={1}
          />
          <div className="h-px bg-[#D4CDB5]/40" />
          <PolicyField
            label="Max Bookings per Day (per client)"
            desc="Maximum number of classes a single client may book in one calendar day."
            value={INP('maxBookingsPerDay')}
            onChange={(v) => update('maxBookingsPerDay', v)}
            unit="class(es)"
            min={1}
            max={5}
          />
          <div className="h-px bg-[#D4CDB5]/40" />
          <PolicyField
            label="Default Class Capacity"
            desc="Default maximum number of students per class unless overridden when creating a schedule block."
            value={INP('classCapacityDefault')}
            onChange={(v) => update('classCapacityDefault', v)}
            unit="students"
            min={1}
            max={50}
          />
        </PolicySection>

        <PolicySection
          title="Payment Policy"
          desc="Rules for payment validation and booking confirmation timing."
          disabled
          disabledLabel="Coming soon"
        >
          <PolicyField
            label="Payment Grace Period"
            desc="After a booking request is submitted, how long the client has to submit valid payment proof before the slot is released."
            value={INP('gracePeriodHours')}
            onChange={(v) => update('gracePeriodHours', v)}
            unit="hrs"
            min={0}
            disabled
          />
        </PolicySection>
      </div>

      {hasChanges ? (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-5 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm font-semibold hover:bg-[#EDE8D8] transition-all disabled:opacity-50"
          >
            Discard changes
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="action-button flex items-center gap-2 px-7 py-3.5 rounded-full transition-all shadow-md active:scale-[0.97] disabled:opacity-50 bg-[#c49a3c] text-white hover:bg-[#a67f2e]"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : (
              'Save to studio_policy_settings'
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
