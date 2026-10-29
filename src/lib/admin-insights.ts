import type { AdminDashboardSnapshot } from './admin-dashboard-service';

export type AdminInsightAction = {
  label: string;
  to: string;
  detail: string;
};

export type AdminInsightReply = {
  ok: true;
  headline: string;
  points: string[];
  actions: AdminInsightAction[];
};

const WEEKDAY_NAMES: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

function peso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-PH')}`;
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function revenuePoint(snapshot: AdminDashboardSnapshot): string {
  const monthTotal = snapshot.approvedThisMonthRevenue;
  const months = snapshot.revenueByMonth;
  const current = months[months.length - 1];
  const previous = months.length >= 2 ? months[months.length - 2] : undefined;
  const classRevenue = snapshot.classRevenueThisMonth;
  const packRevenue = snapshot.packRevenueThisMonth;
  const mixTotal = classRevenue + packRevenue;
  const classShare = mixTotal > 0 ? Math.round((classRevenue / mixTotal) * 100) : 0;

  let line =
    snapshot.approvedThisMonthCount > 0
      ? `${peso(monthTotal)} approved this month across ${countLabel(snapshot.approvedThisMonthCount, 'payment')}.`
      : `${peso(monthTotal)} approved this month.`;

  if (current && previous) {
    const currentBar = Math.round(current.classes + current.packs);
    const previousBar = Math.round(previous.classes + previous.packs);
    const delta = currentBar - previousBar;
    if (previousBar === 0 && currentBar > 0) {
      line += ` ${previous.label} had none.`;
    } else if (delta === 0) {
      line += ` Same as ${previous.label}.`;
    } else if (previousBar > 0) {
      const pct = Math.round((Math.abs(delta) / previousBar) * 100);
      const pctText = pct === 0 ? 'under 1%' : `${pct}%`;
      line += ` ${peso(Math.abs(delta))} (${pctText}) ${delta > 0 ? 'above' : 'below'} ${previous.label}.`;
    }
  }

  if (monthTotal > 0 && classRevenue > 0 && packRevenue > 0) {
    line += ` Classes ${classShare}%, packs ${100 - classShare}%.`;
  }

  return line;
}

function reviewPoint(snapshot: AdminDashboardSnapshot): { line: string; actions: AdminInsightAction[] } {
  const actions: AdminInsightAction[] = [];
  const parts: string[] = [];

  if (snapshot.pendingPayments > 0) {
    parts.push(
      `${countLabel(snapshot.pendingPayments, 'class payment')} (${peso(snapshot.pendingPaymentAmount)})`,
    );
    actions.push({
      label: 'Class payments',
      to: '/admin-payments',
      detail: `${countLabel(snapshot.pendingPayments, 'payment')} · ${peso(snapshot.pendingPaymentAmount)}`,
    });
  }
  if (snapshot.portalRequestsPending > 0) {
    parts.push(countLabel(snapshot.portalRequestsPending, 'coach request'));
    actions.push({
      label: 'Coach slots',
      to: '/admin-coach-slots',
      detail: countLabel(snapshot.portalRequestsPending, 'request'),
    });
  }
  if (snapshot.bulletinPending > 0) {
    parts.push(countLabel(snapshot.bulletinPending, 'bulletin post'));
    actions.push({
      label: 'Bulletin',
      to: '/admin-bulletin',
      detail: countLabel(snapshot.bulletinPending, 'post'),
    });
  }

  if (parts.length === 0) {
    return { line: 'Nothing is waiting for review.', actions };
  }

  return { line: `Waiting on review: ${joinList(parts)}.`, actions };
}

function schedulePoint(snapshot: AdminDashboardSnapshot): string {
  if (snapshot.classesThisWeek === 0) {
    return "No live classes on this week's calendar.";
  }

  const days = snapshot.classesByWeekday;
  const maxCount = days.reduce((max, day) => Math.max(max, day.count), 0);
  const busiest = days.filter((day) => day.count === maxCount && maxCount > 0);
  const busiestName =
    busiest.length === 1
      ? WEEKDAY_NAMES[busiest[0].label] ?? busiest[0].label
      : busiest.length > 1 && busiest.length < days.length
        ? joinList(busiest.map((day) => WEEKDAY_NAMES[day.label] ?? day.label))
        : '';

  const today =
    snapshot.classesToday === snapshot.classesThisWeek
      ? 'all today'
      : snapshot.classesToday === 0
        ? 'none today'
        : `${snapshot.classesToday} today`;

  const week = `${countLabel(snapshot.classesThisWeek, 'class', 'classes')} this week (${today})`;
  if (!busiestName || busiest.length === days.length) return `${week}.`;
  return `${week}. Busiest: ${busiestName}.`;
}

function studioPoint(snapshot: AdminDashboardSnapshot): string {
  if (snapshot.clientCount === 0 && snapshot.coachCount === 0) {
    return 'No clients or coaches on record.';
  }
  return `${countLabel(snapshot.clientCount, 'client')}, ${countLabel(snapshot.coachCount, 'coach', 'coaches')}.`;
}

function headline(snapshot: AdminDashboardSnapshot, reviewWaiting: boolean): string {
  const revenue =
    snapshot.approvedThisMonthRevenue > 0
      ? `${peso(snapshot.approvedThisMonthRevenue)} approved this month`
      : 'No approved revenue this month';

  if (reviewWaiting) {
    const reviewTotal =
      snapshot.pendingPayments +
      snapshot.pendingPackPayments +
      snapshot.portalRequestsPending +
      snapshot.bulletinPending;
    return `${revenue}, and ${countLabel(reviewTotal, 'item')} still need review.`;
  }
  if (snapshot.classesThisWeek > 0) {
    return `${revenue}. ${countLabel(snapshot.classesThisWeek, 'class', 'classes')} on the calendar this week.`;
  }
  return `${revenue}.`;
}

/** Short overview built only from the admin dashboard snapshot. */
export function buildAdminInsightReply(snapshot: AdminDashboardSnapshot): AdminInsightReply {
  const review = reviewPoint(snapshot);
  const points = [revenuePoint(snapshot), review.line, schedulePoint(snapshot), studioPoint(snapshot)];
  return {
    ok: true,
    headline: headline(snapshot, review.actions.length > 0 || review.line !== 'Nothing is waiting for review.'),
    points,
    actions: review.actions,
  };
}
