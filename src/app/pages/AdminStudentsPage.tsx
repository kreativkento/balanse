import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, Pencil, Trash2, X, Check, Users, ChevronDown, Eye, Activity, Flame, CalendarDays, Clock } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminTopBar } from '../components/layout/AdminTopBar';

// ── Types & Data ───────────────────────────────────────────────

interface Student {
  id: number;
  name: string;
  email: string;
  membership: 'Gold' | 'Silver' | 'Single Pass';
  joinDate: string;
  status: 'active' | 'inactive';
}

// ── CRM Data ──
const STUDENT_CRM: Record<number, {
  phone: string; address: string; availability: string;
  totalSessions: number; thisMonth: number; streak: number; favoriteClass: string;
  renewalDate: string;
  recentBookings: { class: string; date: string; time: string; status: string }[];
}> = {
  1:  { phone: '+63 917 111 2233', address: 'Makati City, Metro Manila', availability: 'Mornings (Mon–Fri)', totalSessions: 24, thisMonth: 6, streak: 5, favoriteClass: 'Yoga',            renewalDate: 'Apr 30, 2026', recentBookings: [{ class: 'Yoga', date: 'Apr 7', time: '8:00 AM', status: 'confirmed' }, { class: 'Mat Pilates', date: 'Mar 31', time: '10:00 AM', status: 'confirmed' }, { class: 'Animal Flow', date: 'Mar 24', time: '6:00 PM', status: 'confirmed' }] },
  2:  { phone: '+63 918 222 3344', address: 'Quezon City, Metro Manila', availability: 'Weekends, Tue/Thu', totalSessions: 18, thisMonth: 4, streak: 3, favoriteClass: 'Mat Pilates',     renewalDate: 'May 3, 2026',  recentBookings: [{ class: 'Mat Pilates', date: 'Apr 6', time: '10:00 AM', status: 'confirmed' }, { class: 'Yoga', date: 'Mar 30', time: '8:00 AM', status: 'confirmed' }, { class: 'Groundworks', date: 'Mar 22', time: '11:00 AM', status: 'confirmed' }] },
  3:  { phone: '+63 919 333 4455', address: 'Pasig City, Metro Manila',  availability: 'Flexible',         totalSessions: 3,  thisMonth: 1, streak: 1, favoriteClass: 'Calisthenics',    renewalDate: 'N/A',          recentBookings: [{ class: 'Calisthenics', date: 'Apr 8', time: '7:00 AM', status: 'pending' }] },
  4:  { phone: '+63 920 444 5566', address: 'Taguig City, Metro Manila', availability: 'Mornings daily',   totalSessions: 41, thisMonth: 8, streak: 12, favoriteClass: 'Yoga',           renewalDate: 'Apr 22, 2026', recentBookings: [{ class: 'Yoga', date: 'Apr 7', time: '8:00 AM', status: 'confirmed' }, { class: 'Kickboxing', date: 'Apr 4', time: '5:00 PM', status: 'confirmed' }, { class: 'Yoga', date: 'Mar 31', time: '8:00 AM', status: 'confirmed' }] },
  5:  { phone: '+63 921 555 6677', address: 'Mandaluyong, Metro Manila', availability: 'Evenings (Mon–Fri)', totalSessions: 22, thisMonth: 5, streak: 4, favoriteClass: 'Circuit Training', renewalDate: 'May 5, 2026', recentBookings: [{ class: 'Circuit Training', date: 'Apr 9', time: '4:00 PM', status: 'confirmed' }, { class: 'Mat Pilates', date: 'Apr 2', time: '9:00 AM', status: 'confirmed' }] },
  6:  { phone: '+63 922 666 7788', address: 'Bonifacio Global City',     availability: 'Anytime',          totalSessions: 36, thisMonth: 7, streak: 8, favoriteClass: 'Animal Flow',     renewalDate: 'Apr 22, 2026', recentBookings: [{ class: 'Animal Flow', date: 'Apr 8', time: '9:00 AM', status: 'confirmed' }, { class: 'Groundworks', date: 'Apr 2', time: '11:00 AM', status: 'confirmed' }] },
  7:  { phone: '+63 923 777 8899', address: 'Las Piñas, Metro Manila',   availability: 'Not specified',    totalSessions: 5,  thisMonth: 0, streak: 0, favoriteClass: 'Calisthenics',    renewalDate: 'N/A',          recentBookings: [{ class: 'Calisthenics', date: 'Mar 15', time: '7:00 AM', status: 'confirmed' }] },
  8:  { phone: '+63 924 888 9900', address: 'San Juan, Metro Manila',    availability: 'Mon, Wed, Fri AM', totalSessions: 14, thisMonth: 3, streak: 2, favoriteClass: 'Mat Pilates',     renewalDate: 'May 1, 2026',  recentBookings: [{ class: 'Mat Pilates', date: 'Apr 7', time: '10:00 AM', status: 'confirmed' }, { class: 'Yoga', date: 'Mar 31', time: '8:00 AM', status: 'confirmed' }] },
  9:  { phone: '+63 925 999 0011', address: 'Paranaque, Metro Manila',   availability: 'Weekends only',    totalSessions: 29, thisMonth: 4, streak: 3, favoriteClass: 'Kickboxing',       renewalDate: 'Sep 14, 2026', recentBookings: [{ class: 'Kickboxing', date: 'Apr 6', time: '5:00 PM', status: 'confirmed' }, { class: 'Calisthenics', date: 'Mar 29', time: '7:00 AM', status: 'confirmed' }] },
  10: { phone: '+63 926 000 1122', address: 'Marikina City, Metro Manila', availability: 'Mornings',      totalSessions: 2,  thisMonth: 1, streak: 1, favoriteClass: 'Mat Pilates',     renewalDate: 'N/A',          recentBookings: [{ class: 'Mat Pilates', date: 'Apr 9', time: '9:00 AM', status: 'pending' }] },
  11: { phone: '+63 927 111 2233', address: 'Caloocan City',             availability: 'Tue, Thu, Sat',   totalSessions: 11, thisMonth: 2, streak: 1, favoriteClass: 'Groundworks',      renewalDate: 'Feb 18, 2027', recentBookings: [{ class: 'Groundworks', date: 'Apr 9', time: '11:00 AM', status: 'confirmed' }] },
  12: { phone: '+63 928 222 3344', address: 'Muntinlupa City',           availability: 'Daily morning',    totalSessions: 33, thisMonth: 7, streak: 10, favoriteClass: 'Yoga',            renewalDate: 'Aug 30, 2026', recentBookings: [{ class: 'Yoga', date: 'Apr 7', time: '8:00 AM', status: 'confirmed' }, { class: 'Mat Pilates', date: 'Apr 3', time: '10:00 AM', status: 'confirmed' }] },
};

