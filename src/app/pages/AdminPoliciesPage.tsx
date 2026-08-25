import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, Check, RotateCcw } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

// ── Defaults ───────────────────────────────────────────────────

const DEFAULTS = {
  // Cancellation Policy
  cancelWindowHours: 24,
  // Promo Eligibility
  loyaltyThreshold: 12,
  referralBonus: 100,
  // Session Rules
  sessionExpiryDays: 30,
  maxBookingsPerDay: 1,
  classCapacityDefault: 12,
  // Payment
  gracePeriodHours: 48,
};

type Settings = typeof DEFAULTS;

// ── Section Component ──────────────────────────────────────────

function PolicySection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
      <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
        <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.05em' }}>{title}</h2>
        <p className="text-[#8A7E6E] text-xs mt-0.5">{desc}</p>
      </div>
      <div className="px-6 py-5 flex flex-col gap-5">{children}</div>
    </div>
  );
}

function PolicyField({
  label, desc, value, onChange, unit, type = 'number', min, max,
}: {
  label: string; desc?: string; value: number | string; onChange: (v: string) => void;
  unit?: string; type?: 'number' | 'text'; min?: number; max?: number;
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
          onChange={e => onChange(e.target.value)}
          className="w-20 text-center px-3 py-2 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm font-semibold outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all"
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
  const [saved, setSaved]       = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { if (!adminUser) navigate('/admin-login'); }, [adminUser, navigate]);
  if (!adminUser) return null;

  const update = (key: keyof Settings, val: string) => {
    setSettings(s => ({ ...s, [key]: isNaN(Number(val)) ? val : Number(val) }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULTS });
    setHasChanges(false);
  };

  const INP = (key: keyof Settings) => String(settings[key]);

  return (
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-[#745b3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Policy Settings</span>
            </div>
            <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}>
              Business Policy Settings
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] active:scale-95 transition-all"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all shadow-sm active:scale-[0.97] ${saved ? 'bg-green-600 text-white' : 'bg-[#1E2A35] text-white hover:bg-[#263545]'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
            >
              {saved ? <><Check size={14} /> Saved</> : 'Save Changes'}
            </button>
          </div>
        </div>

        {saved && (
          <div className="mb-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
            <Check size={16} className="text-green-600 shrink-0" />
            <p className="text-green-700 text-sm font-semibold">Policy settings saved successfully. Changes apply to all future sessions and promos.</p>
          </div>
        )}

        <div className="flex flex-col gap-5">

          {/* ── Cancellation Policy ── */}
          <PolicySection
            title="Cancellation Policy"
            desc="Define the minimum notice required for clients to cancel a booking."
          >
            <PolicyField
              label="Free Cancellation Window"
              desc="Clients may cancel their booking if they do so at least this many hours before the class starts."
              value={INP('cancelWindowHours')}
              onChange={v => update('cancelWindowHours', v)}
              unit="hrs before class"
              min={0}
            />
            {/* Summary box */}
            <div className="mt-1 bg-[#F8F3E8] border border-[#D4CDB5]/50 rounded-2xl p-4">
              <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest mb-2">Current Policy Summary</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: `${settings.cancelWindowHours}+ hrs before class`, note: 'Free cancellation — no charge' },
                  { label: `Within ${settings.cancelWindowHours} hrs`,         note: 'Cancellation not permitted' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-xs">
                    <span className="text-[#5A5048] font-medium">{r.label}</span>
                    <span className="text-[#8A7E6E]">{r.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </PolicySection>

          {/* ── Promo Eligibility ── */}
          <PolicySection
            title="Promo Eligibility Rules"
            desc="Set the session milestones and referral rewards that trigger automatic promo access."
          >
            <PolicyField
              label="Loyalty Promo Threshold"
              desc="Clients who have completed this many total sessions qualify for loyalty-based promos."
              value={INP('loyaltyThreshold')}
              onChange={v => update('loyaltyThreshold', v)}
              unit="sessions"
              min={1}
            />
            <div className="h-px bg-[#D4CDB5]/40" />
            <PolicyField
              label="Referral Bonus Amount"
              desc="Flat discount (₱) awarded to the referring member when a referred client signs up and completes their first session."
              value={INP('referralBonus')}
              onChange={v => update('referralBonus', v)}
              unit="₱"
              min={0}
            />
          </PolicySection>

          {/* ── Session Rules ── */}
          <PolicySection
            title="Session & Booking Rules"
            desc="Control how sessions are managed, capacity limits, and credit expiry."
          >
            <PolicyField
              label="Session Credit Expiry"
              desc="Unused session credits in monthly memberships expire after this many days from purchase."
              value={INP('sessionExpiryDays')}
              onChange={v => update('sessionExpiryDays', v)}
              unit="days"
              min={1}
            />
            <div className="h-px bg-[#D4CDB5]/40" />
            <PolicyField
              label="Max Bookings per Day (per client)"
              desc="Maximum number of classes a single client may book in one calendar day."
              value={INP('maxBookingsPerDay')}
              onChange={v => update('maxBookingsPerDay', v)}
              unit="class(es)"
              min={1}
              max={5}
            />
            <div className="h-px bg-[#D4CDB5]/40" />
            <PolicyField
              label="Default Class Capacity"
              desc="Default maximum number of students per class unless overridden when creating a schedule block."
              value={INP('classCapacityDefault')}
              onChange={v => update('classCapacityDefault', v)}
              unit="students"
              min={1}
              max={50}
            />
          </PolicySection>

          {/* ── Payment Policy ── */}
          <PolicySection
            title="Payment Policy"
            desc="Rules for payment validation and booking confirmation timing."
          >
            <PolicyField
              label="Payment Grace Period"
              desc="After a booking request is submitted, how long the client has to submit valid payment proof before the slot is released."
              value={INP('gracePeriodHours')}
              onChange={v => update('gracePeriodHours', v)}
              unit="hrs"
              min={0}
            />
          </PolicySection>

        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-7 py-3.5 rounded-full transition-all shadow-md active:scale-[0.97] ${saved ? 'bg-green-600 text-white' : 'bg-[#1E2A35] text-white hover:bg-[#263545]'}`}
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '1rem' }}
          >
            {saved ? <><Check size={16} /> All Changes Saved</> : 'Save All Changes'}
          </button>
        </div>
      </div>
  );
}