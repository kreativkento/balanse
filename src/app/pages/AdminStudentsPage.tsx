import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus, Search, Pencil, Trash2, X, Users, ChevronDown,
  Activity, Flame, CalendarDays, Clock, Mail, Phone, MapPin, Check,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/layout/AdminSidebar';

// ── Types & Data ───────────────────────────────────────────────

interface Student {
  id: number;
  name: string;
  email: string;
  membership: 'Gold' | 'Silver' | 'Single Pass';
  joinDate: string;
  status: 'active' | 'inactive';
  subscriptionStart: string;
  subscriptionEnd: string;
}

interface StudentCrm {
  phone: string;
  address: string;
  availability: string;
  totalSessions: number;
  thisMonth: number;
  streak: number;
  favoriteClass: string;
  renewalDate: string;
  recentBookings: { class: string; date: string; time: string; status: string }[];
}

const STUDENT_CRM: Record<number, StudentCrm> = {
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

const MEMBERSHIP_ACCENT: Record<Student['membership'], string> = {
  Gold: '#C49A3C',
  Silver: '#8A7E6E',
  'Single Pass': '#7A6A52',
};

const INITIAL_STUDENTS: Student[] = [
  { id:  1, name: 'Alex Johnson',    email: 'alex.j@email.com',      membership: 'Gold',        joinDate: 'Jan 15, 2026', status: 'active',   subscriptionStart: 'Apr 1, 2026',  subscriptionEnd: 'Apr 30, 2026'  },
  { id:  2, name: 'Maria Santos',    email: 'maria.s@email.com',     membership: 'Silver',      joinDate: 'Feb 3, 2026',  status: 'active',   subscriptionStart: 'May 3, 2026',  subscriptionEnd: 'Jun 2, 2026'   },
  { id:  3, name: 'Cris Dela Cruz',  email: 'cris.dc@email.com',     membership: 'Single Pass', joinDate: 'Mar 20, 2026', status: 'active',   subscriptionStart: 'Jul 20, 2026', subscriptionEnd: 'Jul 20, 2026'  },
  { id:  4, name: 'Sofia Reyes',     email: 'sofia.r@email.com',     membership: 'Gold',        joinDate: 'Nov 11, 2025', status: 'active',   subscriptionStart: 'Apr 22, 2026', subscriptionEnd: 'May 22, 2026'  },
  { id:  5, name: 'Marco Lim',       email: 'marco.lim@email.com',   membership: 'Silver',      joinDate: 'Dec 5, 2025',  status: 'active',   subscriptionStart: 'May 5, 2026',  subscriptionEnd: 'Jun 4, 2026'   },
  { id:  6, name: 'Pia Villanueva',  email: 'pia.v@email.com',       membership: 'Gold',        joinDate: 'Oct 22, 2025', status: 'active',   subscriptionStart: 'Apr 22, 2026', subscriptionEnd: 'May 22, 2026'  },
  { id:  7, name: 'Diego Tan',       email: 'diego.t@email.com',     membership: 'Single Pass', joinDate: 'Jan 30, 2026', status: 'inactive', subscriptionStart: '—',            subscriptionEnd: '—'             },
  { id:  8, name: 'Camille Cruz',    email: 'camille.c@email.com',   membership: 'Silver',      joinDate: 'Mar 1, 2026',  status: 'active',   subscriptionStart: 'May 1, 2026',  subscriptionEnd: 'May 31, 2026'  },
  { id:  9, name: 'Ryan Bautista',   email: 'ryan.b@email.com',      membership: 'Gold',        joinDate: 'Sep 14, 2025', status: 'active',   subscriptionStart: 'Sep 14, 2026', subscriptionEnd: 'Oct 14, 2026'  },
  { id: 10, name: 'Lea Mendoza',     email: 'lea.m@email.com',       membership: 'Single Pass', joinDate: 'Apr 2, 2026',  status: 'active',   subscriptionStart: 'Jul 27, 2026', subscriptionEnd: 'Jul 27, 2026'  },
  { id: 11, name: 'Jan Corpus',      email: 'jan.c@email.com',       membership: 'Silver',      joinDate: 'Feb 18, 2026', status: 'active',   subscriptionStart: 'Feb 18, 2026', subscriptionEnd: 'Mar 18, 2027'  },
  { id: 12, name: 'Hannah Ong',      email: 'hannah.o@email.com',    membership: 'Gold',        joinDate: 'Aug 30, 2025', status: 'active',   subscriptionStart: 'Aug 30, 2026', subscriptionEnd: 'Sep 30, 2026'  },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  membership: 'Single Pass' as Student['membership'],
  joinDate: '',
  status: 'active' as 'active' | 'inactive',
  password: '',
  subscriptionStart: '',
  subscriptionEnd: '',
};

const EMPTY_CRM: StudentCrm = {
  phone: 'Not provided',
  address: 'Not provided',
  availability: 'Not specified',
  totalSessions: 0,
  thisMonth: 0,
  streak: 0,
  favoriteClass: '—',
  renewalDate: 'N/A',
  recentBookings: [],
};

function clientInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ── Profile Modal (coach-style layout) ─────────────────────────

function ClientProfileModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const crm = STUDENT_CRM[student.id] ?? EMPTY_CRM;
  const accent = MEMBERSHIP_ACCENT[student.membership];
  const initials = clientInitials(student.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Client profile for ${student.name}`}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover banner with overlapping avatar */}
        <div className="relative">
          <div className="relative h-36 md:h-40 overflow-hidden" style={{ backgroundColor: `${accent}20` }}>
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}35 0%, ${accent}08 100%)` }} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile"
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C]/50"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
          </div>

          <div
            className="absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg flex items-center justify-center"
            style={{ backgroundColor: `${accent}18` }}
          >
            <span
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '2rem',
                letterSpacing: '0.08em',
                color: accent,
              }}
            >
              {initials}
            </span>
          </div>
        </div>

        {/* Identity */}
        <div className="border-b border-[#D4CDB5]/50 px-6 pb-5 pt-14 md:px-8 md:pt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                className="text-[#1E2A35] leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}
              >
                {student.name}
              </h2>
              <p className="mt-0.5 text-sm font-semibold text-[#8A7E6E]">{student.membership} Member</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                    student.status === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60'
                  }`}
                >
                  {student.status}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${accent}18`, color: accent }}
                >
                  Joined {student.joinDate}
                </span>
              </div>
            </div>
            {crm.favoriteClass !== '—' && (
              <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {crm.favoriteClass}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-6 grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pb-8">
          {/* Left */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Contact</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                  <Mail size={13} className="text-[#C49A3C] shrink-0" />
                  <span className="truncate">{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                  <Phone size={13} className="text-[#C49A3C] shrink-0" />
                  <span>{crm.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-[#5A5048]">
                  <MapPin size={13} className="text-[#C49A3C] shrink-0 mt-0.5" />
                  <span>{crm.address}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock size={11} /> Availability
              </p>
              <p className="text-[#5A5048] text-sm">{crm.availability}</p>
            </div>

            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Membership</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                  <div className="w-1 h-1 rounded-full bg-[#C49A3C] shrink-0" />
                  Plan: {student.membership}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                  <div className="w-1 h-1 rounded-full bg-[#C49A3C] shrink-0" />
                  Period:{' '}
                  {student.subscriptionStart === '—'
                    ? '—'
                    : `${student.subscriptionStart} → ${student.subscriptionEnd}`}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                  <div className="w-1 h-1 rounded-full bg-[#C49A3C] shrink-0" />
                  Renewal: {crm.renewalDate}
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Performance</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Activity size={13} className="text-[#C49A3C]" />, label: 'Total', value: String(crm.totalSessions) },
                  { icon: <CalendarDays size={13} className="text-[#8A9E7A]" />, label: 'Month', value: String(crm.thisMonth) },
                  { icon: <Flame size={13} className="text-amber-500" />, label: 'Streak', value: crm.streak > 0 ? String(crm.streak) : '—' },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-[#D4CDB5]/50 bg-[#F8F3E8] px-2.5 py-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-1">
                      {metric.icon}
                      <span className="text-[#9A8E7E] text-[10px] uppercase tracking-wide">{metric.label}</span>
                    </div>
                    <p
                      className="text-[#1E2A35] leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.04em' }}
                    >
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {crm.recentBookings.length > 0 && (
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Recent Bookings</p>
                <div className="flex flex-col gap-1.5">
                  {crm.recentBookings.map((booking, index) => (
                    <div
                      key={`${booking.class}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#D4CDB5]/50 bg-[#F8F3E8] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-xs font-semibold truncate">{booking.class}</p>
                        <p className="text-[#9A8E7E] text-[11px]">{booking.date} · {booking.time}</p>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          booking.status === 'confirmed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [search, setSearch] = useState('');
  const [filterMem, setFilterMem] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  if (!adminUser) return null;

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchMem = filterMem === 'All' || s.membership === filterMem;
    return matchSearch && matchMem;
  });

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, joinDate: 'Apr 9, 2026' });
    setEditingId(null);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (student: Student) => {
    setForm({
      name: student.name,
      email: student.email,
      membership: student.membership,
      joinDate: student.joinDate,
      status: student.status,
      password: '',
      subscriptionStart: student.subscriptionStart,
      subscriptionEnd: student.subscriptionEnd,
    });
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
      setStudents((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
    } else {
      setStudents((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: form.name.trim(),
          email: form.email.trim(),
          membership: form.membership,
          joinDate: form.joinDate || 'Jul 27, 2026',
          status: form.status,
          subscriptionStart: form.subscriptionStart || '—',
          subscriptionEnd: form.subscriptionEnd || '—',
        },
      ]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setDeleteId(null);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  const MEM_FILTERS = ['All', 'Gold', 'Silver', 'Single Pass'];

  return (
    <AdminSidebar>
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-[#C49A3C]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Clients</span>
            </div>
            <h1
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}
            >
              Client Accounts
            </h1>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
          >
            <Plus size={16} /> Add Client
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
          <span className="text-[#8A7E6E] text-sm ml-auto">{filtered.length} of {students.length} clients</span>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_100px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
            {['Name', 'Email', 'Membership', 'Subscription Period', 'Status', 'Actions'].map((h) => (
              <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-[#B0A898] text-sm">No clients match your search.</div>
          ) : (
            <div className="divide-y divide-[#D4CDB5]/30">
              {filtered.map((student) => (
                <div
                  key={student.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setViewingStudent(student)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewingStudent(student);
                    }
                  }}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_100px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#C49A3C]/12 border border-[#C49A3C]/25 flex items-center justify-center shrink-0">
                      <span className="text-[#A67E2A] text-xs font-bold">
                        {clientInitials(student.name)}
                      </span>
                    </div>
                    <span className="text-[#1E2A35] text-sm font-semibold truncate">{student.name}</span>
                  </div>

                  <span className="text-[#8A7E6E] text-sm truncate">{student.email}</span>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${MEMBERSHIP_COLORS[student.membership]}`}>
                    {student.membership}
                  </span>

                  <div>
                    {student.subscriptionStart === '—' ? (
                      <span className="text-[#B0A898] text-xs">—</span>
                    ) : (
                      <div>
                        <p className="text-[#1E2A35] text-xs font-medium">{student.subscriptionStart}</p>
                        <p className="text-[#9A8E7E] text-xs">→ {student.subscriptionEnd}</p>
                      </div>
                    )}
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${student.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#EDE8D8] text-[#8A7E6E] border border-[#D4CDB5]/60'}`}>
                    {student.status}
                  </span>

                  <div
                    className="flex items-center gap-1.5 w-[100px]"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {deleteId === student.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDelete(student.id)}
                          aria-label="Confirm delete"
                          className="h-8 w-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(null)}
                          aria-label="Cancel delete"
                          className="h-8 w-8 rounded-lg bg-white border border-[#D4CDB5]/70 text-[#8A7E6E] flex items-center justify-center hover:bg-[#EDE8D8] active:scale-95 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(student)}
                          aria-label={`Edit ${student.name}`}
                          className="h-8 w-8 rounded-lg bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 flex items-center justify-center hover:bg-[#EDE8D8] hover:text-[#1E2A35] active:scale-95 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(student.id)}
                          aria-label={`Delete ${student.name}`}
                          className="h-8 w-8 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
                        >
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

      {viewingStudent && (
        <ClientProfileModal student={viewingStudent} onClose={() => setViewingStudent(null)} />
      )}

      {/* ── Edit/Add Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
              >
                {editingId !== null ? 'Edit Client' : 'Add Client'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4">
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Juan dela Cruz" className={inputClass} />
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="client@email.com" className={inputClass} />
              </div>

              {editingId === null && (
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Set a temporary password" className={inputClass} />
                </div>
              )}

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
                {editingId !== null ? 'Save Changes' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSidebar>
  );
}
