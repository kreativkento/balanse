import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { CheckCircle2, Clock, Calendar, User, ArrowRight, LayoutDashboard, Phone } from 'lucide-react';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

// ─────────────────────────────────────────────
// CLASS ACCENT COLORS
// ─────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  'Yoga':             '#c49a3c',
  'Calisthenics':     '#3A4A5A',
  'Animal Flow':      '#6B8E6B',
  'Groundworks':      '#8B6F5A',
  'Circuit Training': '#B86A4A',
  'Mat Pilates':      '#9A7A8A',
  'Kickboxing':       '#7A3A4A',
  'Capoeira':         '#A07050',
  'Personal Coaching':'#a67f2e',
};

// ─────────────────────────────────────────────
// WHAT HAPPENS NEXT STEPS
// ─────────────────────────────────────────────

const NEXT_STEPS = [
  {
    icon: <Clock size={16} className="text-[#c49a3c]" />,
    title: 'Payment Review',
    desc: 'Our team will review your proof of payment within 24 hours.',
  },
  {
    icon: <CheckCircle2 size={16} className="text-[#8A9E7A]" />,
    title: 'Booking Confirmed',
    desc: 'Once verified, your spot will be officially reserved and confirmed.',
  },
  {
    icon: <Phone size={16} className="text-[#9A7A8A]" />,
    title: "You'll be Notified",
    desc: "We'll reach out via your registered contact once your booking is approved.",
  },
];

// ─────────────────────────────────────────────
// BOOKING PENDING PAGE
// ─────────────────────────────────────────────

export default function BookingPendingPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { booking, reference, fileName } = location.state || {};

  useEffect(() => {
    if (!booking) navigate('/dashboard');
  }, [booking, navigate]);

  if (!booking) return null;

  const classColor = CLASS_COLORS[booking.className] || '#c49a3c';

  return (
    <div className="bg-[#F8F3E8] min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-5">

        {/* ── Status Icon + Heading ── */}
        <div className="text-center">
          {/* Pending ring animation */}
          <div className="relative inline-flex items-center justify-center mb-5">
            {/* Outer pulse ring */}
            <div className="absolute w-28 h-28 rounded-full border-2 border-[#c49a3c]/20 animate-ping" style={{ animationDuration: '2.5s' }} />
            {/* Middle ring */}
            <div className="absolute w-24 h-24 rounded-full border border-[#c49a3c]/30" />
            {/* Icon container */}
            <div className="w-20 h-20 rounded-full bg-[#c49a3c]/12 border-2 border-[#c49a3c]/40 flex items-center justify-center">
              <Clock size={34} className="text-[#c49a3c]" />
            </div>
          </div>

          <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-full mb-3 uppercase tracking-wider">
            <Clock size={11} /> Pending Verification
          </span>

          <h1
            className="text-[#1E2A35] leading-none mb-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '0.05em' }}
          >
            Booking Submitted!
          </h1>
          <p className="text-[#8A7E6E] text-sm max-w-md mx-auto leading-relaxed">
            Your class request has been received. Our team will review your payment and confirm your spot within 24 hours.
          </p>
        </div>

        {/* ── Booking Summary Card ── */}
        <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
          <div className="h-1.5" style={{ backgroundColor: classColor }} />

          <div className="p-6">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Booking Summary</p>

            {/* Class name */}
            <h2
              className="leading-none mb-5"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '2rem',
                letterSpacing: '0.04em',
                color: classColor,
              }}
            >
              {booking.className}
            </h2>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#F0EBE0] flex items-center justify-center shrink-0">
                  <Calendar size={13} className="text-[#c49a3c]" />
                </div>
                <div>
                  <p className="text-[#9A8E7E]" style={{ fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Date</p>
                  <p className="text-[#1E2A35] text-sm font-semibold">{booking.dateLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#F0EBE0] flex items-center justify-center shrink-0">
                  <Clock size={13} className="text-[#c49a3c]" />
                </div>
                <div>
                  <p className="text-[#9A8E7E]" style={{ fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Time</p>
                  <p className="text-[#1E2A35] text-sm font-semibold">{booking.time} · {booking.duration}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#F0EBE0] flex items-center justify-center shrink-0">
                  <User size={13} className="text-[#c49a3c]" />
                </div>
                <div>
                  <p className="text-[#9A8E7E]" style={{ fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Coach</p>
                  <p className="text-[#1E2A35] text-sm font-semibold">{booking.trainer}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#F0EBE0] flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} className="text-[#c49a3c]" />
                </div>
                <div>
                  <p className="text-[#9A8E7E]" style={{ fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Amount Paid</p>
                  <p className="text-[#1E2A35] text-sm font-semibold">{booking.price}</p>
                </div>
              </div>
            </div>

            {/* Reference + file */}
            <div className="mt-5 pt-5 border-t border-[#D4CDB5]/40 flex flex-col gap-2">
              {reference && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">Reference No.</span>
                  <span
                    className="text-[#1E2A35] text-sm"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
                  >
                    {reference}
                  </span>
                </div>
              )}
              {fileName && (
                <div className="flex items-center justify-between">
                  <span className="text-[#9A8E7E] text-xs uppercase tracking-widest">Proof Uploaded</span>
                  <span className="text-[#6B8E6B] text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> {fileName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── What Happens Next ── */}
        <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-6 ${CARD_HOVER_GROW}`}>
          <p
            className="text-[#1E2A35] mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
          >
            What Happens Next
          </p>

          <div className="flex flex-col gap-0">
            {NEXT_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                {/* Line + dot */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-xl bg-[#F0EBE0] border border-[#D4CDB5]/50 flex items-center justify-center shrink-0">
                    {step.icon}
                  </div>
                  {i < NEXT_STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-[#D4CDB5]/50 my-1" style={{ minHeight: '24px' }} />
                  )}
                </div>
                <div className="pb-5">
                  <p className="text-[#1E2A35] text-sm font-semibold mb-0.5">{step.title}</p>
                  <p className="text-[#8A7E6E] text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-[#c49a3c] text-white rounded-full py-4 shadow-[0_4px_20px_rgba(196,154,60,0.35)] hover:bg-[#a67f2e] active:scale-[0.97] transition-all"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
          >
            <LayoutDashboard size={17} /> Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/book')}
            className="flex-1 flex items-center justify-center gap-2 bg-white text-[#1E2A35] border border-[#D4CDB5]/70 rounded-full py-4 hover:border-[#c49a3c]/40 hover:bg-[#F8F3E8] active:scale-[0.97] transition-all"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.1em' }}
          >
            Book Another Class <ArrowRight size={17} />
          </button>
        </div>

      </div>
    </div>
  );
}