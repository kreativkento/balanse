import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { MessageSquare, Bot, ArrowUpRight } from 'lucide-react';
import { useDevAuth } from '../context/DevAuthContext';
import { DevSidebar } from '../components/layout/DevSidebar';
import { PageLoadingScreen } from '../components/layout/PageLoadingScreen';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { getPhilippinesGreeting } from '../../lib/philippines-time';

const MODULES = [
  {
    label: 'System Feedback',
    path: '/development/feedback',
    icon: MessageSquare,
    desc: 'Dev inbox (level 4) — update status and priority on tickets forwarded from admin.',
  },
  {
    label: 'AI Setup',
    path: '/development/ai-setup',
    icon: Bot,
    desc: 'Temporarily disabled — AI tooling and integrations will return here later.',
    disabled: true,
  },
];

export default function DevDashboardPage() {
  const navigate = useNavigate();
  const { devUser, devAuthReady } = useDevAuth();

  useEffect(() => {
    if (!devAuthReady) return;
    if (!devUser) navigate('/development', { replace: true });
  }, [devAuthReady, devUser, navigate]);

  if (!devAuthReady) return <PageLoadingScreen />;
  if (!devUser) return null;

  const greeting = getPhilippinesGreeting();

  return (
    <DevSidebar>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-10">
          <p className="text-[#9A8E7E] text-sm mb-1">{greeting}, {devUser.name.split(' ')[0]}</p>
          <h1
            className="text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '0.04em', lineHeight: 1 }}
          >
            Development Dashboard
          </h1>
          <p className="text-[#B0A898] text-xs mt-1.5">Internal tools · BALANSÉ Wellness Hub</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map(({ label, path, icon: Icon, desc, disabled }) => {
            const cardClass = disabled
              ? 'bg-white/70 rounded-2xl border border-[#E8E2D2]/60 px-6 py-5 shadow-sm opacity-60 cursor-not-allowed'
              : `group bg-white rounded-2xl border border-[#E8E2D2]/80 px-6 py-5 shadow-sm hover:border-[#c49a3c]/40 hover:shadow-md ${CARD_HOVER_GROW}`;
            const inner = (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${disabled ? 'bg-[#8A7E6E]' : 'bg-[#1E2A35]'}`}>
                    <Icon size={18} className={disabled ? 'text-[#EDE8D8]' : 'text-[#c49a3c]'} />
                  </div>
                  {disabled ? (
                    <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[#8A7E6E] bg-[#EDE8D8] rounded-full px-2 py-1">
                      Unavailable
                    </span>
                  ) : (
                    <ArrowUpRight size={16} className="text-[#B0A898] group-hover:text-[#c49a3c] transition-colors" />
                  )}
                </div>
                <h2
                  className="text-[#1E2A35] mb-1"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.04em' }}
                >
                  {label}
                </h2>
                <p className="text-[#8A7E6E] text-sm leading-relaxed">{desc}</p>
              </>
            );

            if (disabled) {
              return (
                <div key={path} className={cardClass} aria-disabled="true">
                  {inner}
                </div>
              );
            }

            return (
              <Link key={path} to={path} className={cardClass}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </DevSidebar>
  );
}
