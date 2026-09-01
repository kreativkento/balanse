import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  LogOut, CalendarDays, ChevronRight,
  ShieldCheck, LayoutGrid, Clock, Users,
  Images, KeyRound, SendHorizonal, CalendarCheck,
  User, Pencil,
} from 'lucide-react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { ProfileAvatar } from '../components/ProfileImages';

// ── Mock Data ──────────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  'Yoga': '#745b3c', 'Calisthenics': '#3A4A5A', 'Animal Flow': '#6B8E6B',
  'Groundworks': '#8B6F5A', 'Circuit Training': '#B86A4A', 'Mat Pilates': '#9A7A8A',
  'Kickboxing': '#7A3A4A', 'Capoeira': '#A07050', 'Personal Coaching': '#5e4a30',
};

const UPCOMING_CLASSES = [
  { id: 1, date: 'Mon, Apr 13', className: 'Yoga',            time: '8:00 AM',  trainer: 'Jodi',     enrolled: 11, capacity: 15, status: 'open' as const },
  { id: 2, date: 'Mon, Apr 13', className: 'Mat Pilates',      time: '10:00 AM', trainer: 'Kate',     enrolled: 8,  capacity: 12, status: 'open' as const },
  { id: 3, date: 'Mon, Apr 13', className: 'Calisthenics',     time: '6:00 PM',  trainer: 'Rex',      enrolled: 6,  capacity: 12, status: 'open' as const },
  { id: 4, date: 'Tue, Apr 14', className: 'Animal Flow',      time: '9:00 AM',  trainer: 'Ephraim',  enrolled: 10, capacity: 12, status: 'open' as const },
  { id: 5, date: 'Tue, Apr 14', className: 'Kickboxing',       time: '5:00 PM',  trainer: 'Wolf',     enrolled: 10, capacity: 10, status: 'full' as const },
  { id: 6, date: 'Wed, Apr 15', className: 'Circuit Training', time: '4:00 PM',  trainer: 'Rachelle', enrolled: 12, capacity: 15, status: 'open' as const },
  { id: 7, date: 'Thu, Apr 16', className: 'Yoga',             time: '8:00 AM',  trainer: 'Jodi',     enrolled: 7,  capacity: 15, status: 'open' as const },
  { id: 8, date: 'Thu, Apr 16', className: 'Groundworks',      time: '11:00 AM', trainer: 'Alec',     enrolled: 4,  capacity: 10, status: 'open' as const },
];

