import { useEffect, useState } from 'react';
import { Check, Star, ChevronRight, Zap, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';

const SINGLE_PASS_CLASSES = [
  'Calisthenics', 'Kickboxing', 'Mat Pilates', 'Yoga',
  'Animal Flow', 'Circuit Training', 'Groundworks', 'Capoeira',
];

// Rotate through pairs of disciplines for the Single Class Pass preview pills
const SINGLE_PASS_PAIRS = Array.from(
  { length: Math.ceil(SINGLE_PASS_CLASSES.length / 2) },
  (_, i) => SINGLE_PASS_CLASSES.slice(i * 2, i * 2 + 2),
);

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

const HERO_IMG =
  'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

type MembershipPlan = 'gold' | 'silver';

function MembershipDetailsModal({
  plan,
  onClose,
}: {
  plan: MembershipPlan;
  onClose: () => void;
}) {
  const isGold = plan === 'gold';
  const tiers = isGold ? GOLD_TIERS : SILVER_TIERS;
  const inclusions = isGold ? GOLD_INCLUSIONS : SILVER_INCLUSIONS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3 shrink-0"
          style={isGold ? { background: 'linear-gradient(135deg, rgba(196,154,60,0.10) 0%, rgba(248,243,232,0.40) 100%)' } : undefined}
        >
          <div className="min-w-0">
            <div className="flex items-start gap-2 flex-wrap mb-1">
              <h3
                className={`leading-none ${isGold ? 'text-[#c49a3c]' : 'text-[#1E2A35]'}`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', letterSpacing: '0.05em' }}
              >
                {isGold ? 'Gold Membership' : 'Silver Membership'}
              </h3>
              {isGold ? (
                <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-[#c49a3c] text-white px-2.5 py-1 rounded-full">
                  <Star size={9} fill="currentColor" /> Popular
                </span>
              ) : (
                <span className="shrink-0 text-[11px] font-bold bg-[#EDE8D8] text-[#7A6A52] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">
                  Focused
                </span>
              )}
            </div>
            <p className="text-[#8A7E6E] text-sm leading-relaxed">
              {isGold
                ? 'Unlimited access to all classes. Perfect for those who value variety, flexibility, and balance in their wellness journey.'
                : 'A cost-friendly way to stay consistent. Focus on one class and build progress in the style you love most.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 overflow-y-auto flex-1">
          <div className="py-1 border-b border-[#D4CDB5]/40 mb-5">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">
              {isGold ? 'Pricing' : 'Pricing — 1 Month'}
            </p>
            <div className="flex flex-col gap-2 pb-5">
              {tiers.map((tier, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${
                    isGold && i === 1
                      ? 'bg-[#c49a3c]/10 border border-[#c49a3c]/25'
                      : 'bg-[#F8F3E8] border border-[#D4CDB5]/40'
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    {isGold ? (
                      <>
                        <p className="text-[#1E2A35] text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em', fontSize: '1rem' }}>{tier.label}</p>
                        <p className="text-[#8A7E6E] text-xs">{tier.note}</p>
                      </>
                    ) : (
                      <p className="text-[#5A5048] text-sm">{tier.note}</p>
                    )}
                  </div>
                  <span
                    className={`leading-none shrink-0 ${isGold && i === 1 ? 'text-[#c49a3c]' : 'text-[#1E2A35]'}`}
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.02em' }}
                  >
                    {tier.price}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Inclusions</p>
            <div className="flex flex-col gap-2.5">
              {inclusions.map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isGold ? 'bg-[#c49a3c]' : 'bg-[#EDE8D8] border border-[#D4CDB5]'
                  }`}>
                    <Check size={11} className={isGold ? 'text-white' : 'text-[#8A7E6E]'} strokeWidth={3} />
                  </div>
                  <span className="text-[#5A5048] text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleAction = () => navigate(isAuthenticated ? '/dashboard' : '/auth');
  const handleSeeMore = () => navigate('/disciplines');

  // Alternate which pair of disciplines is shown on the Single Class Pass card
  const [pairIndex, setPairIndex] = useState(0);
  const [membershipModal, setMembershipModal] = useState<MembershipPlan | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      setPairIndex((i) => (i + 1) % SINGLE_PASS_PAIRS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {membershipModal && (
        <MembershipDetailsModal plan={membershipModal} onClose={() => setMembershipModal(null)} />
      )}

      {/* ── Hero: Pricing heading + Single Class Pass ── */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <img
            src={HERO_IMG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/50 md:bg-gradient-to-r md:from-black/65 md:via-black/45 md:to-black/35" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-5 md:pt-8 pb-8 md:pb-10">
          <PublicBreadcrumb parent="Our Rates" current="Pricing" parentTo="/pricing" tone="onDark" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-10 lg:gap-x-12 md:items-center pb-8 md:pb-10">
            {/* Left: heading */}
            <div className="min-w-0 md:pr-2">
              <h1
                className="text-white leading-none mb-2"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4.5vw, 3rem)', letterSpacing: '0.05em' }}
              >
                Pricing & Plans
              </h1>
              <p className="text-white/75 text-sm leading-relaxed max-w-sm">
                Whether you&apos;re dropping in for the first time or committing to a full wellness journey — we have a plan built for you.
              </p>
            </div>

            {/* Right: Single Class Pass card */}
            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-sm">
                <div className={`rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm px-6 py-6 ${CARD_HOVER_GROW} hover:shadow-md`}>
              {/* Title row */}
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <h2
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.55rem', letterSpacing: '0.05em' }}
                >
                  Single Class Pass
                </h2>
                <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-[#EDE8D8] text-[#7A6A52] border border-[#D4CDB5]/60 px-2.5 py-1 rounded-full">
                  <Zap size={9} fill="currentColor" /> Flexible
                </span>
              </div>

              {/* Subtitle */}
              <p className="text-[#8A7E6E] text-xs mb-5">Drop in to any class, no commitment required.</p>

              {/* Price */}
              <div className="flex items-baseline gap-1.5 mb-5">
                <span
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.75rem', letterSpacing: '0.02em' }}
                >
                  ₱360
                </span>
                <span className="text-[#8A7E6E] text-sm">/session</span>
              </div>

              <div className="h-px bg-[#D4CDB5]/40 mb-5" />

              {/* Available classes */}
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2.5">Available Classes</p>
              <div key={pairIndex} className="flex flex-wrap gap-2 mb-5 animate-in fade-in duration-500">
                {SINGLE_PASS_PAIRS[pairIndex].map((c) => (
                  <span key={c} className="text-xs bg-[#F0EBE0] border border-[#D4CDB5]/70 text-[#5A4E3E] px-3 py-1 rounded-full">
                    {c}
                  </span>
                ))}
              </div>

              {/* See More */}
              <button
                onClick={handleSeeMore}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1E2A35] bg-white border border-[#D4CDB5] rounded-full px-4 py-2 hover:bg-[#F0EBE0] active:scale-[0.97] transition-all"
              >
                See More <ChevronRight size={12} />
              </button>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/25" aria-hidden="true" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          2 & 3. GOLD + SILVER MEMBERSHIPS (side-by-side on desktop)
      ══════════════════════════════════════════════ */}
      <section className="bg-[#1E2A35] py-6 md:py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 md:items-start">

          {/* GOLD */}
          <div className={`rounded-3xl bg-white border border-[#c49a3c]/50 shadow-[0_4px_32px_rgba(196,154,60,0.13)] overflow-hidden flex flex-col ${CARD_HOVER_GROW} hover:shadow-lg`}>
            <div className="px-5 md:px-6 pt-6 pb-5 flex-1" style={{ background: 'linear-gradient(135deg, rgba(196,154,60,0.10) 0%, rgba(248,243,232,0.40) 100%)' }}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2
                  className="text-[#c49a3c] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.05em' }}
                >
                  Gold Membership
                </h2>
                <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold bg-[#c49a3c] text-white px-2.5 py-1 rounded-full">
                  <Star size={9} fill="currentColor" /> Popular
                </span>
              </div>
              <p className="text-[#8A7E6E] text-sm leading-relaxed mb-5">
                Unlimited access to all classes. Perfect for those who value variety, flexibility, and balance in their wellness journey.
              </p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '0.02em' }}
                >
                  ₱4,800
                </span>
                <span className="text-[#8A7E6E] text-sm">/month</span>
              </div>
            </div>

            <div className="px-5 md:px-6 pb-6 pt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setMembershipModal('gold')}
                className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-[#1E2A35] bg-white border border-[#D4CDB5] rounded-full px-4 py-3 hover:bg-[#F0EBE0] active:scale-[0.97] transition-all"
              >
                See More <ChevronRight size={12} />
              </button>
              <button
                type="button"
                onClick={handleAction}
                className="flex-1 py-3 rounded-full bg-[#c49a3c] text-white hover:bg-[#a67f2e] active:scale-[0.97] transition-all shadow-[0_4px_20px_rgba(196,154,60,0.35)]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
              >
                Book Now
              </button>
            </div>
          </div>

          {/* SILVER */}
          <div className={`rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col ${CARD_HOVER_GROW} hover:shadow-md`}>
            <div className="px-5 md:px-6 pt-6 pb-5 flex-1">
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
              <p className="text-[#8A7E6E] text-sm leading-relaxed mb-5">
                A cost-friendly way to stay consistent. Focus on one class and build progress in the style you love most.
              </p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 2.75rem)', letterSpacing: '0.02em' }}
                >
                  ₱3,600
                </span>
                <span className="text-[#8A7E6E] text-sm">/month</span>
              </div>
            </div>

            <div className="px-5 md:px-6 pb-6 pt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setMembershipModal('silver')}
                className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-[#1E2A35] bg-white border border-[#D4CDB5] rounded-full px-4 py-3 hover:bg-[#F0EBE0] active:scale-[0.97] transition-all"
              >
                See More <ChevronRight size={12} />
              </button>
              <button
                type="button"
                onClick={handleAction}
                className="flex-1 py-3 rounded-full bg-[#EDE8D8] text-[#1E2A35] border border-[#D4CDB5] hover:bg-[#E3DCC8] active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
        </div>
      </section>

      <p className="text-[#B0A898] text-xs text-center px-4 py-6">
        All rates are in Philippine Peso (₱). Prices are subject to change — confirm with our team for the latest rates.
      </p>
    </div>
  );
}