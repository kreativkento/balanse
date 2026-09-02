import { useNavigate } from 'react-router';
import { ChevronRight, Check, Leaf, Users, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GymButton } from '../components/ui/GymButton';
import { HelpSupportFab } from '../components/layout/HelpSupportFab';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

const HERO_IMG =
  'https://images.unsplash.com/photo-1761971975973-cbb3e59263de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';
const YOGA_IMG =
  'https://images.unsplash.com/photo-1767611120077-3697335ec748?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const PILATES_IMG =
  'https://images.unsplash.com/photo-1637157216470-d92cd2edb2e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';
const CALISTHENICS_IMG =
  'https://images.unsplash.com/photo-1758274539089-8b2bd10eee92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600';

const classPreview = [
  {
    name: 'Yoga',
    img: YOGA_IMG,
    duration: '75 min',
    level: 'All Levels',
    description: 'Reconnect mind and body through guided breathwork and flowing postures.',
  },
  {
    name: 'Mat Pilates',
    img: PILATES_IMG,
    duration: '60 min',
    level: 'All Levels',
    description: 'Strengthen your core and improve posture through mindful Pilates movements.',
  },
  {
    name: 'Calisthenics',
    img: CALISTHENICS_IMG,
    duration: '60 min',
    level: 'All Levels',
    description: 'Build real strength using only your bodyweight with progressive techniques.',
  },
];

