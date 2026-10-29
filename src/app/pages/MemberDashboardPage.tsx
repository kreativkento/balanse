import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Bookmark,
  CalendarRange,
  Clock,
  Coins,
  CreditCard,
  User,
} from 'lucide-react';
import { ContentSkeleton } from '../components/layout/PageLoadingScreen';
import { useAuth } from '../context/AuthContext';
import { ProfileIncompleteState } from '../components/ProfileIncompleteState';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CardInfoButton } from '../components/balanse-flow/CardInfoButton';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import {
  computeProfileScore,
  PROFILE_COMPLETION_READY,
  profileScoreBarClasses,
} from '../../lib/profile-completion';
import {
  fetchMemberEnrolledClasses,
  type MemberClassListStatus,
  type MemberEnrolledClassItem,
} from '../../lib/class-service';
import { fetchClassPaymentsForMember } from '../../lib/class-payment-service';
import { fetchMemberCreditWalletBalance } from '../../lib/member-credits-service';
import {
  DashboardWeekdayChart,
  weekdayCountsFromIsoDates,
} from '../components/dashboard/DashboardWeekdayChart';

const PH_TZ = 'Asia/Manila';

const STATUS_LABEL: Record<MemberClassListStatus, string> = {
  confirmed: 'Enrolled',
  waitlisted: 'Waitlisted',
  pending: 'Waitlisted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_BADGE: Record<MemberClassListStatus, string> = {
  confirmed: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
  waitlisted: 'bg-amber-50 text-amber-900 border-amber-200/80',
  pending: 'bg-sky-50 text-sky-800 border-sky-200/80',
  completed: 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70',
  cancelled: 'bg-red-50 text-red-700 border-red-200/80',
};

