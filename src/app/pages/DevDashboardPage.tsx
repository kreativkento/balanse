import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { Ticket, Bot, ArrowUpRight } from 'lucide-react';
import { useDevAuth } from '../context/DevAuthContext';
import { DevSidebar } from '../components/layout/DevSidebar';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

const MODULES = [
  {
    label: 'Ticket Management',
    path: '/development/tickets',
    icon: Ticket,
    desc: 'Track and escalate tickets — level 1 for admin, level 2 for developers.',
  },
  {
    label: 'AI Setup',
    path: '/development/ai-setup',
    icon: Bot,
    desc: 'Configure AI tooling and integrations for the studio.',
  },
];

export default function DevDashboardPage() {
  const navigate = useNavigate();
  const { devUser } = useDevAuth();

  useEffect(() => {
    if (!devUser) navigate('/development');
  }, [devUser, navigate]);

  if (!devUser) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
          {MODULES.map(({ label, path, icon: Icon, desc }) => (
            <Link
              key={path}
              to={path}
              className={`group bg-white rounded-2xl border border-[#E8E2D2]/80 px-6 py-5 shadow-sm hover:border-[#C49A3C]/40 hover:shadow-md ${CARD_HOVER_GROW}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#1E2A35] flex items-center justify-center">
                  <Icon size={18} className="text-[#C49A3C]" />
                </div>
                <ArrowUpRight size={16} className="text-[#B0A898] group-hover:text-[#C49A3C] transition-colors" />
              </div>
              <h2
                className="text-[#1E2A35] mb-1"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.04em' }}
              >
                {label}
              </h2>
              <p className="text-[#8A7E6E] text-sm leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </DevSidebar>
  );
}
