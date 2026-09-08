import { useMemo, useState } from 'react';
import { CreditCard, Wifi } from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { useAuth } from '../context/AuthContext';

type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

interface SubscriptionRecord {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
}

const HISTORY: SubscriptionRecord[] = [
  { id: 'SUB-1042', type: 'Gold Membership', startDate: 'Mar 1, 2026', endDate: 'Apr 30, 2026', status: 'active' },
  { id: 'SUB-0988', type: 'Silver Membership', startDate: 'Jan 1, 2026', endDate: 'Feb 28, 2026', status: 'expired' },
  { id: 'SUB-0911', type: '10-Session Pack', startDate: 'Nov 4, 2025', endDate: 'Dec 31, 2025', status: 'expired' },
  { id: 'SUB-0840', type: 'Drop-in Month', startDate: 'Sep 1, 2025', endDate: 'Sep 15, 2025', status: 'cancelled' },
];

const STATUS_STYLE: Record<SubscriptionStatus, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  expired: 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

export default function MemberSubscription() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const current = HISTORY[0];
  const memberName = user?.name || 'Member';
  const memberNumber = 'BN · 8841 2290';

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return HISTORY;
    return HISTORY.filter((row) =>
      `${row.type} ${row.startDate} ${row.endDate} ${row.status}`.toLowerCase().includes(query),
    );
  }, [search]);

  return (
    <MemberPageShell searchPlaceholder="Search subscriptions…" onSearch={setSearch}>
        <div className="pt-6 mb-6">
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Finances</p>
          <h2
            className="text-[#1E2A35] leading-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
          >
            Subscriptions
          </h2>
        </div>

        <div
          className="relative mb-8 overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lg md:max-w-md"
          style={{ background: 'linear-gradient(145deg, #1E2A35 0%, #2C3E4E 55%, #3D2E1A 100%)' }}
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#c49a3c]/20" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">BALANSÉ Member</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#E8D5A8]">Member number</p>
              <p className="mt-0.5 font-semibold tracking-[0.12em]">{memberNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Wifi size={16} className="rotate-90 text-[#E8D5A8]" />
              <CreditCard size={20} className="text-[#c49a3c]" />
            </div>
          </div>

          <div className="relative mt-8">
            <p
              className="leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.7rem', letterSpacing: '0.06em' }}
            >
              {memberName}
            </p>
            <p className="mt-1 text-sm text-white/70">{current.type}</p>
          </div>

          <div className="relative mt-6 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Valid thru</p>
              <p className="text-sm font-semibold">{current.endDate}</p>
            </div>
            <span className="rounded-full border border-[#c49a3c]/40 bg-[#c49a3c]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#E8D5A8]">
              {current.status}
            </span>
          </div>
        </div>

        <div className={`overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-sm ${CARD_HOVER_GROW}`}>
          <div className="border-b border-[#D4CDB5]/50 px-5 py-4">
            <h3
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }}
            >
              Subscription history
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[#D4CDB5]/50 text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                  <th className="px-5 py-3">Start date</th>
                  <th className="px-5 py-3">End date</th>
                  <th className="px-5 py-3">Subscription type</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-[#D4CDB5]/30 last:border-b-0">
                    <td className="px-5 py-3.5 text-[#1E2A35]">{row.startDate}</td>
                    <td className="px-5 py-3.5 text-[#1E2A35]">{row.endDate}</td>
                    <td className="px-5 py-3.5 font-medium text-[#1E2A35]">{row.type}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLE[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </MemberPageShell>
  );
}
