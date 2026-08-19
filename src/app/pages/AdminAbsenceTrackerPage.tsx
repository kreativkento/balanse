import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  UserX, Check, X, ChevronDown, ClipboardList,
  Calendar, Search, AlertCircle, CheckCircle,
  Star, Clock,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

// ── Types ──────────────────────────────────────────────────────

type AbsenceStatus = 'present' | 'absent' | 'evaluation';

interface ScheduledClass {
  id: number;
  coach: string;
  coachInitials: string;
  coachColor: string;
  class: string;
  date: string;
  dayLabel: string;
  time: string;
  students: number;
  capacity: number;
  status: AbsenceStatus;
  note: string;
  evaluationScore?: number;
}

// ── Mock Data ──────────────────────────────────────────────────

const INITIAL_CLASSES: ScheduledClass[] = [
  { id: 1,  coach: 'Jodi',    coachInitials: 'JO', coachColor: '#E8A87C', class: 'Yoga',         date: 'Mon, Apr 14', dayLabel: 'Today',     time: '8:00 AM',  students: 10, capacity: 12, status: 'present',    note: '' },
  { id: 2,  coach: 'Rex',     coachInitials: 'RX', coachColor: '#5A8A7A', class: 'Calisthenics', date: 'Mon, Apr 14', dayLabel: 'Today',     time: '7:00 AM',  students: 8,  capacity: 10, status: 'present',    note: '' },
  { id: 3,  coach: 'Ephraim', coachInitials: 'EP', coachColor: '#7A7EBC', class: 'Animal Flow',  date: 'Mon, Apr 14', dayLabel: 'Today',     time: '9:00 AM',  students: 6,  capacity: 10, status: 'absent',     note: 'Called in sick morning of class' },
  { id: 4,  coach: 'Kate',    coachInitials: 'KT', coachColor: '#C49A3C', class: 'Mat Pilates',  date: 'Mon, Apr 14', dayLabel: 'Today',     time: '9:30 AM',  students: 12, capacity: 12, status: 'present',    note: '' },
  { id: 5,  coach: 'Wolf',    coachInitials: 'WF', coachColor: '#3A4A5A', class: 'Kickboxing',   date: 'Mon, Apr 14', dayLabel: 'Today',     time: '5:00 PM',  students: 9,  capacity: 12, status: 'present',    note: '' },
  { id: 6,  coach: 'Alec',    coachInitials: 'AL', coachColor: '#A8806A', class: 'Groundworks',  date: 'Mon, Apr 14', dayLabel: 'Today',     time: '11:00 AM', students: 7,  capacity: 10, status: 'evaluation', note: '', evaluationScore: 4 },
  { id: 7,  coach: 'Jodi',    coachInitials: 'JO', coachColor: '#E8A87C', class: 'Yoga',         date: 'Tue, Apr 15', dayLabel: 'Tomorrow',  time: '8:00 AM',  students: 11, capacity: 12, status: 'present',    note: '' },
  { id: 8,  coach: 'Rex',     coachInitials: 'RX', coachColor: '#5A8A7A', class: 'Calisthenics', date: 'Tue, Apr 15', dayLabel: 'Tomorrow',  time: '7:00 AM',  students: 8,  capacity: 10, status: 'present',    note: '' },
  { id: 9,  coach: 'Kate',    coachInitials: 'KT', coachColor: '#C49A3C', class: 'Mat Pilates',  date: 'Wed, Apr 16', dayLabel: 'Apr 16',    time: '9:30 AM',  students: 10, capacity: 12, status: 'present',    note: '' },
  { id: 10, coach: 'Ephraim', coachInitials: 'EP', coachColor: '#7A7EBC', class: 'Animal Flow',  date: 'Wed, Apr 16', dayLabel: 'Apr 16',    time: '9:00 AM',  students: 7,  capacity: 10, status: 'present',    note: '' },
  { id: 11, coach: 'Wolf',    coachInitials: 'WF', coachColor: '#3A4A5A', class: 'Kickboxing',   date: 'Thu, Apr 17', dayLabel: 'Apr 17',    time: '5:00 PM',  students: 9,  capacity: 12, status: 'present',    note: '' },
  { id: 12, coach: 'Rachelle',coachInitials: 'RC', coachColor: '#B07A9E', class: 'Stretching',   date: 'Thu, Apr 17', dayLabel: 'Apr 17',    time: '6:00 PM',  students: 8,  capacity: 12, status: 'present',    note: '' },
  { id: 13, coach: 'Jodi',    coachInitials: 'JO', coachColor: '#E8A87C', class: 'Yoga',         date: 'Mon, Apr 7',  dayLabel: 'Apr 7',     time: '8:00 AM',  students: 12, capacity: 12, status: 'absent',     note: 'Emergency leave – classes covered by Rachelle' },
  { id: 14, coach: 'Rex',     coachInitials: 'RX', coachColor: '#5A8A7A', class: 'Calisthenics', date: 'Fri, Apr 11', dayLabel: 'Apr 11',    time: '7:00 AM',  students: 9,  capacity: 10, status: 'evaluation', note: '', evaluationScore: 5 },
];