function phDateKey(iso: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function isUpcomingSession(item: MemberEnrolledClassItem, now: Date): boolean {
  if (item.status === 'completed' || item.status === 'cancelled') return false;
  const startMs = new Date(item.startsAt).getTime();
  const endMs = item.endsAt ? new Date(item.endsAt).getTime() : startMs;
  const nowMs = now.getTime();
  if (Number.isFinite(endMs) && endMs < nowMs) return false;
  if (startMs >= nowMs) return true;
  return phDateKey(item.startsAt, now) === phDateKey(now.toISOString(), now);
}

function formatSessionWhen(startIso: string, now: Date): string {
  const startKey = phDateKey(startIso, now);
  const todayKey = phDateKey(now.toISOString(), now);
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const time = timeFmt.format(new Date(startIso));

  if (startKey === todayKey) return `Today · ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (startKey === phDateKey(tomorrow.toISOString(), now)) return `Tomorrow · ${time}`;

  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(startIso));
  return `${date} · ${time}`;
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'gold' | 'default';
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm ${
        accent === 'gold' ? 'border-[#c49a3c]/35 bg-[#c49a3c]/08' : 'border-[#D4CDB5]/55 bg-white'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">
        {label}
        <CardInfoButton title={label} />
      </p>
      <p
        className="mt-0.5 text-[#1E2A35] leading-none tabular-nums truncate"
        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[10px] font-medium text-[#B0A898]">{hint}</p> : null}
    </div>
  );
}

function QuickLink({
  label,
  description,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border border-[#D4CDB5]/55 bg-white px-4 py-3.5 text-left shadow-sm transition-colors hover:border-[#c49a3c]/40 hover:bg-[#FBF9F3] ${CARD_HOVER_GROW}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDE8D8] text-[#a67f2e]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[#1E2A35]">
          {label}
          <CardInfoButton title={label} />
        </span>
        <span className="block text-xs text-[#8A7E6E] mt-0.5">{description}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-[#C4B8A0]" aria-hidden />
    </button>
  );
}

function DashboardQuickLinks({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <aside className="w-full shrink-0 lg:ml-auto lg:w-[20rem]">
      <p className="mb-3 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">
        Quick links
      </p>
      <div className="flex flex-col gap-2">
        <QuickLink
          label="My Classes"
          description="All enrollments and history"
          icon={<Bookmark size={18} />}
          onClick={() => onNavigate('/my-classes')}
        />
        <QuickLink
          label="Class schedule"
          description="Find and book sessions"
          icon={<CalendarRange size={18} />}
          onClick={() => onNavigate('/class-schedule')}
        />
        <QuickLink
          label="Credits & pass"
          description="Wallet balance and packs"
          icon={<Coins size={18} />}
          onClick={() => onNavigate('/credits')}
        />
        <QuickLink
          label="Payment history"
          description="Receipts and payment status"
          icon={<CreditCard size={18} />}
          onClick={() => onNavigate('/payment-history')}
        />
        <QuickLink
          label="My profile"
          description="Personal info and documents"
          icon={<User size={18} />}
          onClick={() => onNavigate('/profile')}
        />
      </div>
    </aside>
  );
}

export default function MemberDashboardPage() {
  const navigate = useNavigate();
  const { user, profileComplete } = useAuth();
  const [classes, setClasses] = useState<MemberEnrolledClassItem[]>([]);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const profileScore = computeProfileScore(user?.profile);
  const profileBar = profileScoreBarClasses(profileScore);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    void (async () => {
      const [classesResult, paymentsResult, creditsResult] = await Promise.all([
        fetchMemberEnrolledClasses(),
        profileComplete
          ? fetchClassPaymentsForMember()
          : Promise.resolve({ data: [], error: null }),
        profileComplete
          ? fetchMemberCreditWalletBalance()
          : Promise.resolve({ balance: 0, error: null }),
      ]);

      if (cancelled) return;

      if (classesResult.error) {
        setLoadError(classesResult.error);
        setClasses([]);
      } else {
        setClasses(classesResult.data);
      }

      if (!paymentsResult.error) {
        setPendingPayments(
          paymentsResult.data.filter((row) => row.status === 'pending').length,
        );
      }

      if (!creditsResult.error) {
        setCreditBalance(creditsResult.balance);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, profileComplete, navigate]);

  const upcoming = useMemo(() => {
    return classes
      .filter((item) => isUpcomingSession(item, now))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [classes, now]);

  const nextClass = upcoming[0] ?? null;
  const confirmedCount = classes.filter((c) => c.status === 'confirmed').length;
  const needsAttention = classes.filter(
    (c) => c.status === 'pending' || c.status === 'waitlisted',
  ).length;

  if (!user) return null;

  return (
    <MemberPageShell searchPlaceholder="Search classes…">
      <div className="flex w-full min-w-0 flex-col gap-3 pt-3 pb-5 md:gap-6 md:pt-6 md:pb-10">
        {!profileComplete ? (
          <ProfileIncompleteState description="Finish your profile to book classes and view payments." />
        ) : null}

        {profileComplete && profileScore < PROFILE_COMPLETION_READY ? (
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="rounded-2xl border border-[#c49a3c]/30 bg-[#c49a3c]/10 px-4 py-3 text-left transition-colors hover:bg-[#c49a3c]/14"
          >
            <p className="text-xs font-bold text-[#8a6824]">Profile {profileScore}% complete</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
              <div
                className={`h-full rounded-full ${profileBar.bar}`}
                style={{ width: `${profileScore}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[#7a6348]">Add missing details in My Profile.</p>
          </button>
        ) : null}

        {loadError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        ) : null}

        {loading ? (
          <div role="status" aria-live="polite" aria-label="Loading your dashboard">
            <ContentSkeleton />
          </div>
        ) : (
          <div className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 w-full flex-1 flex-col gap-6">
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <StatTile
                  label="Next session"
                  value={nextClass ? formatSessionWhen(nextClass.startsAt, now).split(' · ')[0] : '—'}
                  hint={nextClass?.className}
                  accent={nextClass ? 'gold' : 'default'}
                />
                <StatTile label="Upcoming" value={upcoming.length} hint="Scheduled ahead" />
                <StatTile label="Enrolled" value={confirmedCount} hint="Active registrations" />
                <StatTile
                  label="Credits"
                  value={creditBalance}
                  hint="Wallet balance"
                  accent={creditBalance > 0 ? 'gold' : 'default'}
                />
                <StatTile
                  label="Pending"
                  value={needsAttention + pendingPayments}
                  hint="Waitlist or payments"
                  accent={needsAttention + pendingPayments > 0 ? 'gold' : 'default'}
                />
              </div>

              <DashboardWeekdayChart
                data={weekdayCountsFromIsoDates(upcoming.map((item) => item.startsAt))}
                title="Your week"
                hint="Upcoming sessions by weekday"
              />

              <section className="w-full min-w-0 rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[#D4CDB5]/50 px-4 py-3">
                <h2
                  className="text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em' }}
                >
                  Coming up
                </h2>
                {profileComplete ? (
                  <button
                    type="button"
                    onClick={() => navigate('/my-classes')}
                    className="text-xs font-bold text-[#c49a3c] hover:underline"
                  >
                    View all
                  </button>
                ) : null}
              </div>

              {!profileComplete ? (
                <div className="px-4 py-6">
                  <ProfileIncompleteState compact description="Complete your profile to see upcoming classes." />
                </div>
              ) : upcoming.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-[#8A7E6E]">No upcoming classes on your account.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/class-schedule')}
                    className="action-button mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#1E2A35] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#263545]"
                  >
                    Browse class schedule
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[#D4CDB5]/40">
                  {upcoming.slice(0, 4).map((item) => (
                    <li key={item.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A8E7E] truncate">
                            {item.disciplineName}
                          </p>
                          <p className="truncate text-sm font-bold text-[#1E2A35]">{item.className}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#8A7E6E]">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={11} aria-hidden />
                              {formatSessionWhen(item.startsAt, now)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <User size={11} aria-hidden />
                              {item.coachLabel}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[item.status]}`}
                        >
                          {STATUS_LABEL[item.status]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              </section>
            </div>

            <DashboardQuickLinks onNavigate={navigate} />
          </div>
        )}
      </div>
    </MemberPageShell>
  );
}
