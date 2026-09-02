import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Search, Pencil, Trash2, X, Users,
  Activity, CalendarDays, Clock, Mail, Phone, MapPin, Check, Globe,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import {
  deleteManagedAccount,
  fetchClientClassBookings,
  fetchClientDirectory,
  updateClientAccountFromForm,
  type ClientClassBooking,
  type ClientDirectoryItem,
} from '../../lib/admin-service';
import { ProfileAvatar } from '../components/ProfileImages';

const ACCENT = '#745b3c';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  nationality: '',
  address: '',
};

function clientInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatBirthday(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSex(value: string) {
  if (!value) return '—';
  if (value === 'prefer_not_to_say') return 'Prefer not to say';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ClientProfileModal({
  student,
  onClose,
}: {
  student: ClientDirectoryItem;
  onClose: () => void;
}) {
  const [bookings, setBookings] = useState<ClientClassBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const initials = clientInitials(student.name);
  const favoriteClass = bookings[0]?.className ?? '—';

  useEffect(() => {
    let cancelled = false;
    setBookingsLoading(true);
    void fetchClientClassBookings(student.id).then((rows) => {
      if (cancelled) return;
      setBookings(rows);
      setBookingsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [student.id]);

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
        <div className="relative">
          <div className="relative h-36 md:h-40 overflow-hidden" style={{ backgroundColor: `${ACCENT}20` }}>
            {student.coverImage ? (
              <img src={student.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${ACCENT}35 0%, ${ACCENT}08 100%)` }} />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile"
              className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#745b3c]/50"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: ACCENT }} />
          </div>

          <div
            className="absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg flex items-center justify-center"
            style={{ backgroundColor: `${ACCENT}18` }}
          >
            <ProfileAvatar
              src={student.photo}
              initials={initials}
              alt=""
              className="h-full w-full"
              initialsClassName="flex h-full w-full items-center justify-center text-[#5e4a30]"
            />
          </div>
        </div>

        <div className="border-b border-[#D4CDB5]/50 px-6 pb-5 pt-14 md:px-8 md:pt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                className="text-[#1E2A35] leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}
              >
                {student.name}
              </h2>
              <p className="mt-0.5 text-sm font-semibold text-[#8A7E6E]">Client</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                    student.profileComplete
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60'
                  }`}
                >
                  {student.profileComplete ? 'Profile complete' : 'Incomplete'}
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${ACCENT}18`, color: ACCENT }}
                >
                  Joined {student.joinDate}
                </span>
              </div>
            </div>
            {favoriteClass !== '—' && (
              <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {favoriteClass}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 py-6 grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pb-8">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Contact</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                  <Mail size={13} className="text-[#745b3c] shrink-0" />
                  <span className="truncate">{student.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                  <Phone size={13} className="text-[#745b3c] shrink-0" />
                  <span>{student.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-[#5A5048]">
                  <MapPin size={13} className="text-[#745b3c] shrink-0 mt-0.5" />
                  <span>{student.address || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                  <Globe size={13} className="text-[#745b3c] shrink-0" />
                  <span>{student.nationality || 'Not provided'}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock size={11} /> Availability
              </p>
              <p className="text-[#5A5048] text-sm">
                {student.shareAvailability ? 'Shares availability' : 'Not sharing availability'}
              </p>
            </div>

            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Profile details</p>
              <div className="flex flex-col gap-1.5">
                {[
                  `Birthday: ${formatBirthday(student.birthday)}`,
                  `Sex: ${formatSex(student.sex)}`,
                  `Height: ${student.height || '—'}`,
                  `Weight: ${student.weight || '—'}`,
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2 text-xs text-[#5A5048]">
                    <div className="w-1 h-1 rounded-full bg-[#745b3c] shrink-0" />
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Activity</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Activity size={13} className="text-[#745b3c]" />, label: 'Classes', value: bookingsLoading ? '…' : String(bookings.length) },
                  { icon: <CalendarDays size={13} className="text-[#8A9E7A]" />, label: 'Health form', value: student.healthDeclarationSigned ? 'Yes' : 'No' },
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

            <div>
              <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Recent classes</p>
              {bookingsLoading ? (
                <p className="text-[#B0A898] text-sm">Loading classes…</p>
              ) : bookings.length === 0 ? (
                <p className="text-[#B0A898] text-sm">No class enrollments yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {bookings.map((booking) => (
                    <div
                      key={`${booking.classId}-${booking.date}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#D4CDB5]/50 bg-[#F8F3E8] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[#1E2A35] text-xs font-semibold truncate">{booking.className}</p>
                        <p className="text-[#9A8E7E] text-[11px]">{booking.date} · {booking.time}</p>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          booking.status === 'published' || booking.status === 'completed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [students, setStudents] = useState<ClientDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterProfile, setFilterProfile] = useState<'All' | 'Complete' | 'Incomplete'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingStudent, setViewingStudent] = useState<ClientDirectoryItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const { containerRef, pageSize } = useFitPageSize({ layout: 'table', fallback: 8 });

  const loadClients = useCallback(async () => {
    setLoading(true);
    const rows = await fetchClientDirectory();
    setStudents(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void loadClients();
  }, [adminUser, loadClients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q)
        || s.phone.toLowerCase().includes(q);
      const matchProfile =
        filterProfile === 'All'
        || (filterProfile === 'Complete' && s.profileComplete)
        || (filterProfile === 'Incomplete' && !s.profileComplete);
      return matchSearch && matchProfile;
    });
  }, [students, search, filterProfile]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, filterProfile]);

  if (!adminUser) return null;

  const openEdit = (student: ClientDirectoryItem) => {
    setForm({
      name: student.name,
      email: student.email,
      phone: student.phone,
      nationality: student.nationality,
      address: student.address,
    });
    setEditingId(student.id);
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (!editingId) return;

    setSaving(true);
    setFormError('');
    const result = await updateClientAccountFromForm(editingId, {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      nationality: form.nationality.trim(),
      address: form.address.trim(),
    });
    setSaving(false);

    if (!result.ok) {
      setFormError(result.error || 'Failed to update client.');
      return;
    }

    await loadClients();
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteManagedAccount(id);
    if (!result.ok) {
      setFormError(result.error || 'Failed to delete client.');
      setDeleteId(null);
      return;
    }
    await loadClients();
    setDeleteId(null);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]";

  const PROFILE_FILTERS = ['All', 'Complete', 'Incomplete'] as const;

  return (
    <>
      <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-7 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-[#745b3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Clients</span>
            </div>
            <h1
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}
            >
              Client Accounts
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-5 flex-wrap shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or phone…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]"
            />
          </div>
          <div className="flex items-center gap-2">
            {PROFILE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilterProfile(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${filterProfile === f ? 'bg-[#1E2A35] text-white' : 'bg-white border border-[#D4CDB5]/60 text-[#8A7E6E] hover:border-[#745b3c]/40 hover:text-[#1E2A35]'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-[#8A7E6E] text-sm ml-auto">{filtered.length} of {students.length} clients</span>
        </div>

        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_100px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 shrink-0">
            {['Name', 'Email', 'Phone', 'Joined', 'Profile', 'Actions'].map((h) => (
              <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
            ))}
          </div>

          {loading ? (
            <div ref={containerRef} className="flex-1 min-h-0 px-6 py-12 text-center text-[#B0A898] text-sm">Loading clients…</div>
          ) : filtered.length === 0 ? (
            <div ref={containerRef} className="flex-1 min-h-0 px-6 py-12 text-center text-[#B0A898] text-sm">No clients match your search.</div>
          ) : (
            <div ref={containerRef} className="flex-1 min-h-0 divide-y divide-[#D4CDB5]/30">
              {pageStudents.map((student) => (
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
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_100px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center shrink-0 overflow-hidden">
                      <ProfileAvatar
                        src={student.photo}
                        initials={clientInitials(student.name)}
                        alt=""
                        className="h-full w-full"
                        initialsClassName="text-[#5e4a30] text-xs font-bold"
                      />
                    </div>
                    <span className="text-[#1E2A35] text-sm font-semibold truncate">{student.name}</span>
                  </div>

                  <span className="text-[#8A7E6E] text-sm truncate">{student.email}</span>
                  <span className="text-[#5A5048] text-sm truncate">{student.phone || '—'}</span>
                  <span className="text-[#5A5048] text-sm">{student.joinDate}</span>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${student.profileComplete ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#EDE8D8] text-[#8A7E6E] border border-[#D4CDB5]/60'}`}>
                    {student.profileComplete ? 'Complete' : 'Incomplete'}
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
                          onClick={() => void handleDelete(student.id)}
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

        <AdminTablePagination
          page={currentPage}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          total={filtered.length}
          noun="clients"
          onPageChange={setPage}
        />
      </div>
      </div>

      {viewingStudent && (
        <ClientProfileModal student={viewingStudent} onClose={() => setViewingStudent(null)} />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
              >
                Edit Client
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

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+63 917 000 0000" className={inputClass} />
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Nationality</label>
                <input type="text" value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} placeholder="Filipino" className={inputClass} />
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="City, Metro Manila" className={inputClass} />
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
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-60"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