const MEMBERSHIP_COLORS: Record<string, string> = {
  'Gold':        'bg-[#C49A3C]/12 text-[#A67E2A] border border-[#C49A3C]/30',
  'Silver':      'bg-[#8A7E6E]/10 text-[#5A5048] border border-[#8A7E6E]/20',
  'Single Pass': 'bg-[#EDE8D8] text-[#7A6A52] border border-[#D4CDB5]/60',
};

const INITIAL_STUDENTS: Student[] = [
  { id:  1, name: 'Alex Johnson',    email: 'alex.j@email.com',      membership: 'Gold',        joinDate: 'Jan 15, 2026', status: 'active'   },
  { id:  2, name: 'Maria Santos',    email: 'maria.s@email.com',     membership: 'Silver',      joinDate: 'Feb 3, 2026',  status: 'active'   },
  { id:  3, name: 'Cris Dela Cruz',  email: 'cris.dc@email.com',     membership: 'Single Pass', joinDate: 'Mar 20, 2026', status: 'active'   },
  { id:  4, name: 'Sofia Reyes',     email: 'sofia.r@email.com',     membership: 'Gold',        joinDate: 'Nov 11, 2025', status: 'active'   },
  { id:  5, name: 'Marco Lim',       email: 'marco.lim@email.com',   membership: 'Silver',      joinDate: 'Dec 5, 2025',  status: 'active'   },
  { id:  6, name: 'Pia Villanueva',  email: 'pia.v@email.com',       membership: 'Gold',        joinDate: 'Oct 22, 2025', status: 'active'   },
  { id:  7, name: 'Diego Tan',       email: 'diego.t@email.com',     membership: 'Single Pass', joinDate: 'Jan 30, 2026', status: 'inactive' },
  { id:  8, name: 'Camille Cruz',    email: 'camille.c@email.com',   membership: 'Silver',      joinDate: 'Mar 1, 2026',  status: 'active'   },
  { id:  9, name: 'Ryan Bautista',   email: 'ryan.b@email.com',      membership: 'Gold',        joinDate: 'Sep 14, 2025', status: 'active'   },
  { id: 10, name: 'Lea Mendoza',     email: 'lea.m@email.com',       membership: 'Single Pass', joinDate: 'Apr 2, 2026',  status: 'active'   },
  { id: 11, name: 'Jan Corpus',      email: 'jan.c@email.com',       membership: 'Silver',      joinDate: 'Feb 18, 2026', status: 'active'   },
  { id: 12, name: 'Hannah Ong',      email: 'hannah.o@email.com',    membership: 'Gold',        joinDate: 'Aug 30, 2025', status: 'active'   },
];

