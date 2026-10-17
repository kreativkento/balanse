import { supabase } from './supabase';
import { fetchClassPaymentsForAdmin } from './class-payment-service';
import { fetchPendingPortalRequestCount } from './portal-request-service';
import { fetchClassesForAdmin } from './class-service';

const PH_TZ = 'Asia/Manila';

function phYearMonth(date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
  return { year, month };
}

function isSamePhMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  const ym = phYearMonth(d);
  return ym.year === year && ym.month === month;
}

/** Monday 00:00 PH for the week containing `date`. */
function startOfPhWeek(date: Date): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: PH_TZ, weekday: 'short' })
    .format(utcGuess);
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
  utcGuess.setUTCDate(utcGuess.getUTCDate() + mondayOffset);
  return utcGuess;
}

function isInPhWeek(iso: string, weekStart: Date): boolean {
  const t = new Date(iso).getTime();
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 7);
  return t >= weekStart.getTime() && t < end.getTime();
}

export type AdminDashboardSnapshot = {
  clientCount: number;
  pendingPayments: number;
  pendingPaymentAmount: number;
  approvedThisMonthCount: number;
  approvedThisMonthRevenue: number;
  classesThisWeek: number;
  portalRequestsPending: number;
  bulletinPending: number;
  error: string | null;
};

export async function fetchAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const empty: AdminDashboardSnapshot = {
    clientCount: 0,
    pendingPayments: 0,
    pendingPaymentAmount: 0,
    approvedThisMonthCount: 0,
    approvedThisMonthRevenue: 0,
    classesThisWeek: 0,
    portalRequestsPending: 0,
    bulletinPending: 0,
    error: null,
  };

  const { year, month } = phYearMonth();
  const weekStart = startOfPhWeek(new Date());

  const [
    clientRes,
    bulletinRes,
    portalPending,
    paymentsRes,
    classesRes,
  ] = await Promise.all([
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase
      .from('bulletin_posts')
      .select('*', { count: 'exact', head: true })
      .eq('admin_approved', false),
    fetchPendingPortalRequestCount(),
    fetchClassPaymentsForAdmin(),
    fetchClassesForAdmin(),
  ]);

  if (clientRes.error) {
    return { ...empty, error: clientRes.error.message };
  }
  if (bulletinRes.error) {
    return { ...empty, error: bulletinRes.error.message };
  }
  if (paymentsRes.error) {
    return { ...empty, error: paymentsRes.error };
  }
  if (classesRes.error) {
    return { ...empty, error: classesRes.error };
  }

  const payments = paymentsRes.data;
  let pendingPayments = 0;
  let pendingPaymentAmount = 0;
  let approvedThisMonthCount = 0;
  let approvedThisMonthRevenue = 0;

  for (const p of payments) {
    if (p.status === 'pending') {
      pendingPayments += 1;
      pendingPaymentAmount += p.amountPaid;
    }
    if (p.status === 'approved' && isSamePhMonth(p.createdAt, year, month)) {
      approvedThisMonthCount += 1;
      approvedThisMonthRevenue += p.amountPaid;
    }
  }

  const classesThisWeek = classesRes.data.filter(
    (c) => c.startsAt && isInPhWeek(c.startsAt, weekStart),
  ).length;

  return {
    clientCount: clientRes.count ?? 0,
    pendingPayments,
    pendingPaymentAmount,
    approvedThisMonthCount,
    approvedThisMonthRevenue,
    classesThisWeek,
    portalRequestsPending: portalPending,
    bulletinPending: bulletinRes.count ?? 0,
    error: null,
  };
}