// ── Absence Note Modal ─────────────────────────────────────────

function AbsenceModal({ item, onClose, onSave }: {
  item: ScheduledClass; onClose: () => void;
  onSave: (id: number, status: AbsenceStatus, note: string, score?: number) => void;
}) {
  const [status, setStatus] = useState<AbsenceStatus>(item.status === 'present' ? 'absent' : item.status);
  const [note, setNote]   = useState(item.note);
  const [score, setScore] = useState(item.evaluationScore ?? 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Record</p>
            <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
              {item.coach} · {item.class}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
        </div>
        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Class info */}
          <div className="bg-[#F8F3E8] rounded-2xl p-4 border border-[#D4CDB5]/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.coachColor + '20' }}>
              <span className="text-xs font-bold" style={{ color: item.coachColor }}>{item.coachInitials}</span>
            </div>
            <div>
              <p className="text-[#1E2A35] text-sm font-semibold">{item.class}</p>
              <p className="text-[#9A8E7E] text-xs">{item.date} · {item.time} · {item.students}/{item.capacity} students</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Mark As</p>
            <div className="flex flex-col gap-2">
              {([
                { val: 'absent' as const,     label: 'Absent',         desc: 'Coach did not show up for this class', Icon: UserX,       iconColor: 'text-red-500',    activeBg: 'border-red-300 bg-red-50' },
                { val: 'evaluation' as const, label: 'Class Evaluation', desc: 'Evaluate coach performance for this session', Icon: Star, iconColor: 'text-[#C49A3C]', activeBg: 'border-[#C49A3C]/50 bg-[#C49A3C]/06' },
              ]).map(({ val, label, desc, Icon, iconColor, activeBg }) => (
                <div key={val} onClick={() => setStatus(val)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-all ${status === val ? activeBg : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#C49A3C]/30'}`}>
                  <Icon size={16} className={status === val ? iconColor : 'text-[#8A7E6E]'} />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${status === val ? 'text-[#1E2A35]' : 'text-[#5A5048]'}`}>{label}</p>
                    <p className="text-[#9A8E7E] text-xs">{desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${status === val ? 'border-[#C49A3C]' : 'border-[#D4CDB5]'}`}>
                    {status === val && <div className="w-2 h-2 rounded-full bg-[#C49A3C]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluation score */}
          {status === 'evaluation' && (
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Performance Score (1–5)</p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setScore(n)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${score >= n ? 'bg-[#C49A3C] text-white border-[#C49A3C] shadow-sm' : 'bg-[#F8F3E8] text-[#B0A898] border-[#D4CDB5]/60 hover:border-[#C49A3C]/40'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[#9A8E7E] text-xs">Needs Improvement</span>
                <span className="text-[#9A8E7E] text-xs">Excellent</span>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">
              {status === 'absent' ? 'Reason / Notes' : 'Evaluation Notes'}
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder={status === 'absent' ? 'e.g. Called in sick, family emergency…' : 'e.g. Good energy, class started on time…'}
              className="w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all resize-none placeholder-[#C0B8A8]"
            />
          </div>
        </div>
        <div className="px-7 pb-7 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">Cancel</button>
          <button
            onClick={() => { onSave(item.id, status, note, status === 'evaluation' ? score : undefined); onClose(); }}
            className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm flex items-center justify-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}>
            <Check size={14} /> Save Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Coach Summary ──────────────────────────────────────────────

function CoachAbsenceSummary({ classes }: { classes: ScheduledClass[] }) {
  const coaches = [...new Set(classes.map(c => c.coach))];
  return (
    <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden mb-7">
      <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center gap-2">
        <ClipboardList size={15} className="text-[#C49A3C]" />
        <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Coach Attendance Summary</h2>
      </div>
      <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {coaches.map(coach => {
          const coachClasses = classes.filter(c => c.coach === coach);
          const absentCount = coachClasses.filter(c => c.status === 'absent').length;
          const evalCount = coachClasses.filter(c => c.status === 'evaluation').length;
          const avgScore = coachClasses.filter(c => c.evaluationScore).reduce((acc, c) => acc + (c.evaluationScore ?? 0), 0) / (evalCount || 1);
          const info = coachClasses[0];
          return (
            <div key={coach} className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-3 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2" style={{ backgroundColor: info.coachColor + '25' }}>
                <span className="text-xs font-bold" style={{ color: info.coachColor }}>{info.coachInitials}</span>
              </div>
              <p className="text-[#1E2A35] text-xs font-semibold truncate">{coach}</p>
              <p className="text-[#9A8E7E] text-[10px] mt-0.5">{coachClasses.length} classes</p>
              <div className="mt-2 flex flex-col gap-1">
                {absentCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded-full">{absentCount} absent</span>
                )}
                {evalCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-[#C49A3C]/10 text-[#A67E2A] border border-[#C49A3C]/30 rounded-full">
                    {evalCount} eval · {avgScore.toFixed(1)}★
                  </span>
                )}
                {absentCount === 0 && evalCount === 0 && (
                  <span className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">All present</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Panel (embeddable in Coaches Management tabs) ─────────

export function AdminAbsenceTrackerPanel() {
  const [classes, setClasses]             = useState<ScheduledClass[]>(INITIAL_CLASSES);
  const [search, setSearch]               = useState('');
  const [filterCoach, setFilterCoach]     = useState('All');
  const [filterStatus, setFilterStatus]   = useState<'all' | AbsenceStatus>('all');
  const [activeModal, setActiveModal]     = useState<ScheduledClass | null>(null);
  const [showCoachFilter, setShowCoachFilter] = useState(false);

  const coaches = ['All', ...Array.from(new Set(classes.map(c => c.coach)))];

  const filtered = classes.filter(c => {
    const matchSearch = c.coach.toLowerCase().includes(search.toLowerCase()) ||
      c.class.toLowerCase().includes(search.toLowerCase()) ||
      c.date.toLowerCase().includes(search.toLowerCase());
    const matchCoach  = filterCoach === 'All' || c.coach === filterCoach;
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchCoach && matchStatus;
  });

  const handleSave = (id: number, status: AbsenceStatus, note: string, score?: number) => {
    setClasses(prev => prev.map(c =>
      c.id === id ? { ...c, status, note, evaluationScore: score } : c
    ));
  };

  const absentCount = classes.filter(c => c.status === 'absent').length;
  const evalCount   = classes.filter(c => c.status === 'evaluation').length;
  const presentCount = classes.filter(c => c.status === 'present').length;

  const INP = 'w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]';

  return (
    <>
      {activeModal && (
        <AbsenceModal
          item={activeModal}
          onClose={() => setActiveModal(null)}
          onSave={handleSave}
        />
      )}

      <p className="text-[#8A7E6E] text-sm mb-5">Mark coaches absent or log class evaluations for scheduled sessions.</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Present',    value: presentCount, icon: <CheckCircle size={17} className="text-green-600" />,    bg: 'bg-green-50',    border: 'border-green-200' },
          { label: 'Absent',     value: absentCount,  icon: <UserX size={17} className="text-red-500" />,            bg: 'bg-red-50',      border: 'border-red-200'   },
          { label: 'Evaluations',value: evalCount,    icon: <Star size={17} className="text-[#C49A3C]" />,           bg: 'bg-[#C49A3C]/10', border: 'border-[#C49A3C]/30' },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-2xl border shadow-sm px-4 py-4 flex items-center gap-3 ${s.border}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{s.label}</p>
              <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <CoachAbsenceSummary classes={classes} />

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A898]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search coach, class, date…" className={INP} />
        </div>
        <div className="relative">
          <button onClick={() => setShowCoachFilter(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#5A5048] text-sm font-medium hover:bg-[#EDE8D8] transition-all shadow-sm">
            {filterCoach} <ChevronDown size={14} className={`transition-transform ${showCoachFilter ? 'rotate-180' : ''}`} />
          </button>
          {showCoachFilter && (
            <div className="absolute top-full mt-1 left-0 bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-lg z-20 min-w-32 overflow-hidden">
              {coaches.map(c => (
                <button key={c} onClick={() => { setFilterCoach(c); setShowCoachFilter(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${filterCoach === c ? 'bg-[#1E2A35] text-white' : 'text-[#5A5048] hover:bg-[#F8F3E8]'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
          {([['all', 'All'], ['present', 'Present'], ['absent', 'Absent'], ['evaluation', 'Evaluations']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterStatus === val ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_160px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
          {['Coach', 'Class / Date', 'Time', 'Students', 'Status', 'Notes', 'Actions'].map(h => (
            <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Calendar size={24} className="mx-auto text-[#D4CDB5] mb-3" />
            <p className="text-[#B0A898] text-sm">No classes found.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#D4CDB5]/30">
            {filtered.map(c => (
              <div key={c.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_160px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/40 transition-colors min-h-[64px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: c.coachColor + '25' }}>
                    <span className="text-xs font-bold" style={{ color: c.coachColor }}>{c.coachInitials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[#1E2A35] text-sm font-semibold truncate">{c.coach}</p>
                    <p className="text-[#B0A898] text-xs">{c.dayLabel}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[#1E2A35] text-sm font-medium truncate">{c.class}</p>
                  <p className="text-[#9A8E7E] text-xs">{c.date}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#B0A898]" />
                  <span className="text-[#5A5048] text-sm">{c.time}</span>
                </div>
                <p className="text-[#5A5048] text-sm">{c.students}<span className="text-[#B0A898]">/{c.capacity}</span></p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit border flex items-center gap-1 ${
                  c.status === 'present'    ? 'bg-green-50 text-green-700 border-green-200' :
                  c.status === 'absent'     ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-[#C49A3C]/10 text-[#A67E2A] border-[#C49A3C]/30'
                }`}>
                  {c.status === 'present'    ? <><CheckCircle size={10} /> Present</> :
                   c.status === 'absent'     ? <><UserX size={10} /> Absent</> :
                   <><Star size={10} /> Eval {c.evaluationScore && `· ${c.evaluationScore}★`}</>}
                </span>
                <p className="text-[#9A8E7E] text-xs truncate">{c.note || '—'}</p>
                <div className="flex items-center gap-1 w-[160px]">
                  <button
                    onClick={() => setActiveModal(c)}
                    className={`h-7 px-2.5 border text-xs font-medium rounded-lg active:scale-95 transition-all whitespace-nowrap ${
                      c.status === 'present'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 flex items-center gap-1'
                        : 'bg-[#F8F3E8] text-[#5A5048] border-[#D4CDB5]/60 hover:bg-[#EDE8D8]'
                    }`}
                  >
                    {c.status === 'present' ? <><AlertCircle size={11} /> Mark</> : 'Edit'}
                  </button>
                  {c.status !== 'present' && (
                    <button
                      onClick={() => handleSave(c.id, 'present', '')}
                      className="h-7 px-2.5 bg-green-50 text-green-700 border border-green-200 text-xs font-medium rounded-lg hover:bg-green-100 active:scale-95 transition-all whitespace-nowrap"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[#B0A898] text-xs mt-4 text-right">
        {filtered.length} session{filtered.length !== 1 ? 's' : ''} shown
      </p>
    </>
  );
}

export default function AdminAbsenceTrackerPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
    else navigate('/admin-coaches?tab=absence', { replace: true });
  }, [adminUser, navigate]);

  return null;
}
