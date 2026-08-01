import { ArrowLeft, Check, Star, CalendarDays, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

const SINGLE_PASS_CLASSES = [
  'Calisthenics', 'Kickboxing', 'Mat Pilates', 'Yoga',
  'Animal Flow', 'Circuit Training', 'Groundworks', 'Capoeira',
];

const GOLD_TIERS = [
  { label: '1 Week', note: 'Unlimited all classes', price: '₱1,800' },
  { label: '1 Month', note: 'Unlimited all classes', price: '₱4,800' },
  { label: '3 Months', note: 'Unlimited all classes', price: '₱12,500' },
];

const GOLD_INCLUSIONS = [
  'Welcome gift upon joining',
  'Active Gold member event discount',
  'Membership card',
  'Priority booking',
];

const SILVER_TIERS = [
  { label: '1 Month', note: 'Calisthenics only', price: '₱3,600' },
  { label: '1 Month', note: 'Circuit Training only', price: '₱3,600' },
  { label: '1 Month', note: 'Mat Pilates only', price: '₱3,600' },
  { label: '1 Month', note: 'Yoga only', price: '₱3,600' },
];

const SILVER_INCLUSIONS = [
  '12 sessions for the price of 10',
  'Active Silver member event discount',
  'Membership card',
  'Priority booking',
];

const COACHING_TIERS = [
  { label: '1 Month', note: '6 sessions', price: '₱4,500' },
  { label: '1 Month', note: '12 sessions', price: '₱8,000' },
  { label: '2 Months', note: '20 sessions', price: '₱13,500' },
];

const COACHING_INCLUSIONS = [
  'Free wellness assessment',
  'Active member event discount',
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
  { label: 'Acupressure / Pressure Cupping', price: '₱850' },
  { label: 'Spinal Manipulation & Blading', price: '₱750' },
  { label: 'Dry Needling', price: '₱1,100' },
  { label: 'All-in-One Therapy', price: '₱2,500' },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleAction = () => navigate(isAuthenticated ? '/dashboard' : '/auth');

  return (
    <div className="bg-[#F8F3E8] min-h-screen">

      {/* ── Header ── */}
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 md:px-8 pt-5 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="md:hidden w-10 h-10 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] transition-colors active:scale-95 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '0.05em' }}
            >
              Pricing & Plans
            </h1>
            <p className="text-[#8A7E6E] text-xs mt-0.5">Official rates · No hidden fees</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-5 md:gap-8">

        {/* ── Desktop intro ── */}
        <p className="hidden md:block text-[#8A7E6E] text-center text-sm max-w-2xl mx-auto leading-relaxed -mb-2">
          Whether you're dropping in for the first time or committing to a full wellness journey, we have a plan built for you.
        </p>

        {/* ══════════════════════════════════════════════
            1. SINGLE CLASS PASS
        ══════════════════════════════════════════════ */}
        <div className="rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          <div className="px-5 md:px-7 pt-6 pb-5">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2
                className="text-[#1E2A35] leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}
              >
                Single Class Pass
              </h2>
              <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-[#EDE8D8] text-[#7A6A52] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">
                <Zap size={9} fill="currentColor" /> Flexible
              </span>
            </div>
            <p className="text-[#8A7E6E] text-sm leading-relaxed mb-5">
              Join us anytime with the flexibility of a one-time pass. Whether you're curious to try a class, exploring a new style, or fitting movement into a busy schedule, this option gives you access to the BALANSÉ experience without commitment.
            </p>

            <div className="flex flex-col md:flex-row md:items-center md:gap-10">
              {/* Price */}
              <div className="mb-5 md:mb-0 shrink-0">
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Per Session</p>
                <span
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2.8rem, 6vw, 3.8rem)', letterSpacing: '0.02em' }}
                >
                  ₱360
                </span>
              </div>

              <div className="flex-1">
                {/* Available classes */}
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Available Classes</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {SINGLE_PASS_CLASSES.map((c) => (
                    <span key={c} className="text-xs bg-[#F0EBE0] border border-[#D4CDB5]/70 text-[#5A4E3E] px-3 py-1 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
                {/* Note */}
                <div className="flex items-start gap-2 bg-[#F8F3E8] border border-[#D4CDB5]/50 rounded-xl px-3.5 py-2.5">
                  <CalendarDays size={13} className="text-[#C49A3C] mt-0.5 shrink-0" />
                  <p className="text-[#7A6A52] text-xs leading-relaxed">
                    The posted class schedule will serve as your guide. Schedule is updated every <span className="text-[#1E2A35]">Sunday night</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 md:px-7 pb-6">
            <button
              onClick={handleAction}
              className="w-full md:w-auto md:min-w-[180px] py-3.5 px-8 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5] hover:bg-[#E3DCC8] active:scale-[0.97] transition-all"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
            >
              View Schedule
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            2 & 3. GOLD + SILVER MEMBERSHIPS (side-by-side on desktop)
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 md:items-start">

          {/* GOLD */}
          <div className="rounded-3xl bg-white border border-[#C49A3C]/50 shadow-[0_4px_32px_rgba(196,154,60,0.13)] overflow-hidden flex flex-col">
            {/* Gold header band */}
            <div className="px-5 md:px-6 pt-6 pb-5" style={{ background: 'linear-gradient(135deg, rgba(196,154,60,0.10) 0%, rgba(248,243,232,0.40) 100%)' }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2
                  className="text-[#C49A3C] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.05em' }}
                >
                  Gold Membership
                </h2>
                <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-[#C49A3C] text-white px-2.5 py-1 rounded-full">
                  <Star size={9} fill="currentColor" /> Popular
                </span>
              </div>
              <p className="text-[#8A7E6E] text-sm leading-relaxed">
                Unlimited access to all classes. Perfect for those who value variety, flexibility, and balance in their wellness journey.
              </p>
            </div>

            {/* Pricing tiers */}
            <div className="px-5 md:px-6 py-4 border-t border-[#D4CDB5]/40">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Pricing</p>
              <div className="flex flex-col gap-2">
                {GOLD_TIERS.map((tier, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${i === 1 ? 'bg-[#C49A3C]/10 border border-[#C49A3C]/25' : 'bg-[#F8F3E8] border border-[#D4CDB5]/40'}`}>
                    <div>
                      <p className="text-[#1E2A35] text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '1rem' }}>{tier.label}</p>
                      <p className="text-[#8A7E6E] text-xs">{tier.note}</p>
                    </div>
                    <span
                      className={`text-[#1E2A35] leading-none ${i === 1 ? 'text-[#C49A3C]' : ''}`}
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.02em' }}
                    >
                      {tier.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusions */}
            <div className="px-5 md:px-6 py-4 border-t border-[#D4CDB5]/40 flex-1">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Inclusions</p>
              <div className="flex flex-col gap-2.5">
                {GOLD_INCLUSIONS.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#C49A3C] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                    <span className="text-[#5A5048] text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 md:px-6 pb-6 pt-2">
              <button
                onClick={handleAction}
                className="w-full py-3.5 rounded-full bg-[#C49A3C] text-white hover:bg-[#A67E2A] active:scale-[0.97] transition-all shadow-[0_4px_20px_rgba(196,154,60,0.35)]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
              >
                Book Now
              </button>
            </div>
          </div>

          {/* SILVER */}
          <div className="rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 md:px-6 pt-6 pb-5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.05em' }}
                >
                  Silver Membership
                </h2>
                <span className="shrink-0 text-[11px] font-bold bg-[#EDE8D8] text-[#7A6A52] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">
                  Focused
                </span>
              </div>
              <p className="text-[#8A7E6E] text-sm leading-relaxed">
                A cost-friendly way to stay consistent. Focus on one class and build progress in the style you love most.
              </p>
            </div>

            {/* Pricing tiers */}
            <div className="px-5 md:px-6 py-4 border-t border-[#D4CDB5]/40">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Pricing — 1 Month</p>
              <div className="flex flex-col gap-2">
                {SILVER_TIERS.map((tier, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8F3E8] border border-[#D4CDB5]/40 rounded-xl px-3.5 py-2.5">
                    <p className="text-[#5A5048] text-sm">{tier.note}</p>
                    <span
                      className="text-[#1E2A35] leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.02em' }}
                    >
                      {tier.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inclusions */}
            <div className="px-5 md:px-6 py-4 border-t border-[#D4CDB5]/40 flex-1">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Inclusions</p>
              <div className="flex flex-col gap-2.5">
                {SILVER_INCLUSIONS.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#EDE8D8] border border-[#D4CDB5] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-[#8A7E6E]" strokeWidth={3} />
                    </div>
                    <span className="text-[#5A5048] text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="px-5 md:px-6 pb-6 pt-2">
              <button
                onClick={handleAction}
                className="w-full py-3.5 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5] hover:bg-[#E3DCC8] active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            SECTION DIVIDER
        ══════════════════════════════════════════════ */}
        <div className="flex items-center gap-4 -my-1">
          <div className="flex-1 h-px bg-[#D4CDB5]/50" />
          <p className="text-[#B0A898] text-xs uppercase tracking-widest shrink-0">Premium Services</p>
          <div className="flex-1 h-px bg-[#D4CDB5]/50" />
        </div>

        {/* ══════════════════════════════════════════════
            4, 5, 6. PERSONAL COACHING · PRIVATE CLASS · SPORTS RECOVERY
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 md:items-start">

          {/* PERSONAL COACHING */}
          <div className="rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 pt-5 pb-4">
              <h2
                className="text-[#1E2A35] leading-none mb-1"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', letterSpacing: '0.05em' }}
              >
                Personal Coaching
              </h2>
              <p className="text-[#8A7E6E] text-xs leading-relaxed">
                One-on-one guidance tailored to your unique goals. Focused attention, customized programs, and expert support.
              </p>
            </div>

            <div className="px-5 py-4 border-t border-[#D4CDB5]/40">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Pricing</p>
              <div className="flex flex-col gap-2">
                {COACHING_TIERS.map((tier, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8F3E8] border border-[#D4CDB5]/40 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-[#1E2A35] text-xs" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '0.9rem' }}>{tier.label}</p>
                      <p className="text-[#8A7E6E] text-xs">{tier.note}</p>
                    </div>
                    <span
                      className="text-[#1E2A35] leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.02em' }}
                    >
                      {tier.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#D4CDB5]/40 flex-1">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Inclusions</p>
              <div className="flex flex-col gap-2">
                {COACHING_INCLUSIONS.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#EDE8D8] border border-[#D4CDB5] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={9} className="text-[#8A7E6E]" strokeWidth={3} />
                    </div>
                    <span className="text-[#5A5048] text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 pb-5 pt-2">
              <button
                onClick={handleAction}
                className="w-full py-3 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5] hover:bg-[#E3DCC8] active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em' }}
              >
                Inquire Now
              </button>
            </div>
          </div>

          {/* PRIVATE CLASS */}
          <div className="rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 pt-5 pb-4">
              <h2
                className="text-[#1E2A35] leading-none mb-1"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', letterSpacing: '0.05em' }}
              >
                Private Class
              </h2>
              <p className="text-[#8A7E6E] text-xs leading-relaxed">
                An exclusive, personalized experience. One-on-one or a small group with friends — designed around your goals, comfort, and pace.
              </p>
            </div>

            <div className="px-5 py-4 border-t border-[#D4CDB5]/40">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Pricing</p>
              <div className="flex flex-col gap-2">
                {PRIVATE_TIERS.map((tier, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8F3E8] border border-[#D4CDB5]/40 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="text-[#1E2A35] text-xs" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '0.9rem' }}>{tier.label}</p>
                      <p className="text-[#8A7E6E] text-xs">{tier.note}</p>
                    </div>
                    <span
                      className="text-[#1E2A35] leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.02em' }}
                    >
                      {tier.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#D4CDB5]/40 flex-1">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Applicable Classes</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRIVATE_CLASSES.map((c) => (
                  <span key={c} className="text-[11px] bg-[#F0EBE0] border border-[#D4CDB5]/70 text-[#5A4E3E] px-2.5 py-0.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="px-5 pb-5 pt-2">
              <button
                onClick={handleAction}
                className="w-full py-3 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5] hover:bg-[#E3DCC8] active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em' }}
              >
                Inquire Now
              </button>
            </div>
          </div>

          {/* SPORTS RECOVERY */}
          <div className="rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 pt-5 pb-4">
              <h2
                className="text-[#1E2A35] leading-none mb-1"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', letterSpacing: '0.05em' }}
              >
                Sports Recovery
              </h2>
              <p className="text-[#8A7E6E] text-xs leading-relaxed">
                Specialized recovery services for athletes and active individuals. Target tension, aid mobility, and promote faster recovery.
              </p>
            </div>

            <div className="px-5 py-4 border-t border-[#D4CDB5]/40 flex-1">
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Treatments</p>
              <div className="flex flex-col gap-2">
                {RECOVERY_TIERS.map((tier, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${i === 3 ? 'bg-[#C49A3C]/08 border border-[#C49A3C]/25' : 'bg-[#F8F3E8] border border-[#D4CDB5]/40'}`}>
                    <p className={`text-sm leading-snug pr-2 ${i === 3 ? 'text-[#1E2A35]' : 'text-[#5A5048]'}`}>{tier.label}</p>
                    <span
                      className={`leading-none shrink-0 ${i === 3 ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.02em' }}
                    >
                      {tier.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 pb-5 pt-4">
              <button
                onClick={handleAction}
                className="w-full py-3 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5] hover:bg-[#E3DCC8] active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.9rem', letterSpacing: '0.1em' }}
              >
                Inquire Now
              </button>
            </div>
          </div>
        </div>

        {/* Fine print */}
        <p className="text-[#B0A898] text-xs text-center px-4 pb-2">
          All rates are in Philippine Peso (₱). Prices are subject to change — confirm with our team for the latest rates.
        </p>

      </div>
    </div>
  );
}