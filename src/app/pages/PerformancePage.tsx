import { Activity, CalendarDays, Flame, Target } from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

const STATS = [
  { label: 'Sessions attended', value: '24', icon: Activity, hint: 'All time' },
  { label: 'This month', value: '6', icon: CalendarDays, hint: 'April 2026' },
  { label: 'Current streak', value: '5', icon: Flame, hint: 'Sessions in a row' },
  { label: 'Goal progress', value: '80%', icon: Target, hint: '8 of 10 classes' },
];

const RECENT = [
  { name: 'Yoga', date: 'Mon, Apr 7', note: '75 min · Coach Jodi' },
  { name: 'Calisthenics', date: 'Sat, Apr 5', note: '60 min · Coach Rex' },
  { name: 'Animal Flow', date: 'Thu, Apr 3', note: '60 min · Coach Ephraim' },
];

export default function PerformancePage() {
  return (
    <MemberPageShell searchPlaceholder="Search sessions…">
      <div className="pt-6 mb-6">
        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Account</p>
        <h2
          className="text-[#1E2A35] leading-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
        >
          Performance
        </h2>
        <p className="text-[#8A7E6E] text-sm mt-1 max-w-xl">
          Placeholder attendance stats. Real session history will replace these numbers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
        {STATS.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className={`min-w-0 rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-4 shadow-sm ${CARD_HOVER_GROW}`}
          >
            <Icon size={16} className="text-[#c49a3c] mb-3" />
            <p
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em' }}
            >
              {value}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#1E2A35]">{label}</p>
            <p className="mt-0.5 text-[11px] text-[#B0A898]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-[#8A7E6E] text-[11px] font-semibold uppercase tracking-widest">Recent sessions</p>
        {RECENT.map((item) => (
          <article
            key={`${item.name}-${item.date}`}
            className={`flex items-start gap-3 rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3.5 shadow-sm ${CARD_HOVER_GROW}`}
          >
            <div className="min-w-0 flex-1">
              <h3
                className="truncate text-[#1E2A35] leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.04em' }}
              >
                {item.name}
              </h3>
              <p className="mt-1 text-xs font-semibold text-[#8A7E6E]">{item.date}</p>
              <p className="mt-0.5 text-[11px] text-[#B0A898]">{item.note}</p>
            </div>
          </article>
        ))}
      </div>
    </MemberPageShell>
  );
}
