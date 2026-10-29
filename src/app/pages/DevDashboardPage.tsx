import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, MessageSquare, ScrollText } from 'lucide-react';
import { useDevAuth } from '../context/DevAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { getPhilippinesGreeting } from '../../lib/philippines-time';
import { fetchDevFeedbackInbox, type FeedbackDisplay } from '../../lib/feedback-service';
import { ContentSkeleton } from '../components/layout/PageLoadingScreen';

export default function DevDashboardPage() {
  const { devUser } = useDevAuth();
  const [tickets, setTickets] = useState<FeedbackDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchDevFeedbackInbox();
      if (cancelled) return;
      setTickets(result.data);
      setError(result.error);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const unresolved = tickets.filter((t) => t.status === 'unresolved').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const urgent = tickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
    return { total: tickets.length, unresolved, inProgress, urgent };
  }, [tickets]);

  if (!devUser) return null;

  const greeting = getPhilippinesGreeting();

  return (
    <div className="mx-auto max-w-8xl px-6 py-8">
      <div className="mb-6">
        <p className="mb-1 text-sm text-[#9A8E7E]">
          {greeting}, {devUser.name.split(' ')[0]}
        </p>
        <h1
          className="text-[#1E2A35]"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(1.15rem, 2.4vw, 1.5rem)',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          Development Dashboard
        </h1>
        <p className="mt-1.5 text-xs text-[#B0A898]">Internal tools · BALANSÉ Wellness Hub</p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Inbox', value: stats.total },
          { label: 'Unresolved', value: stats.unresolved },
          { label: 'In progress', value: stats.inProgress },
          { label: 'High / urgent', value: stats.urgent },
        ].map((row) => (
          <div
            key={row.label}
            className="rounded-2xl border border-[#D4CDB5]/55 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9A8E7E]">{row.label}</p>
            <p
              className="mt-1 leading-none text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
            >
              {loading ? '—' : row.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:max-w-md">
        <Link
          to="/development/feedback"
          className={`group rounded-2xl border border-[#E8E2D2]/80 bg-white px-6 py-5 shadow-sm hover:border-[#c49a3c]/40 hover:shadow-md ${CARD_HOVER_GROW}`}
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1E2A35]">
              <MessageSquare size={18} className="text-[#c49a3c]" />
            </div>
            <ArrowUpRight size={16} className="text-[#B0A898] transition-colors group-hover:text-[#c49a3c]" />
          </div>
          <h2
            className="mb-1 text-[#1E2A35]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.04em' }}
          >
            System Feedback
          </h2>
          <p className="text-sm leading-relaxed text-[#8A7E6E]">
            Level 4 inbox — update status and priority on tickets forwarded from admin.
          </p>
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#D4CDB5]/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <ScrollText size={14} className="text-[#c49a3c]" />
            <h2
              className="text-[#1E2A35]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.04em' }}
            >
              Recent tickets
            </h2>
          </div>
          <Link to="/development/feedback" className="text-xs font-bold text-[#c49a3c] hover:underline">
            Open inbox
          </Link>
        </div>
        {loading ? (
          <div className="px-5 py-4">
            <ContentSkeleton variant="list" />
          </div>
        ) : tickets.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#9A8E7E]">No tickets in the dev inbox.</p>
        ) : (
          <ul className="divide-y divide-[#EDE8D8]">
            {tickets.slice(0, 6).map((ticket) => (
              <li key={ticket.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1E2A35]">{ticket.title}</p>
                  <p className="truncate text-[11px] text-[#9A8E7E]">
                    {ticket.status.replace('_', ' ')} · {ticket.priority ?? 'no priority'}
                  </p>
                </div>
                <Link
                  to="/development/feedback"
                  className="shrink-0 text-[11px] font-semibold text-[#8A7E6E] hover:text-[#1E2A35]"
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