const EMPTY_FORM = { name: '', email: '', membership: 'Single Pass' as Student['membership'], joinDate: '', status: 'active' as 'active' | 'inactive', password: '' };

// ── CRM Modal ─────────────────────────────────────────────────

function CRMModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const crm = STUDENT_CRM[student.id] ?? {
    phone: 'Not provided', address: 'Not provided', availability: 'Not specified',
    totalSessions: 0, thisMonth: 0, streak: 0, favoriteClass: '—', renewalDate: 'N/A',
    recentBookings: [],
  };

  const MEMBERSHIP_COLORS: Record<string, string> = {
    'Gold': 'bg-[#C49A3C]/12 text-[#A67E2A] border border-[#C49A3C]/30',
    'Silver': 'bg-[#8A7E6E]/10 text-[#5A5048] border border-[#8A7E6E]/20',
    'Single Pass': 'bg-[#EDE8D8] text-[#7A6A52] border border-[#D4CDB5]/60',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C49A3C]/12 border border-[#C49A3C]/25 flex items-center justify-center">
              <span className="text-[#A67E2A] text-xs font-bold">{student.name.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
            </div>
            <div>
              <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.05em' }}>{student.name}</h3>
              <p className="text-[#8A7E6E] text-xs">{student.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all"><X size={16} /></button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Membership + Status */}
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${MEMBERSHIP_COLORS[student.membership]}`}>{student.membership}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${student.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#EDE8D8] text-[#8A7E6E] border border-[#D4CDB5]/60'}`}>{student.status}</span>
            <span className="text-[#B0A898] text-xs ml-auto">Joined {student.joinDate}</span>
          </div>

          {/* Performance Metrics */}
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Performance Metrics</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Activity size={15} className="text-[#C49A3C]" />, label: 'Total Sessions', value: String(crm.totalSessions) },
                { icon: <CalendarDays size={15} className="text-[#8A9E7A]" />, label: 'This Month', value: String(crm.thisMonth) },
                { icon: <Flame size={15} className="text-amber-500" />, label: 'Streak', value: crm.streak > 0 ? `${crm.streak} sessions` : '—' },
              ].map(m => (
                <div key={m.label} className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 px-3 py-3 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">{m.icon}<span className="text-[#9A8E7E] text-xs">{m.label}</span></div>
                  <p className="text-[#1E2A35] leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.04em' }}>{m.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/50 px-4 py-2.5">
              <span className="text-[#8A7E6E] text-sm">Favorite Class</span>
              <span className="text-[#1E2A35] text-sm font-semibold">{crm.favoriteClass}</span>
            </div>
            <div className="mt-2 flex items-center justify-between bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/50 px-4 py-2.5">
              <span className="text-[#8A7E6E] text-sm">Membership Renewal</span>
              <span className="text-[#1E2A35] text-sm font-semibold">{crm.renewalDate}</span>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Contact Information</p>
            <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 p-4 flex flex-col gap-2">
              {[['Phone', crm.phone], ['Address', crm.address]].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[#9A8E7E] text-sm">{label}</span>
                  <span className="text-[#1E2A35] text-sm font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Availability / Schedule Preferences</p>
            <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/50 px-4 py-3 flex items-center gap-2">
              <Clock size={14} className="text-[#C49A3C] shrink-0" />
              <span className="text-[#1E2A35] text-sm">{crm.availability}</span>
            </div>
          </div>

          {/* Booking History */}
          {crm.recentBookings.length > 0 && (
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-3">Recent Booking History</p>
              <div className="flex flex-col gap-2">
                {crm.recentBookings.map((b, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/50 px-4 py-2.5">
                    <div>
                      <p className="text-[#1E2A35] text-sm font-medium">{b.class}</p>
                      <p className="text-[#9A8E7E] text-xs">{b.date} · {b.time}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [students, setStudents]     = useState<Student[]>(INITIAL_STUDENTS);
  const [search, setSearch]         = useState('');
  const [filterMem, setFilterMem]   = useState<string>('All');
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formError, setFormError]   = useState('');

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  if (!adminUser) return null;

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchMem    = filterMem === 'All' || s.membership === filterMem;
    return matchSearch && matchMem;
  });

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, joinDate: 'Apr 9, 2026' });
    setEditingId(null);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (student: Student) => {
    setForm({ name: student.name, email: student.email, membership: student.membership, joinDate: student.joinDate, status: student.status, password: '' });
    setEditingId(student.id);
    setFormError('');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (editingId === null && !form.password.trim()) {
      setFormError('Password is required for new accounts.');
      return;
    }
    if (editingId !== null) {
      setStudents((prev) => prev.map((s) => s.id === editingId ? { ...s, ...form } : s));
    } else {
      setStudents((prev) => [
        ...prev,
        { id: Date.now(), name: form.name.trim(), email: form.email.trim(), membership: form.membership, joinDate: form.joinDate || 'Apr 9, 2026', status: form.status },
      ]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setDeleteId(null);
  };

  const inputClass  = "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  const MEM_FILTERS = ['All', 'Gold', 'Silver', 'Single Pass'];

  return (
    <div className="min-h-screen bg-[#F8F3E8]">
      <AdminTopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-[#C49A3C]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Students</span>
            </div>
            <h1
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}
            >
              Student Accounts
            </h1>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Add Student
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]"
            />
          </div>
          <div className="flex items-center gap-2">
            {MEM_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilterMem(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${filterMem === f ? 'bg-[#1E2A35] text-white' : 'bg-white border border-[#D4CDB5]/60 text-[#8A7E6E] hover:border-[#C49A3C]/40 hover:text-[#1E2A35]'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-[#8A7E6E] text-sm ml-auto">{filtered.length} of {students.length} students</span>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2fr_2.2fr_1.3fr_1.3fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
            {['Name', 'Email', 'Membership', 'Joined', 'Status', ''].map((h) => (
              <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-[#B0A898] text-sm">No students match your search.</div>
          ) : (
            <div className="divide-y divide-[#D4CDB5]/30">
              {filtered.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-[2fr_2.2fr_1.3fr_1.3fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#C49A3C]/12 border border-[#C49A3C]/25 flex items-center justify-center shrink-0">
                      <span className="text-[#A67E2A] text-xs font-bold">
                        {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-[#1E2A35] text-sm font-semibold truncate">{student.name}</span>
                  </div>

                  {/* Email */}
                  <span className="text-[#8A7E6E] text-sm truncate">{student.email}</span>

                  {/* Membership */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${MEMBERSHIP_COLORS[student.membership]}`}>
                    {student.membership}
                  </span>

                  {/* Join date */}
                  <span className="text-[#8A7E6E] text-sm">{student.joinDate}</span>

                  {/* Status */}
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${student.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#EDE8D8] text-[#8A7E6E] border border-[#D4CDB5]/60'}`}>
                    {student.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {deleteId === student.id ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
                        <span className="text-red-700 text-xs font-semibold">Delete?</span>
                        <button onClick={() => handleDelete(student.id)} className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                          <Check size={11} />
                        </button>
                        <button onClick={() => setDeleteId(null)} className="w-6 h-6 rounded-lg bg-white border border-[#D4CDB5]/60 flex items-center justify-center text-[#8A7E6E] hover:bg-[#EDE8D8]">
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setViewingStudent(student)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A7E6E] hover:text-[#C49A3C] hover:bg-[#EDE8D8] transition-all" title="View CRM Details"><Eye size={14} /></button>
                        <button onClick={() => openEdit(student)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteId(student.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A7E6E] hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CRM Modal ── */}
      {viewingStudent && <CRMModal student={viewingStudent} onClose={() => setViewingStudent(null)} />}

      {/* ── Edit/Add Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
              >
                {editingId !== null ? 'Edit Student' : 'Add Student'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan dela Cruz" className={inputClass} />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="student@email.com" className={inputClass} />
              </div>

              {/* Password (add only) */}
              {editingId === null && (
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Set a temporary password" className={inputClass} />
                </div>
              )}

              {/* Membership + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Membership</label>
                  <div className="relative">
                    <select value={form.membership} onChange={(e) => setForm((f) => ({ ...f, membership: e.target.value as Student['membership'] }))} className={selectClass}>
                      <option value="Single Pass">Single Pass</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Status</label>
                  <div className="relative">
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))} className={selectClass}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
            </div>

            <div className="px-7 pb-7 flex items-center gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm font-medium hover:bg-[#EDE8D8] transition-all">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
              >
                {editingId !== null ? 'Save Changes' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}