const perks = [
  'Expert-led sessions in 9 disciplines',
  'Small group classes for personal attention',
  'Serene, thoughtfully designed studio spaces',
  'Flexible scheduling for busy lifestyles',
  'Holistic wellness — body, mind & spirit',
  'Community of 200+ dedicated members',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleBook = () => {
    navigate(isAuthenticated ? '/dashboard' : '/auth');
  };

  return (
    <div className="bg-[#F8F3E8]">
      {/* ─── HERO ─── */}
      <section className="relative h-[72vh] md:h-[88vh] overflow-hidden">
        <img
          src={HERO_IMG}
          alt="BALANSÉ wellness studio"
          className="w-full h-full object-cover"
        />

        {/* Subtle global scrim — keeps image visible while lifting overall contrast */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Directional text-area overlay — fades from dark at the text side to transparent */}
        {/* Mobile: bottom-to-top   |   Desktop: left-to-right */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/5 md:bg-gradient-to-r md:from-black/70 md:via-black/40 md:to-transparent" />

        {/* Extra depth anchor at bottom-left corner on desktop for a cinematic vignette */}
        <div className="hidden md:block absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 80% at 0% 100%, rgba(0,0,0,0.35) 0%, transparent 70%)' }} />

        {/* Stats bar — mobile only */}
        <div className="md:hidden absolute top-4 left-4 right-4 flex gap-2 justify-end">
          {[
            { icon: <Users size={12} />, label: '200+ Members' },
            { icon: <Leaf size={12} />, label: '9 Disciplines' },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 bg-[#F8F3E8]/80 backdrop-blur-md rounded-full px-3 py-1.5"
            >
              <span className="text-[#745b3c]">{s.icon}</span>
              <span className="text-[#1E2A35] text-xs font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Hero text */}
        <div className="absolute inset-0 flex items-end md:items-center">
          <div className="w-full md:max-w-6xl md:mx-auto px-5 md:px-8 pb-8 md:pb-0">
            <div className="md:max-w-xl">
              <p className="text-[#745b3c] font-semibold text-xs uppercase tracking-[0.25em] mb-3">
                Premium Wellness Hub
              </p>
              <h1
                className="text-white leading-none mb-4 md:mb-6"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                  lineHeight: '1',
                  letterSpacing: '0.04em',
                }}
              >
                Find Your
                <br />
                Balance.
              </h1>
              <p className="hidden md:block text-white/70 text-lg mb-8 max-w-md leading-relaxed">
                Nine movement disciplines. Seven world-class coaches. One studio built around your wellbeing.
              </p>
              {/* Desktop stats pills */}
              <div className="hidden md:flex items-center gap-4 mb-8">
                {[
                  { icon: <Users size={14} />, label: '200+ Members' },
                  { icon: <Leaf size={14} />, label: '9 Disciplines' },
                  { icon: <Clock size={14} />, label: '7 Expert Coaches' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-2"
                  >
                    <span className="text-[#745b3c]">{s.icon}</span>
                    <span className="text-white text-sm font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <GymButton variant="primary" size="lg" onClick={handleBook} className="md:w-auto w-full">
                  Schedule a Class
                </GymButton>
                <button
                  onClick={() => navigate('/classes')}
                  className="hidden md:flex items-center gap-2 px-6 py-4 border-2 border-white/40 text-white rounded-full font-semibold hover:border-white hover:bg-white/10 transition-all"
                >
                  Explore Classes
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-6xl mx-auto">

        {/* ─── ABOUT ─── */}
        <section className="px-4 md:px-8 pt-14 md:pt-20 pb-10 md:pb-16">
          <div className="mb-6 md:mb-8 flex flex-col gap-4">
            <p className="text-[#8A7E6E] text-sm md:text-base leading-relaxed text-justify">
              BALANSÉ is a wellness hub devoted to helping people maintain balance through movement, mindfulness, and whole-body well-being. We believe that true wellness is holistic — not a single workout or a passing trend, but a way of living that honors both body and mind. Every detail of our studio is designed to help you arrive, breathe deeply, and leave feeling restored.
            </p>
            <p className="text-[#8A7E6E] text-sm md:text-base leading-relaxed text-justify">
              From yoga and mat pilates to calisthenics, kickboxing, and mindful floor work, our disciplines are curated to meet you wherever you are in your journey. Expert coaches guide each session with care and intention, creating a space where beginners feel welcome and seasoned movers feel challenged. Here, movement is never about perfection — it is about presence, progress, and finding your own rhythm.
            </p>
            <p className="text-[#8A7E6E] text-sm md:text-base leading-relaxed text-justify">
              Whether you are stepping through our doors for the very first time or returning to deepen your practice, you will find a community that moves together and supports one another along the way. Explore the studio below — from sessions in motion to the everyday moments that define life at BALANSÉ — and discover what balance means for you.
            </p>
          </div>
        </section>

        {/* ─── CLASSES PREVIEW ─── */}
        <section className="px-4 md:px-8 pt-2 md:pt-4 pb-14 md:pb-20">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2
              className="text-[#1E2A35]"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '1.8rem',
                letterSpacing: '0.05em',
              }}
            >
              Our Classes
            </h2>
            <button
              onClick={() => navigate('/classes')}
              className="flex items-center gap-1 text-[#745b3c] text-sm font-semibold active:opacity-70 transition-opacity"
            >
              View All <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
            {classPreview.map((cls) => (
              <div
                key={cls.name}
                role="link"
                tabIndex={0}
                onClick={() => navigate('/classes')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/classes');
                  }
                }}
                className={`rounded-2xl overflow-hidden bg-white border border-[#D4CDB5]/60 shadow-sm ${CARD_HOVER_GROW} hover:shadow-md cursor-pointer`}
              >
                <img src={cls.img} alt={cls.name} className="w-full h-44 object-cover" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3
                      className="text-[#1E2A35]"
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: '1.3rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {cls.name}
                    </h3>
                    <span className="flex items-center gap-1 text-[#8A7E6E] text-xs">
                      <Clock size={11} /> {cls.duration}
                    </span>
                  </div>
                  <p className="text-[#8A7E6E] text-sm leading-relaxed mb-3">{cls.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-[#EDE8D8] text-[#5A5048] px-3 py-1.5 rounded-full border border-[#D4CDB5]">
                      {cls.level}
                    </span>
                    <span className="text-[#745b3c] text-sm font-semibold flex items-center gap-1">
                      View Details <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <GymButton
            variant="secondary"
            size="md"
            fullWidth
            className="mt-6 md:w-auto md:mx-auto md:block md:px-12"
            onClick={() => navigate('/classes')}
          >
            View All 9 Classes
          </GymButton>
        </section>

        {/* ─── PERKS ─── */}
        <section id="why-balanse" className="mx-4 md:mx-8 mb-14 md:mb-20 rounded-3xl border border-[#745b3c]/25 px-5 md:px-10 py-8 md:py-14 scroll-mt-24" style={{ backgroundColor: 'rgba(116,91,60,0.07)' }}>
          <h2
            className="text-[#1E2A35] mb-4 md:mb-6 md:text-center"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.8rem',
              letterSpacing: '0.05em',
            }}
          >
            Why BALANSÉ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#745b3c] flex items-center justify-center shrink-0">
                  <Check size={13} className="text-white" strokeWidth={3} />
                </div>
                <p className="text-[#5A5048] text-sm">{perk}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      <HelpSupportFab />
    </div>
  );
}