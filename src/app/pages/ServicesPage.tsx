import { Check } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { PublicBreadcrumb } from '../components/layout/PublicBreadcrumb';

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

export default function ServicesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const handleAction = () => navigate(isAuthenticated ? '/dashboard' : '/auth');

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="border-b border-[#D4CDB5]/60">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 pb-5">
          <PublicBreadcrumb parent="Our Rates" current="Services" parentTo="/pricing" />
          <h1
            className="text-[#1E2A35] leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              letterSpacing: '0.05em',
            }}
          >
            Services
          </h1>
          <p className="text-[#8A7E6E] text-sm mt-2 max-w-xl">
            Premium one-on-one coaching, private sessions, and recovery treatments tailored to you.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:pb-10 flex flex-col gap-5 md:gap-8">
        <div className="flex items-center gap-4 -my-1">
          <div className="flex-1 h-px bg-[#D4CDB5]/50" />
          <p className="text-[#B0A898] text-xs uppercase tracking-widest shrink-0">Premium Services</p>
          <div className="flex-1 h-px bg-[#D4CDB5]/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 md:items-start">
          {/* PERSONAL COACHING */}
          <div className={`rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col ${CARD_HOVER_GROW} hover:shadow-md`}>
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
          <div className={`rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col ${CARD_HOVER_GROW} hover:shadow-md`}>
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
          <div className={`rounded-3xl bg-white border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex flex-col ${CARD_HOVER_GROW} hover:shadow-md`}>
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
                  <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${i === 3 ? 'bg-[#c49a3c]/08 border border-[#c49a3c]/25' : 'bg-[#F8F3E8] border border-[#D4CDB5]/40'}`}>
                    <p className={`text-sm leading-snug pr-2 ${i === 3 ? 'text-[#1E2A35]' : 'text-[#5A5048]'}`}>{tier.label}</p>
                    <span
                      className={`leading-none shrink-0 ${i === 3 ? 'text-[#c49a3c]' : 'text-[#1E2A35]'}`}
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

        <p className="text-[#B0A898] text-xs text-center px-4 pb-2">
          All rates are in Philippine Peso (₱). Prices are subject to change — confirm with our team for the latest rates.
        </p>
      </div>
    </div>
  );
}
