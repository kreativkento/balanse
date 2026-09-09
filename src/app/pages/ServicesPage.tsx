import {
  Check,
  Grid3X3,
  HeartPulse,
  Tag,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

const SERVICE_CARD =
  `rounded-2xl bg-white border border-[#D4CDB5]/50 shadow-[0_1px_4px_rgba(30,42,53,0.04)] flex flex-col ${CARD_HOVER_GROW}`;

const COACHING_TIERS = [
  { label: '1 Month', note: '6 sessions', price: '₱4,500' },
  { label: '1 Month', note: '12 sessions', price: '₱8,000' },
  { label: '2 Months', note: '20 sessions', price: '₱13,500' },
];

const COACHING_INCLUSIONS = [
  'Wellness assessment',
  'Member event discounts',
];

const PRIVATE_TIERS = [
  { label: 'One-on-One', note: 'Single session', price: '₱1,500' },
  { label: 'Small Group', note: 'Max of 5 persons', price: '₱4,000' },
  { label: 'Add. Student', note: 'Per extra person', price: '₱500' },
];

const PRIVATE_CLASSES = [
  'Calisthenics', 'Circuit Training', 'Mat Pilates',
  'Groundworks', 'Animal Flow', 'Yoga',
];

const RECOVERY_TIERS = [
  { label: 'Acupressure / Pressure Cupping', price: '₱850', highlight: false },
  { label: 'Spinal Manipulation & Blading', price: '₱750', highlight: false },
  { label: 'Dry Needling', price: '₱1,100', highlight: false },
  { label: 'All-in-One Therapy', price: '₱2,500', highlight: true },
];

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c49a3c]">
      <Icon size={11} strokeWidth={2.25} />
      {children}
    </p>
  );
}

function ServiceCardHeader({
  icon: Icon,
  title,
  tagline,
}: {
  icon: LucideIcon;
  title: string;
  tagline: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 pb-3 pt-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0 pt-0.5">
        <h2
          className="leading-none text-[#1E2A35]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
        >
          {title}
        </h2>
        <p className="mt-1 text-[11px] leading-snug text-[#8A7E6E]">{tagline}</p>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  note,
  price,
  highlight = false,
  plain = false,
}: {
  label: string;
  note?: string;
  price: string;
  highlight?: boolean;
  plain?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${
        highlight ? 'bg-[#c49a3c]/10 border border-[#c49a3c]/25' : 'bg-[#F8F3E8] border border-[#D4CDB5]/40'
      }`}
    >
      <div className="min-w-0 pr-1">
        {plain ? (
          <p className={`text-xs leading-snug ${highlight ? 'text-[#1E2A35] font-medium' : 'text-[#5A5048]'}`}>{label}</p>
        ) : (
          <>
            <p
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.04em' }}
            >
              {label}
            </p>
            {note && <p className="text-[#8A7E6E] text-[11px] mt-0.5 leading-tight">{note}</p>}
          </>
        )}
      </div>
      <span
        className={`leading-none shrink-0 ${highlight ? 'text-[#c49a3c]' : 'text-[#1E2A35]'}`}
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.02em' }}
      >
        {price}
      </span>
    </div>
  );
}

export function ServicesOfferings({ onAction }: { onAction: () => void }) {
  return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-stretch">

          <article className={SERVICE_CARD}>
            <ServiceCardHeader
              icon={UserRoundCheck}
              title="Personal Coaching"
              tagline="1-on-1 programs & coach support"
            />
            <div className="px-4 py-3 border-t border-[#D4CDB5]/35">
              <SectionLabel icon={Tag}>Pricing</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {COACHING_TIERS.map((tier) => (
                  <PriceRow key={`${tier.label}-${tier.note}`} label={tier.label} note={tier.note} price={tier.price} />
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-[#D4CDB5]/35 flex-1">
              <SectionLabel icon={Check}>Included</SectionLabel>
              <ul className="flex flex-col gap-1.5">
                {COACHING_INCLUSIONS.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#c49a3c]/12 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={9} className="text-[#c49a3c]" strokeWidth={3} />
                    </span>
                    <span className="text-[#5A5048] text-xs leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 pb-4 pt-1">
              <button
                type="button"
                onClick={onAction}
                className="w-full py-2.5 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5]/70 text-xs font-semibold hover:bg-[#E3DCC8] active:scale-[0.98] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.1em' }}
              >
                Inquire Now
              </button>
            </div>
          </article>

          <article className={SERVICE_CARD}>
            <ServiceCardHeader
              icon={Users}
              title="Private Class"
              tagline="Solo or small group sessions"
            />
            <div className="px-4 py-3 border-t border-[#D4CDB5]/35">
              <SectionLabel icon={Tag}>Pricing</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {PRIVATE_TIERS.map((tier) => (
                  <PriceRow key={tier.label} label={tier.label} note={tier.note} price={tier.price} />
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-[#D4CDB5]/35 flex-1">
              <SectionLabel icon={Grid3X3}>Classes</SectionLabel>
              <div className="flex flex-wrap gap-1">
                {PRIVATE_CLASSES.map((name) => (
                  <span
                    key={name}
                    className="text-[10px] bg-[#F8F3E8] border border-[#D4CDB5]/50 text-[#5A5048] px-2 py-0.5 rounded-full"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-4 pb-4 pt-1">
              <button
                type="button"
                onClick={onAction}
                className="w-full py-2.5 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5]/70 text-xs font-semibold hover:bg-[#E3DCC8] active:scale-[0.98] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.1em' }}
              >
                Inquire Now
              </button>
            </div>
          </article>

          <article className={SERVICE_CARD}>
            <ServiceCardHeader
              icon={HeartPulse}
              title="Sports Recovery"
              tagline="Mobility & recovery treatments"
            />
            <div className="px-4 py-3 border-t border-[#D4CDB5]/35 flex-1">
              <SectionLabel icon={HeartPulse}>Treatments</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {RECOVERY_TIERS.map((tier) => (
                  <PriceRow key={tier.label} label={tier.label} price={tier.price} highlight={tier.highlight} plain />
                ))}
              </div>
            </div>
            <div className="px-4 pb-4 pt-3">
              <button
                type="button"
                onClick={onAction}
                className="w-full py-2.5 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5]/70 text-xs font-semibold hover:bg-[#E3DCC8] active:scale-[0.98] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.85rem', letterSpacing: '0.1em' }}
              >
                Inquire Now
              </button>
            </div>
          </article>
        </div>

        <p className="pt-4 text-center text-[11px] text-[#8A7E6E]">
          Rates in ₱ · confirm with our team for latest pricing.
        </p>
    </>
  );
}

export default function ServicesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const handleAction = () => navigate(isAuthenticated ? '/dashboard' : '/auth');

  return (
    <div className="bg-[#F8F3E8] flex-1 flex flex-col">
      <header className="mx-auto w-full max-w-6xl px-4 pb-3 pt-4 md:px-8 md:pt-5">
        <PublicBreadcrumb parent="Our Rates" current="Services" parentTo="/pricing" />
        <div className="mt-1 flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/10 text-[#c49a3c]">
            <UserRoundCheck size={16} />
          </span>
          <div>
            <h1
              className="leading-none text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.7rem, 3.5vw, 2.2rem)', letterSpacing: '0.05em' }}
            >
              Services
            </h1>
            <p className="mt-1 text-sm text-[#8A7E6E]">
              Coaching, private classes, and recovery.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 pb-5">
        <ServicesOfferings onAction={handleAction} />
      </div>
    </div>
  );
}
