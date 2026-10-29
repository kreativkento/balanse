import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ContentSkeleton } from '../layout/PageLoadingScreen';

export type WeekdayCount = { label: string; count: number };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const PH_TZ = 'Asia/Manila';

export function emptyWeekdayCounts(): WeekdayCount[] {
  return WEEKDAYS.map((label) => ({ label, count: 0 }));
}

export function weekdayCountsFromIsoDates(isoDates: Array<string | null | undefined>): WeekdayCount[] {
  const counts = emptyWeekdayCounts();
  const index = new Map(WEEKDAYS.map((label, i) => [label, i]));
  for (const iso of isoDates) {
    if (!iso) continue;
    const short = new Intl.DateTimeFormat('en-US', { timeZone: PH_TZ, weekday: 'short' }).format(
      new Date(iso),
    );
    const i = index.get(short as (typeof WEEKDAYS)[number]);
    if (i == null) continue;
    counts[i] = { ...counts[i], count: counts[i].count + 1 };
  }
  return counts;
}

export function DashboardWeekdayChart({
  data,
  loading,
  title,
  hint,
  barColor = '#c49a3c',
}: {
  data: WeekdayCount[];
  loading?: boolean;
  title: string;
  hint?: string;
  barColor?: string;
}) {
  return (
    <section className="rounded-3xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3
          className="leading-none text-[#1E2A35]"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.05em' }}
        >
          {title}
        </h3>
        {hint ? <p className="mt-1 text-[11px] text-[#9A8E7E]">{hint}</p> : null}
      </div>
      {loading ? (
        <ContentSkeleton variant="list" className="py-2" />
      ) : (
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="28%">
              <CartesianGrid stroke="#EDE8D8" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8A7E6E', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#8A7E6E', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: '#F8F3E8' }}
                formatter={(value) => [`${Number(value ?? 0)}`, 'Classes']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E8E2D2', fontSize: 12 }}
              />
              <Bar dataKey="count" name="Classes" fill={barColor} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
