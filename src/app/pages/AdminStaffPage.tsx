import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, Pencil, Trash2, X, Check, UserCheck, ChevronDown, KeyRound, ShieldOff, Archive, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminTopBar } from '../components/layout/AdminTopBar';

// ── Types & Data ───────────────────────────────────────────────

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: 'Coach' | 'Administrator';
  specialty: string;
  status: 'active' | 'inactive';
}

const SPECIALTIES = [
  'Calisthenics', 'Yoga', 'Animal Flow', 'Groundworks',
  'Circuit Training', 'Mat Pilates', 'Kickboxing', 'Capoeira',
  'Personal Coaching', '—',
];

const INITIAL_STAFF: StaffMember[] = [
  { id: 1, name: 'Rex Santos',    email: 'rex@balanse.com',     role: 'Coach',         specialty: 'Calisthenics',        status: 'active'   },
  { id: 2, name: 'Jodi Reyes',    email: 'jodi@balanse.com',    role: 'Coach',         specialty: 'Yoga',                status: 'active'   },
  { id: 3, name: 'Ephraim Cruz',  email: 'ephraim@balanse.com', role: 'Coach',         specialty: 'Animal Flow',         status: 'active'   },
  { id: 4, name: 'Alec Bautista', email: 'alec@balanse.com',    role: 'Coach',         specialty: 'Groundworks',         status: 'active'   },
  { id: 5, name: 'Rachelle Tan',  email: 'rachelle@balanse.com',role: 'Coach',         specialty: 'Circuit Training',    status: 'active'   },
  { id: 6, name: 'Kate Mercado',  email: 'kate@balanse.com',    role: 'Coach',         specialty: 'Mat Pilates',         status: 'active'   },
  { id: 7, name: 'Wolf Andrada',  email: 'wolf@balanse.com',    role: 'Coach',         specialty: 'Kickboxing',          status: 'active'   },
  { id: 8, name: 'Studio Admin',  email: 'admin@balanse.com',   role: 'Administrator', specialty: '—',                   status: 'active'   },
];

const EMPTY_FORM = { name: '', email: '', role: 'Coach' as 'Coach' | 'Administrator', specialty: 'Calisthenics', status: 'active' as 'active' | 'inactive', password: '' };

// ── Account Logs Data ──────────────────────────────────────────

const PASSWORD_LOGS = [
  { id: 1, account: 'Rex Santos',    email: 'rex@balanse.com',     changedBy: 'Super Admin', date: 'Apr 8, 2026',  time: '2:30 PM' },
  { id: 2, account: 'Jodi Reyes',    email: 'jodi@balanse.com',    changedBy: 'Super Admin', date: 'Mar 15, 2026', time: '10:00 AM' },
  { id: 3, account: 'Wolf Andrada',  email: 'wolf@balanse.com',    changedBy: 'Super Admin', date: 'Feb 28, 2026', time: '3:45 PM' },
];

const DEACTIVATION_LOGS = [
  { id: 1, account: 'Old Staff Member', email: 'old.staff@balanse.com', role: 'Coach', deactivatedBy: 'Super Admin', date: 'Feb 20, 2026', reason: 'Contract ended' },
  { id: 2, account: 'Temp Instructor',  email: 'temp@balanse.com',      role: 'Coach', deactivatedBy: 'Super Admin', date: 'Jan 10, 2026', reason: 'Probation period ended' },
];

interface DeletionRequest {
  id: number; account: string; email: string; type: 'Student' | 'Staff';
  requestedAt: string; status: 'pending' | 'approved' | 'archived' | 'rejected';
}

const INITIAL_DELETION_REQS: DeletionRequest[] = [
  { id: 1, account: 'Diego Tan',    email: 'diego.t@email.com',  type: 'Student', requestedAt: 'Apr 7, 2026',  status: 'pending'  },
  { id: 2, account: 'Old Account',  email: 'old@email.com',      type: 'Student', requestedAt: 'Mar 30, 2026', status: 'archived' },
];

// ── Component ──────────────────────────────────────────────────

