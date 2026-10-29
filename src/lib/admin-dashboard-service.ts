import { supabase } from './supabase';
import { fetchClassPaymentsForAdmin } from './class-payment-service';
import { fetchPendingPortalRequestCount } from './portal-request-service';
import { fetchClassesForAdmin } from './class-service';
import { fetchSubscriptionPackagePaymentsForAdmin } from './subscription-package-payment-service';

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

function monthKeyFromParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthKeyFromIso(iso: string): string {
  const ym = phYearMonth(new Date(iso));
  return monthKeyFromParts(ym.year, ym.month);
}

function lastNMonthKeys(n: number): string[] {
  const { year, month } = phYearMonth();
  const keys: string[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < n; i += 1) {
    keys.unshift(monthKeyFromParts(y, m));
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return keys;
}

function monthShortLabel(key: string): string {
  const [, month] = key.split('-').map(Number);
  return new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-US', { month: 'short' });
}

function phYmd(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
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

export type AdminDashboardMonthPoint = {
  key: string;
  label: string;
  classes: number;
  packs: number;
};

export type AdminDashboardSnapshot = {
  clientCount: number;
  coachCount: number;
  pendingPayments: number;
  pendingPaymentAmount: number;
  pendingPackPayments: number;
  pendingPackAmount: number;
  approvedThisMonthCount: number;
  approvedThisMonthRevenue: number;
  classRevenueThisMonth: number;
  packRevenueThisMonth: number;
  classesThisWeek: number;
  classesToday: number;
  portalRequestsPending: number;
  bulletinPending: number;
  revenueByMonth: AdminDashboardMonthPoint[];
  classesByWeekday: { label: string; count: number }[];
  error: string | null;
};

export async function fetchAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const empty: AdminDashboardSnapshot = {
    clientCount: 0,
    coachCount: 0,
    pendingPayments: 0,
    pendingPaymentAmount: 0,
    pendingPackPayments: 0,
    pendingPackAmount: 0,
    approvedThisMonthCount: 0,
    approvedThisMonthRevenue: 0,
    classRevenueThisMonth: 0,
    packRevenueThisMonth: 0,
    classesThisWeek: 0,
    classesToday: 0,
    portalRequestsPending: 0,
    bulletinPending: 0,
    revenueByMonth: lastNMonthKeys(6).map((key) => ({
      key,
      label: monthShortLabel(key),
      classes: 0,
      packs: 0,
    })),
    classesByWeekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => ({
      label,
      count: 0,
    })),
    error: null,
  };

  const { year, month } = phYearMonth();
  const thisMonthKey = monthKeyFromParts(year, month);
  const weekStart = startOfPhWeek(new Date());
  const todayYmd = phYmd();
  const monthKeys = lastNMonthKeys(6);
  const classByMonth = new Map(monthKeys.map((key) => [key, 0]));
  const packByMonth = new Map(monthKeys.map((key) => [key, 0]));

  const [
    clientRes,
    coachRes,
    bulletinRes,
    portalPending,
    paymentsRes,
    packPaymentsRes,
    classesRes,
  ] = await Promise.all([
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('role', 'coach'),
    supabase
      .from('bulletin_posts')
      .select('*', { count: 'exact', head: true })
      .eq('admin_approved', false),
    fetchPendingPortalRequestCount(),
    fetchClassPaymentsForAdmin(),
    fetchSubscriptionPackagePaymentsForAdmin(),
    fetchClassesForAdmin(),
  ]);

  if (clientRes.error) {
    return { ...empty, error: clientRes.error.message };
  }
  if (coachRes.error) {
    return { ...empty, error: coachRes.error.message };
  }
  if (bulletinRes.error) {
    return { ...empty, error: bulletinRes.error.message };
  }
  if (paymentsRes.error) {
    return { ...empty, error: paymentsRes.error };
  }
  if (packPaymentsRes.error) {
    return { ...empty, error: packPaymentsRes.error };
  }
  if (classesRes.error) {
    return { ...empty, error: classesRes.error };
  }

  let pendingPayments = 0;
  let pendingPaymentAmount = 0;
  let pendingPackPayments = 0;
  let pendingPackAmount = 0;
  let classRevenueThisMonth = 0;
  let packRevenueThisMonth = 0;
  let approvedThisMonthCount = 0;

  for (const p of paymentsRes.data) {
    if (p.status === 'pending') {
      pendingPayments += 1;
      pendingPaymentAmount += p.amountPaid;
    }
    if (p.status === 'approved') {
      const key = monthKeyFromIso(p.createdAt);
      if (classByMonth.has(key)) {
        classByMonth.set(key, (classByMonth.get(key) ?? 0) + p.amountPaid);
      }
      if (key === thisMonthKey) {
        classRevenueThisMonth += p.amountPaid;
        approvedThisMonthCount += 1;
      }
    }
  }

  for (const p of packPaymentsRes.data) {
    if (p.status === 'pending') {
      pendingPackPayments += 1;
      pendingPackAmount += p.amountPaid;
    }
    if (p.status === 'approved') {
      const key = monthKeyFromIso(p.createdAt);
      if (packByMonth.has(key)) {
        packByMonth.set(key, (packByMonth.get(key) ?? 0) + p.amountPaid);
      }
      if (key === thisMonthKey) {
        packRevenueThisMonth += p.amountPaid;
        approvedThisMonthCount += 1;
      }
    }
  }

  const liveClasses = classesRes.data.filter((c) => c.statusBlock !== 'cancelled');
  const weekClasses = liveClasses.filter((c) => c.startsAt && isInPhWeek(c.startsAt, weekStart));
  const classesThisWeek = weekClasses.length;
  const classesToday = liveClasses.filter(
    (c) => c.startsAt && phYmd(new Date(c.startsAt)) === todayYmd,
  ).length;
  const weekdayIndex = new Map(
    empty.classesByWeekday.map((row, i) => [row.label, i]),
  );
  const classesByWeekday = empty.classesByWeekday.map((row) => ({ ...row }));
  for (const row of weekClasses) {
    if (!row.startsAt) continue;
    const short = new Intl.DateTimeFormat('en-US', { timeZone: PH_TZ, weekday: 'short' }).format(
      new Date(row.startsAt),
    );
    const i = weekdayIndex.get(short);
    if (i == null) continue;
    classesByWeekday[i].count += 1;
  }

  return {
    clientCount: clientRes.count ?? 0,
    coachCount: coachRes.count ?? 0,
    pendingPayments,
    pendingPaymentAmount,
    pendingPackPayments,
    pendingPackAmount,
    approvedThisMonthCount,
    approvedThisMonthRevenue: classRevenueThisMonth + packRevenueThisMonth,
    classRevenueThisMonth,
    packRevenueThisMonth,
    classesThisWeek,
    classesToday,
    portalRequestsPending: portalPending,
    bulletinPending: bulletinRes.count ?? 0,
    classesByWeekday,
    revenueByMonth: monthKeys.map((key) => ({
      key,
      label: monthShortLabel(key),
      classes: Math.round(classByMonth.get(key) ?? 0),
      packs: Math.round(packByMonth.get(key) ?? 0),
    })),
    error: null,
  };
}