const ENROLLED_BY_CLASS: Record<number, { name: string; membership: string }[]> = {
  1: [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Lea Mendoza', membership: 'Single Pass' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }],
  2: [{ name: 'Maria Santos', membership: 'Silver' }, { name: 'Diego Tan', membership: 'Single Pass' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Alex Johnson', membership: 'Gold' }, { name: 'Jan Corpus', membership: 'Silver' }],
  3: [{ name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Alex Johnson', membership: 'Gold' }],
  4: [{ name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Alex Johnson', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Ryan Bautista', membership: 'Gold' }],
  5: [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Sofia Reyes', membership: 'Gold' }],
  6: [{ name: 'Lea Mendoza', membership: 'Single Pass' }, { name: 'Diego Tan', membership: 'Single Pass' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Alex Johnson', membership: 'Gold' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Jan Corpus', membership: 'Silver' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Pia Villanueva', membership: 'Gold' }],
  7: [{ name: 'Alex Johnson', membership: 'Gold' }, { name: 'Maria Santos', membership: 'Silver' }, { name: 'Sofia Reyes', membership: 'Gold' }, { name: 'Hannah Ong', membership: 'Gold' }, { name: 'Ryan Bautista', membership: 'Gold' }, { name: 'Marco Lim', membership: 'Silver' }, { name: 'Jan Corpus', membership: 'Silver' }],
  8: [{ name: 'Pia Villanueva', membership: 'Gold' }, { name: 'Camille Cruz', membership: 'Silver' }, { name: 'Cris Dela Cruz', membership: 'Single Pass' }, { name: 'Diego Tan', membership: 'Single Pass' }],
};

const MEMBERSHIP_COLOR: Record<string, string> = {
  'Gold': 'bg-[#745b3c]/12 text-[#5e4a30] border-[#745b3c]/30',
  'Silver': 'bg-[#8A7E6E]/10 text-[#5A5048] border-[#8A7E6E]/20',
  'Single Pass': 'bg-[#EDE8D8] text-[#7A6A52] border-[#D4CDB5]/60',
};

// ── Sub-components ─────────────────────────────────────────────

function StatCard({ label, value, sub, icon, gold, amber }: {
  label: string; value: string; sub: string; icon: React.ReactNode; gold?: boolean; amber?: boolean;
}) {
  return (
    <div className={`bg-white rounded-3xl border shadow-sm px-5 py-4 flex items-center gap-4 ${CARD_HOVER_GROW} ${gold ? 'border-[#745b3c]/40' : amber ? 'border-amber-200/60' : 'border-[#D4CDB5]/60'}`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${gold ? 'bg-[#745b3c]/12' : amber ? 'bg-amber-50' : 'bg-[#EDE8D8]'}`}>
        {icon}
      </div>
      <div>
        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">{label}</p>
        <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.04em' }}>{value}</p>
        <p className="text-[#B0A898] text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Enrolled Students Modal ────────────────────────────────────

function EnrolledModal({ cls, onClose }: {
  cls: typeof UPCOMING_CLASSES[0];
  onClose: () => void;
}) {
  const students = ENROLLED_BY_CLASS[cls.id] ?? [];
  const color = CLASS_COLORS[cls.className] || '#745b3c';
  const fillPct = Math.round((cls.enrolled / cls.capacity) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <div>
                <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}>
                  {cls.className}
                </h3>
                <p className="text-[#8A7E6E] text-xs">{cls.date} · {cls.time} · Coach {cls.trainer}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                cls.status === 'full' ? 'bg-red-50 text-red-600 border-red-200' :
                fillPct >= 80 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-green-50 text-green-700 border-green-200'
              }`}>
                {cls.status === 'full' ? 'Fully Booked' : fillPct >= 80 ? 'Almost Full' : 'Open'}
              </span>
              <span className="text-[#8A7E6E] text-xs">{cls.enrolled} / {cls.capacity} enrolled</span>
            </div>
            <div className="w-20 h-1.5 bg-[#EDE8D8] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${fillPct}%`, backgroundColor: color }} />
            </div>
          </div>
        </div>

        {/* Student list */}
        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-3">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Enrolled Students</p>
            {students.length === 0 ? (
              <p className="text-[#B0A898] text-sm text-center py-6">No students enrolled yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {students.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/40 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#1E2A35]/08 border border-[#1E2A35]/12 flex items-center justify-center">
                        <span className="text-[#1E2A35] text-[10px] font-bold">{s.name.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
                      </div>
                      <span className="text-[#1E2A35] text-sm font-medium">{s.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${MEMBERSHIP_COLOR[s.membership]}`}>{s.membership}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const { staffUser, staffProfile, staffLogout } = useStaffAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [viewingClass, setViewingClass]       = useState<typeof UPCOMING_CLASSES[0] | null>(null);

  const handleLogout = () => { staffLogout(); navigate('/staff-login'); };

  useEffect(() => {
    if (!staffUser) navigate('/staff-login');
  }, [staffUser, navigate]);
  if (!staffUser) return null;

  const firstName = staffUser.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      {viewingClass && <EnrolledModal cls={viewingClass} onClose={() => setViewingClass(null)} />}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-sm p-7 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <LogOut size={24} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', letterSpacing: '0.05em' }}>Log Out?</h3>
                <p className="text-[#8A7E6E] text-sm mt-1">You'll be signed out of the BALANSÉ coach portal.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] active:scale-95 transition-all">
                Cancel
              </button>
              <button onClick={handleLogout} className="flex-1 py-3.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={13} className="text-[#745b3c]" />
                <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${staffUser.role === 'Administrator' ? 'bg-[#3A4A5A]/10 text-[#3A4A5A]' : 'bg-[#745b3c]/12 text-[#5e4a30]'}`}>
                  {staffUser.role}
                </span>
              </div>
              <p className="text-[#8A7E6E] text-sm">{greeting},</p>
              <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', letterSpacing: '0.04em' }}>
                {firstName}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/staff-profile')}
                title="Edit Profile"
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#1E2A35]/20 hover:border-[#745b3c]/50 hover:shadow-md transition-all relative group shrink-0"
              >
                <ProfileAvatar
                  src={staffProfile?.photo}
                  initials={(staffProfile?.displayName || staffUser.name).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  alt="Profile"
                  className="h-full w-full bg-[#1E2A35]/10"
                  initialsClassName="text-[#1E2A35] font-bold text-sm"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Pencil size={12} className="text-white" />
                </div>
              </button>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D4CDB5]/60 rounded-xl text-sm text-[#8A7E6E] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
              >
                <LogOut size={15} /> Log Out
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-5">
          <StatCard
            label="Today's Classes"
            value="3"
            sub="Monday, April 13"
            icon={<CalendarDays size={18} className="text-[#745b3c]" />}
            gold
          />
          <StatCard
            label="This Week"
            value="8"
            sub="Approved class sessions"
            icon={<LayoutGrid size={18} className="text-[#5A5048]" />}
          />
          <StatCard
            label="Pending Requests"
            value="2"
            sub="Awaiting admin approval"
            icon={<Clock size={18} className="text-amber-600" />}
            amber
          />
        </div>

        {/* ── Main Grid ── */}
        {/* Flat 5-col grid — cards placed directly so each row auto-stretches to equal height */}
        <div className="grid grid-cols-1 md:grid-cols-5 md:items-stretch gap-6 pb-10">

          {/* ── Row 1 Left: Upcoming Classes ── */}
          <div className={`md:col-span-3 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm flex flex-col overflow-hidden ${CARD_HOVER_GROW}`}>
            <div className="px-5 py-4 border-b border-[#D4CDB5]/50 flex items-center justify-between shrink-0">
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }} className="text-[#1E2A35]">
                My Schedule
              </h2>
              <span className="text-[#8A7E6E] text-xs">Next 4 days · tap to see students</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#D4CDB5]/30
              [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-[#D4CDB5] [&::-webkit-scrollbar-thumb]:rounded-full">
              {UPCOMING_CLASSES.map((cls) => {
                const color = CLASS_COLORS[cls.className] || '#745b3c';
                const fillPct = Math.round((cls.enrolled / cls.capacity) * 100);
                const isFull = cls.status === 'full';
                const almostFull = fillPct >= 80 && !isFull;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setViewingClass(cls)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-[#F8F3E8]/70 transition-colors group text-left"
                  >
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <div className="w-24 shrink-0">
                      <p className="text-[#8A7E6E] text-xs">{cls.date}</p>
                      <p className="text-[#1E2A35] text-xs font-semibold">{cls.time}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#1E2A35] text-sm font-semibold">{cls.className}</p>
                      <p className="text-[#8A7E6E] text-xs">Coach {cls.trainer}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isFull ? 'bg-red-50 text-red-600 border border-red-200' :
                        almostFull ? 'bg-amber-50 text-amber-700' :
                        'bg-[#F0EBE0] text-[#7A6A52]'
                      }`}>
                        {cls.enrolled}/{cls.capacity}
                      </span>
                      <div className="flex items-center gap-1 text-[#B0A898] group-hover:text-[#745b3c] transition-colors">
                        <Users size={13} />
                        <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Row 1 Right: Quick Actions ── */}
          <div className={`md:col-span-2 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm flex flex-col overflow-hidden ${CARD_HOVER_GROW}`}>
            <div className="px-5 py-4 border-b border-[#D4CDB5]/50 shrink-0">
              <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }} className="text-[#1E2A35]">Quick Actions</h2>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <button
                onClick={() => navigate('/staff-schedule')}
                className="w-full flex items-center gap-3 bg-[#1E2A35] text-white rounded-2xl px-4 py-4 hover:bg-[#263545] active:scale-[0.98] transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <CalendarDays size={18} />
                </div>
                <div className="text-left flex-1">
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: '0.06em' }}>Staff Calendar</p>
                  <p className="text-white/50 text-xs">View schedule & request blocks</p>
                </div>
                <ChevronRight size={16} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => navigate('/staff-availability')}
                className="w-full flex items-center gap-3 bg-[#F8F3E8] border border-[#D4CDB5]/60 text-[#1E2A35] rounded-2xl px-4 py-3.5 hover:border-[#745b3c]/40 hover:bg-[#EDE8D8] active:scale-[0.98] transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center shrink-0">
                  <CalendarCheck size={16} className="text-[#8A7E6E]" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">My Availability</p>
                  <p className="text-[#8A7E6E] text-xs">Set dates & time slots</p>
                </div>
                <ChevronRight size={16} className="text-[#745b3c] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => navigate('/staff-gallery')}
                className="w-full flex items-center gap-3 bg-[#F8F3E8] border border-[#D4CDB5]/60 text-[#1E2A35] rounded-2xl px-4 py-3.5 hover:border-[#745b3c]/40 hover:bg-[#EDE8D8] active:scale-[0.98] transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center shrink-0">
                  <Images size={16} className="text-[#8A7E6E]" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">Post to Gallery</p>
                  <p className="text-[#8A7E6E] text-xs">Upload photos & tag students</p>
                </div>
                <ChevronRight size={16} className="text-[#745b3c] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => navigate('/staff-account')}
                className="w-full flex items-center gap-3 bg-[#F8F3E8] border border-[#D4CDB5]/60 text-[#1E2A35] rounded-2xl px-4 py-3.5 hover:border-[#745b3c]/40 hover:bg-[#EDE8D8] active:scale-[0.98] transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center shrink-0">
                  <KeyRound size={16} className="text-[#8A7E6E]" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">Account Settings</p>
                  <p className="text-[#8A7E6E] text-xs">Change password</p>
                </div>
                <ChevronRight size={16} className="text-[#745b3c] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* ── Row 2 Left: Schedule Requests ── */}
          <div className={`md:col-span-3 bg-white rounded-3xl border border-amber-200/50 shadow-sm flex flex-col overflow-hidden ${CARD_HOVER_GROW}`}>
            <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SendHorizonal size={15} className="text-amber-600" />
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em' }} className="text-[#1E2A35]">
                  My Schedule Requests
                </h2>
              </div>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">2 pending</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#D4CDB5]/30
              [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-[#D4CDB5] [&::-webkit-scrollbar-thumb]:rounded-full">
              {[
                { class: 'Yoga', date: 'Sat, Apr 19', time: '8:00 AM', coach: staffUser.name.split(' ')[0], status: 'pending' as const, submitted: '2 hrs ago' },
                { class: 'Mat Pilates', date: 'Sun, Apr 20', time: '10:00 AM', coach: staffUser.name.split(' ')[0], status: 'pending' as const, submitted: '1 day ago' },
              ].map((req, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: CLASS_COLORS[req.class] || '#745b3c' }} />
                  <div className="flex-1">
                    <p className="text-[#1E2A35] text-sm font-semibold">{req.class}</p>
                    <p className="text-[#8A7E6E] text-xs">{req.date} · {req.time} · Coach {req.coach}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                      Pending
                    </span>
                    <span className="text-[#C0B8A8] text-xs">{req.submitted}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2 Right: Today at a Glance ── */}
          <div className={`md:col-span-2 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5 flex flex-col ${CARD_HOVER_GROW}`}>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-4 shrink-0">Today at a Glance</p>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Total Classes',  value: '3',   color: 'text-[#1E2A35]' },
                { label: 'Total Students', value: '26',  color: 'text-[#1E2A35]' },
                { label: 'Open Spots',     value: '13',  color: 'text-amber-600'  },
                { label: 'Active Members', value: '200', color: 'text-[#745b3c]'  },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[#5A5048] text-sm">{label}</span>
                  <span className={`font-semibold ${color}`} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