export default function AdminStaffPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();

  const [pageTab, setPageTab]           = useState<'staff' | 'logs'>('staff');
  const [logTab, setLogTab]             = useState<'passwords' | 'deactivations' | 'deletions'>('passwords');
  const [deletionReqs, setDeletionReqs] = useState<DeletionRequest[]>(INITIAL_DELETION_REQS);
  const [staff, setStaff]               = useState<StaffMember[]>(INITIAL_STAFF);
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [formError, setFormError]       = useState('');

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  if (!adminUser) return null;

  // Filtered list
  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.specialty.toLowerCase().includes(search.toLowerCase())
  );

  // Open Add
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setShowModal(true);
  };

  // Open Edit
  const openEdit = (member: StaffMember) => {
    setForm({ name: member.name, email: member.email, role: member.role, specialty: member.specialty, status: member.status, password: '' });
    setEditingId(member.id);
    setFormError('');
    setShowModal(true);
  };

  // Save
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
      setStaff((prev) => prev.map((s) => s.id === editingId ? { ...s, ...form } : s));
    } else {
      const newMember: StaffMember = {
        id: Date.now(),
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        specialty: form.role === 'Administrator' ? '—' : form.specialty,
        status: form.status,
      };
      setStaff((prev) => [...prev, newMember]);
    }
    setShowModal(false);
  };

  // Delete
  const handleDelete = (id: number) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setDeleteId(null);
  };

  const inputClass = "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="min-h-screen bg-[#F8F3E8]">
      <AdminTopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCheck size={14} className="text-[#C49A3C]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Staff</span>
            </div>
            <h1
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}
            >
              Staff Management
            </h1>
          </div>
          {pageTab === 'staff' && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
            >
              <Plus size={16} /> Add Staff
            </button>
          )}
        </div>

        {/* ── Page Tabs ── */}
        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm mb-6 w-fit">
          {([['staff', 'Staff Accounts'], ['logs', 'Account Logs']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPageTab(id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${pageTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ══ STAFF ACCOUNTS TAB ══ */}
        {pageTab === 'staff' && (
          <>
            {/* Search + Count */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or specialty…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#C49A3C]/25 focus:border-[#C49A3C]/50 transition-all placeholder-[#C0B8A8]"
                />
              </div>
              <span className="text-[#8A7E6E] text-sm">{filtered.length} of {staff.length} staff</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
              <div className="grid grid-cols-[2fr_2.2fr_1.2fr_1.5fr_1fr_auto] gap-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
                {['Name', 'Email', 'Role', 'Specialty', 'Status', ''].map((h) => (
                  <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="px-6 py-12 text-center text-[#B0A898] text-sm">No staff members match your search.</div>
              ) : (
                <div className="divide-y divide-[#D4CDB5]/30">
                  {filtered.map((member) => (
                    <div
                      key={member.id}
                      className="grid grid-cols-[2fr_2.2fr_1.2fr_1.5fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1E2A35]/08 border border-[#1E2A35]/12 flex items-center justify-center shrink-0">
                          <span className="text-[#1E2A35] text-xs font-bold">{member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <span className="text-[#1E2A35] text-sm font-semibold truncate">{member.name}</span>
                      </div>
                      <span className="text-[#8A7E6E] text-sm truncate">{member.email}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${member.role === 'Administrator' ? 'bg-[#3A4A5A]/10 text-[#3A4A5A]' : 'bg-[#C49A3C]/12 text-[#A67E2A]'}`}>{member.role}</span>
                      <span className="text-[#5A5048] text-sm truncate">{member.specialty}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${member.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#EDE8D8] text-[#8A7E6E] border border-[#D4CDB5]/60'}`}>{member.status}</span>
                      <div className="flex items-center gap-1">
                        {deleteId === member.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-2.5 py-1.5">
                            <span className="text-red-700 text-xs font-semibold">Delete?</span>
                            <button onClick={() => handleDelete(member.id)} className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><Check size={11} /></button>
                            <button onClick={() => setDeleteId(null)} className="w-6 h-6 rounded-lg bg-white border border-[#D4CDB5]/60 flex items-center justify-center text-[#8A7E6E] hover:bg-[#EDE8D8]"><X size={11} /></button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => openEdit(member)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] transition-all" title="Edit"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteId(member.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8A7E6E] hover:text-red-600 hover:bg-red-50 transition-all" title="Delete"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ ACCOUNT LOGS TAB ══ */}
        {pageTab === 'logs' && (
          <div className="flex flex-col gap-5">
            {/* Log sub-tabs */}
            <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm w-fit">
              {([
                ['passwords', 'Password Changes', KeyRound],
                ['deactivations', 'Deactivations', ShieldOff],
                ['deletions', 'Deletion Requests', AlertTriangle],
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  onClick={() => setLogTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${logTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'}`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {/* Password Change Log */}
            {logTab === 'passwords' && (
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center gap-2">
                  <KeyRound size={14} className="text-[#C49A3C]" />
                  <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Password Change Log</h2>
                </div>
                <div className="grid grid-cols-[2fr_2.2fr_1.5fr_1.5fr] gap-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
                  {['Account', 'Email', 'Changed By', 'Date & Time'].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-[#D4CDB5]/30">
                  {PASSWORD_LOGS.map(log => (
                    <div key={log.id} className="grid grid-cols-[2fr_2.2fr_1.5fr_1.5fr] gap-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors">
                      <p className="text-[#1E2A35] text-sm font-semibold">{log.account}</p>
                      <p className="text-[#8A7E6E] text-sm">{log.email}</p>
                      <p className="text-[#5A5048] text-sm">{log.changedBy}</p>
                      <p className="text-[#8A7E6E] text-sm">{log.date} · {log.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deactivation Log */}
            {logTab === 'deactivations' && (
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center gap-2">
                  <ShieldOff size={14} className="text-[#C49A3C]" />
                  <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Account Deactivation Log</h2>
                </div>
                <div className="grid grid-cols-[2fr_2.2fr_1fr_1.5fr_2fr] gap-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
                  {['Account', 'Email', 'Role', 'Date', 'Reason'].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-[#D4CDB5]/30">
                  {DEACTIVATION_LOGS.map(log => (
                    <div key={log.id} className="grid grid-cols-[2fr_2.2fr_1fr_1.5fr_2fr] gap-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors">
                      <p className="text-[#1E2A35] text-sm font-semibold">{log.account}</p>
                      <p className="text-[#8A7E6E] text-sm">{log.email}</p>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EDE8D8] text-[#5A5048] border border-[#D4CDB5]/60 w-fit">{log.role}</span>
                      <p className="text-[#8A7E6E] text-sm">{log.date}</p>
                      <p className="text-[#5A5048] text-sm italic">{log.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deletion Requests */}
            {logTab === 'deletions' && (
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Deletion / Deactivation Requests</h2>
                  </div>
                  <span className="text-[#8A7E6E] text-xs">{deletionReqs.filter(r => r.status === 'pending').length} pending</span>
                </div>
                <div className="grid grid-cols-[2fr_2.2fr_1fr_1.5fr_1.2fr_auto] gap-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
                  {['Account', 'Email', 'Type', 'Requested', 'Status', ''].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-[#D4CDB5]/30">
                  {deletionReqs.map(req => (
                    <div key={req.id} className="grid grid-cols-[2fr_2.2fr_1fr_1.5fr_1.2fr_auto] gap-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors">
                      <p className="text-[#1E2A35] text-sm font-semibold">{req.account}</p>
                      <p className="text-[#8A7E6E] text-sm">{req.email}</p>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EDE8D8] text-[#5A5048] border border-[#D4CDB5]/60 w-fit">{req.type}</span>
                      <p className="text-[#8A7E6E] text-sm">{req.requestedAt}</p>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
                        req.status === 'pending'  ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        req.status === 'approved' || req.status === 'archived' ? 'bg-[#EDE8D8] text-[#5A5048] border border-[#D4CDB5]/60' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {req.status === 'archived' ? '✓ Archived' : req.status}
                      </span>
                      {req.status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDeletionReqs(prev => prev.map(r => r.id === req.id ? { ...r, status: 'archived' } : r))}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#EDE8D8] text-[#5A5048] text-xs font-bold rounded-xl hover:bg-[#E3DCC8] active:scale-95 transition-all"
                          >
                            <Archive size={11} /> Archive
                          </button>
                          <button
                            onClick={() => setDeletionReqs(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r))}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl hover:bg-red-100 active:scale-95 transition-all"
                          >
                            <X size={11} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
              >
                {editingId !== null ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-7 py-6 flex flex-col gap-4">

              {/* Name */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Juan dela Cruz"
                  className={inputClass}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="coach@balanse.com"
                  className={inputClass}
                />
              </div>

              {/* Password (add only) */}
              {editingId === null && (
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Set a temporary password"
                    className={inputClass}
                  />
                </div>
              )}

              {/* Role + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Role</label>
                  <div className="relative">
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'Coach' | 'Administrator', specialty: e.target.value === 'Administrator' ? '—' : f.specialty }))}
                      className={selectClass}
                    >
                      <option value="Coach">Coach</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Status</label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                      className={selectClass}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Specialty */}
              {form.role === 'Coach' && (
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Specialty</label>
                  <div className="relative">
                    <select
                      value={form.specialty}
                      onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                      className={selectClass}
                    >
                      {SPECIALTIES.filter((s) => s !== '—').map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Error */}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-7 pb-7 flex items-center gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm font-medium hover:bg-[#EDE8D8] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
              >
                {editingId !== null ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}