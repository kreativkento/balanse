import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, Clock, MapPin, User } from 'lucide-react';
import { MemberPageShell } from '../components/layout/MemberPageShell';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';

type ClassStatus = 'confirmed' | 'waitlisted' | 'pending' | 'completed' | 'cancelled';

interface MemberClass {
  id: number;
  className: string;
  date: string;
  time: string;
  duration: string;
  trainer: string;
  location: string;
  status: ClassStatus;
}

const UPCOMING: MemberClass[] = [
  { id: 1, className: 'Yoga', date: 'Tomorrow', time: '8:00 AM', duration: '75 min', trainer: 'Jodi', location: 'Studio 1', status: 'confirmed' },
  { id: 2, className: 'Calisthenics', date: 'Sat, Apr 11', time: '7:00 AM', duration: '60 min', trainer: 'Rex', location: 'Studio 2', status: 'confirmed' },
  { id: 3, className: 'Mat Pilates', date: 'Sun, Apr 12', time: '9:00 AM', duration: '60 min', trainer: 'Kate', location: 'Studio 1', status: 'waitlisted' },
  { id: 4, className: 'Kickboxing', date: 'Tue, Apr 14', time: '5:00 PM', duration: '60 min', trainer: 'Wolf', location: 'Studio 2', status: 'pending' },
];

const PAST: MemberClass[] = [
  { id: 101, className: 'Yoga', date: 'Mon, Apr 6', time: '8:00 AM', duration: '75 min', trainer: 'Jodi', location: 'Studio 1', status: 'completed' },
  { id: 102, className: 'Animal Flow', date: 'Fri, Apr 3', time: '9:00 AM', duration: '60 min', trainer: 'Ephraim', location: 'Studio 1', status: 'completed' },
  { id: 103, className: 'Mat Pilates', date: 'Wed, Apr 1', time: '9:00 AM', duration: '60 min', trainer: 'Kate', location: 'Studio 1', status: 'cancelled' },
];

const STATUS_STYLE: Record<ClassStatus, string> = {
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  waitlisted: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-[#EDE8D8] text-[#5A5048] border-[#D4CDB5]/70',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

function ClassRow({ item }: { item: MemberClass }) {
  return (
    <article className={`rounded-2xl border border-[#D4CDB5]/60 bg-white px-4 py-3.5 shadow-sm ${CARD_HOVER_GROW}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-[#1E2A35] leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.04em' }}
          >
            {item.className}
          </h3>
          <p className="mt-1 text-xs font-semibold text-[#8A7E6E]">{item.date}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8A7E6E]">
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {item.time} · {item.duration}</span>
            <span className="inline-flex items-center gap-1"><User size={11} /> {item.trainer}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={11} /> {item.location}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_STYLE[item.status]}`}>
          {item.status}
        </span>
      </div>
    </article>
  );
}

export default function MemberClasses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filterList = (items: MemberClass[]) => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      `${item.className} ${item.trainer} ${item.location} ${item.status}`.toLowerCase().includes(query),
    );
  };

  const upcoming = useMemo(() => filterList(UPCOMING), [search]);
  const past = useMemo(() => filterList(PAST), [search]);

  return (
    <MemberPageShell searchPlaceholder="Search my classes…" onSearch={setSearch}>
      <div className="pt-6 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Class Management</p>
          <h2
            className="text-[#1E2A35] leading-tight"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '0.04em' }}
          >
            My Classes
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/class-schedule')}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#c49a3c] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#a67f2e]"
        >
          <Bookmark size={12} /> Book a class
        </button>
      </div>

      <section className="mb-8">
        <p className="text-[#8A7E6E] text-[11px] font-semibold uppercase tracking-widest mb-3">Upcoming</p>
        <div className="flex flex-col gap-2.5">
          {upcoming.length === 0 ? (
            <p className="text-sm text-[#B0A898]">No upcoming classes match your search.</p>
          ) : (
            upcoming.map((item) => <ClassRow key={item.id} item={item} />)
          )}
        </div>
      </section>

      <section>
        <p className="text-[#8A7E6E] text-[11px] font-semibold uppercase tracking-widest mb-3">Past</p>
        <div className="flex flex-col gap-2.5">
          {past.length === 0 ? (
            <p className="text-sm text-[#B0A898]">No past classes match your search.</p>
          ) : (
            past.map((item) => <ClassRow key={item.id} item={item} />)
          )}
        </div>
      </section>
    </MemberPageShell>
  );
}
