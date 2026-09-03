import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X, ChevronDown, KeyRound, ShieldOff, Archive, AlertTriangle, Mail, Phone, UserCheck, Globe, Check, Pencil, Trash2, LayoutGrid, List } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { CARD_HOVER_GROW } from '../../lib/motion-classes';
import { NATIONALITIES } from '../data/nationalities';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import {
  createStaffAccount,
  deleteManagedAccount,
  fetchCoachDisciplineMap,
  fetchStaffDirectoryAccounts,
  isStaffMemberLockedForAdmin,
  staffRowToListItem,
  updateStaffAccountFromForm,
  withBucketProfileImages,
  type StaffDirectoryAccountRole,
} from '../../lib/admin-service';
import { fetchDisciplinesForAdmin, type DisciplineDisplay } from '../../lib/discipline-service';
import type { StaffUserRole } from '../../lib/database.types';
import { STAFF_USER_ROLES } from '../../lib/database.types';

// ── Types & Data ───────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'Coach' | 'Administrator' | 'Dev' | 'Admin' | 'Front Desk' | 'Marketing';
  specialty: string;
  disciplineIds: string[];
  disciplineNames: string[];
  status: 'active' | 'inactive';
  accountRole: StaffDirectoryAccountRole;
  photo: string;
  coverImage: string;
  bio: string;
  experience: string;
  phone: string;
  nationality: string;
}

const STAFF_TYPE_OPTIONS: { value: StaffUserRole; label: string }[] = [
  { value: 'coach', label: 'Coach' },
  { value: 'admin', label: 'Admin' },
  { value: 'dev', label: 'Dev' },
  { value: 'frontdesk', label: 'Front Desk' },
  { value: 'marketing', label: 'Marketing' },
];

const STAFF_ACCENT: Record<StaffMember['role'], string> = {
  Coach: '#c49a3c',
  Administrator: '#3A4A5A',
  Admin: '#1E2A35',
  Dev: '#6D28D9',
  'Front Desk': '#3A4A5A',
  Marketing: '#B86A4A',
};

type StaffViewMode = 'list' | 'card';

const EMPTY_FORM = {
  name: '',
  email: '',
  staffRole: 'coach' as StaffUserRole,
  nationality: '',
  disciplineIds: [] as string[],
  status: 'active' as 'active' | 'inactive',
  password: '',
};

function accountRoleToStaffRole(role: StaffDirectoryAccountRole): StaffUserRole {
  return STAFF_USER_ROLES.includes(role as StaffUserRole) ? (role as StaffUserRole) : 'coach';
}

function staffInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function DisciplineMultiSelect({
  disciplines,
  selectedIds,
  onToggle,
  selectClass,
}: {
  disciplines: DisciplineDisplay[];
  selectedIds: string[];
  onToggle: (disciplineId: string) => void;
  selectClass: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selectedNames = selectedIds
    .map((id) => disciplines.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  const triggerLabel =
    selectedNames.length === 0
      ? 'Select disciplines…'
      : selectedNames.length <= 2
        ? selectedNames.join(', ')
        : `${selectedNames.length} disciplines selected`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`${selectClass} w-full text-left flex items-center justify-between gap-2 ${selectedIds.length === 0 ? 'text-[#C0B8A8]' : ''}`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          size={14}
          className={`text-[#B0A898] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full z-[60] mt-1.5 max-h-44 overflow-y-auto rounded-2xl border border-[#D4CDB5]/70 bg-white p-1.5 shadow-lg"
        >
          {disciplines.map((discipline) => {
            const selected = selectedIds.includes(discipline.id);
            return (
              <button
                key={discipline.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onToggle(discipline.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? 'bg-[#c49a3c]/12 text-[#1E2A35]'
                    : 'hover:bg-[#F8F3E8] text-[#5A5048]'
                }`}
              >
                <span className="text-sm font-semibold truncate">{discipline.name}</span>
                {selected && <Check size={14} className="text-[#c49a3c] shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedIds.map((id) => {
            const name = disciplines.find((item) => item.id === id)?.name ?? id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onToggle(id)}
                className="inline-flex items-center gap-1 rounded-full border border-[#D4CDB5]/70 bg-white px-2.5 py-1 text-xs font-semibold text-[#1E2A35] hover:border-red-200 hover:text-red-600 transition-colors"
              >
                {name}
                <X size={11} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StaffPhotoModal({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);
  const accent = STAFF_ACCENT[member.role];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of ${member.name}`}
    >
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#8A7E6E] shadow-md transition-all hover:bg-[#F8F3E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
        >
          <X size={16} />
        </button>
        <div className="overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl">
          {member.photo && !imgError ? (
            <img
              src={member.photo}
              alt={member.name}
              className="aspect-square w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="flex aspect-square w-full items-center justify-center"
              style={{ backgroundColor: `${accent}18` }}
            >
              <span
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: '4rem',
                  letterSpacing: '0.08em',
                  color: accent,
                }}
              >
                {staffInitials(member.name)}
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-white/80">{member.name}</p>
      </div>
    </div>
  );
}

function StaffSummaryModal({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const accent = STAFF_ACCENT[member.role];
  const initials = staffInitials(member.name);
  const disciplines = member.disciplineNames.length > 0
    ? member.disciplineNames
    : member.specialty !== '—'
      ? member.specialty.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

  return (
    <>
      {photoOpen && <StaffPhotoModal member={member} onClose={() => setPhotoOpen(false)} />}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Staff summary for ${member.name}`}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <div className="relative h-36 md:h-40 overflow-hidden" style={{ backgroundColor: `${accent}20` }}>
              {member.coverImage ? (
                <img src={member.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}35 0%, ${accent}08 100%)` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/50"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
            </div>

            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label={`View photo of ${member.name}`}
              className="absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg transition-all hover:brightness-95 hover:ring-2 hover:ring-[#c49a3c]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c] active:scale-[0.98] cursor-pointer"
            >
              {member.photo && !imgError ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
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
              )}
            </button>
          </div>

          <div className="border-b border-[#D4CDB5]/50 px-6 pb-5 pt-14 md:px-8 md:pt-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2
                  className="text-[#1E2A35] leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: '0.04em' }}
                >
                  {member.name}
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-[#8A7E6E]">{member.role}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {member.experience && member.experience !== 'Administrator' && (
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${accent}18`, color: accent }}
                    >
                      {member.experience}
                    </span>
                  )}
                  {member.nationality.trim() && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#D4CDB5]/60 bg-[#F8F3E8] px-2.5 py-1 text-xs font-medium text-[#5A5048]">
                      <Globe size={11} className="text-[#c49a3c]" />
                      {member.nationality}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                      member.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60'
                    }`}
                  >
                    {member.status}
                  </span>
                </div>
              </div>
              {disciplines.length > 0 && (
                <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                  {disciplines.map((discipline) => (
                    <span
                      key={discipline}
                      className="rounded-full px-3 py-1 text-xs font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {discipline}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="px-8 py-6 grid md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto pb-8">
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">About</p>
                <p className="text-[#5A5048] text-sm leading-relaxed">
                  {member.bio.trim() || 'No bio provided yet.'}
                </p>
              </div>

              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Contact</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                    <Mail size={13} className="text-[#c49a3c] shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                    <Phone size={13} className="text-[#c49a3c] shrink-0" />
                    <span>{member.phone.trim() || 'No phone on file'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                    <Globe size={13} className="text-[#c49a3c] shrink-0" />
                    <span>{member.nationality.trim() || 'No nationality on file'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Discipline</p>
                {disciplines.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {disciplines.map((discipline) => (
                      <span
                        key={discipline}
                        className="px-3 py-1 rounded-full text-xs font-medium border border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#5A5048]"
                      >
                        {discipline}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#5A5048] text-sm">No disciplines tagged.</p>
                )}
              </div>

              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Account</p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                    <div className="w-1 h-1 rounded-full bg-[#c49a3c] shrink-0" />
                    Staff type: {member.role}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                    <div className="w-1 h-1 rounded-full bg-[#c49a3c] shrink-0" />
                    Status: {member.status}
                  </div>
                  {member.experience && member.experience !== 'Administrator' && (
                    <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                      <div className="w-1 h-1 rounded-full bg-[#c49a3c] shrink-0" />
                      Experience: {member.experience}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<StaffViewMode>('list');
  const [page, setPage] = useState(1);
  const { containerRef, pageSize } = useFitPageSize({
    layout: viewMode === 'card' ? 'staff-card' : 'table',
    fallback: viewMode === 'card' ? 6 : 8,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    const [rows, disciplinesResult] = await Promise.all([
      fetchStaffDirectoryAccounts(),
      fetchDisciplinesForAdmin(),
    ]);
    setDisciplines(disciplinesResult.data.filter((item) => item.status.slug === 'active'));

    const disciplineNamesById = new Map(
      disciplinesResult.data.map((item) => [item.id, item.name]),
    );
    const coachIds = rows
      .filter((row) => row.account.role === 'coach')
      .map((row) => row.account.id);
    const coachDisciplineMap = await fetchCoachDisciplineMap(coachIds);

    setStaff(
      await Promise.all(
        rows.map((row) =>
          withBucketProfileImages(
            staffRowToListItem(
              row,
              disciplineNamesById,
              coachDisciplineMap.get(row.account.id) ?? [],
            ),
            row.account.auth_user_id,
          ),
        ),
      ),
    );
    setStaffLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void loadStaff();
  }, [adminUser, loadStaff]);

  const filtered = useMemo(() => staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.specialty.toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, viewMode]);

  if (!adminUser) return null;

  // Open Add
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setShowModal(true);
  };

  // Open Edit
  const openEdit = (member: StaffMember) => {
    if (isStaffMemberLockedForAdmin(member, adminUser?.role)) return;
    setForm({
      name: member.name,
      email: member.email,
      staffRole: accountRoleToStaffRole(member.accountRole),
      nationality: member.nationality,
      disciplineIds: [...member.disciplineIds],
      status: member.status,
      password: '',
    });
    setEditingId(member.id);
    setFormError('');
    setShowModal(true);
  };

  const toggleDiscipline = (disciplineId: string) => {
    setForm((current) => {
      const selected = current.disciplineIds.includes(disciplineId);
      return {
        ...current,
        disciplineIds: selected
          ? current.disciplineIds.filter((id) => id !== disciplineId)
          : [...current.disciplineIds, disciplineId],
      };
    });
  };

  // Save
  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    if (editingId === null && !form.password.trim()) {
      setFormError('Password is required for new accounts.');
      return;
    }
    if (editingId === null && form.password.trim().length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (form.staffRole === 'coach' && form.disciplineIds.length < 1) {
      setFormError('Select at least one discipline for coaches.');
      return;
    }

    setSaving(true);
    setFormError('');

    const selectedNames = form.disciplineIds
      .map((id) => disciplines.find((item) => item.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    const specialtyLabel = selectedNames[0] ?? '';

    if (editingId !== null) {
      const result = await updateStaffAccountFromForm(editingId, {
        name: form.name.trim(),
        email: form.email.trim(),
        specialty: specialtyLabel,
        nationality: form.nationality,
        staffRole: form.staffRole,
        disciplineIds: form.disciplineIds,
      });
      setSaving(false);
      if (!result.ok) {
        setFormError(result.error || 'Failed to update staff account.');
        return;
      }
    } else {
      const result = await createStaffAccount({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        specialty: specialtyLabel,
        nationality: form.nationality,
        staffRole: form.staffRole,
        disciplineIds: form.disciplineIds,
      });
      setSaving(false);
      if (!result.ok) {
        setFormError(result.error || 'Failed to create staff account.');
        return;
      }
    }

    await loadStaff();
    setShowModal(false);
  };

  // Delete
  const handleDelete = async (id: string) => {
    const result = await deleteManagedAccount(id);
    if (!result.ok) {
      setFormError(result.error || 'Failed to delete staff account.');
      setDeleteId(null);
      return;
    }
    await loadStaff();
    setDeleteId(null);
  };

  const inputClass = "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <>
      <div className={pageTab === 'staff' ? 'h-full min-h-0 overflow-hidden flex flex-col' : undefined}>
      <div className={`max-w-7xl mx-auto px-6 py-8 w-full ${pageTab === 'staff' ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCheck size={14} className="text-[#c49a3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Staffing</span>
            </div>
            <h1
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}
            >
              Staffing Management
            </h1>
          </div>
          {pageTab === 'staff' && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
            >
              <Plus size={16} className="shrink-0" />
              <span>Add Staff</span>
            </button>
          )}
        </div>

        {/* ── Page Tabs ── */}
        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm mb-6 w-fit shrink-0">
          {([['staff', 'Staffing Accounts'], ['logs', 'Account Logs']] as const).map(([id, label]) => (
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
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Search + View toggle + Count */}
            <div className="flex items-center gap-4 mb-5 flex-wrap shrink-0">
              <div className="relative flex-1 max-w-sm min-w-[200px]">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or discipline…"
                  className="w-full h-[42px] pl-10 pr-4 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]"
                />
              </div>
              <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm h-[42px] shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    viewMode === 'list' ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                  }`}
                >
                  <List size={13} /> List
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  aria-label="Card view"
                  aria-pressed={viewMode === 'card'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    viewMode === 'card' ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
                  }`}
                >
                  <LayoutGrid size={13} /> Card
                </button>
              </div>
              <span className="text-[#8A7E6E] text-sm ml-auto">{filtered.length} of {staff.length} staff</span>
            </div>

            {staffLoading ? (
              <div ref={containerRef} className="flex-1 min-h-0 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm px-6 py-12 text-center text-[#B0A898] text-sm">
                Loading staff accounts…
              </div>
            ) : filtered.length === 0 ? (
              <div ref={containerRef} className="flex-1 min-h-0 bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm px-6 py-12 text-center text-[#B0A898] text-sm">
                No staff members match your search.
              </div>
            ) : viewMode === 'card' ? (
              <div
                ref={containerRef}
                className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 content-start overflow-hidden"
              >
                {pageStaff.map((member) => {
                  const accent = STAFF_ACCENT[member.role];
                  const actionsLocked = isStaffMemberLockedForAdmin(member, adminUser?.role);
                  const disciplineLabels = member.disciplineNames.length > 0
                    ? member.disciplineNames
                    : member.specialty !== '—'
                      ? member.specialty.split(',').map((item) => item.trim()).filter(Boolean)
                      : [];

                  return (
                    <div
                      key={member.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedMember(member)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedMember(member);
                        }
                      }}
                      className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#c49a3c]/30 transition-all cursor-pointer"
                    >
                      <div className="relative h-28 overflow-hidden" style={{ backgroundColor: `${accent}15` }}>
                        {member.coverImage ? (
                          <img src={member.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}30 0%, ${accent}08 100%)` }} />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accent }} />
                        <div className="absolute top-3 right-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              member.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-white/80 text-[#8A7E6E] border-[#D4CDB5]/60'
                            }`}
                          >
                            {member.status}
                          </span>
                        </div>
                      </div>

                      <div className="px-5 pb-5 -mt-8 relative">
                        <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-[#F8F3E8] flex items-center justify-center mb-3">
                          {member.photo ? (
                            <img src={member.photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span
                              className="font-bold"
                              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.06em', color: accent }}
                            >
                              {staffInitials(member.name)}
                            </span>
                          )}
                        </div>

                        <h3
                          className="text-[#1E2A35] leading-none mb-0.5"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.04em' }}
                        >
                          {member.name}
                        </h3>
                        <p className="text-[#8A7E6E] text-xs font-semibold mb-1">{member.role}</p>
                        <p className="text-[#B0A898] text-xs mb-3 truncate">{member.email}</p>

                        {disciplineLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {disciplineLabels.slice(0, 3).map((discipline) => (
                              <span
                                key={discipline}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: accent }}
                              >
                                {discipline}
                              </span>
                            ))}
                            {disciplineLabels.length > 3 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDE8D8] text-[#5A5048]">
                                +{disciplineLabels.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[#B0A898] text-xs mb-4">No disciplines tagged</p>
                        )}

                        <div
                          className="flex items-center gap-1.5 pt-3 border-t border-[#D4CDB5]/40"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {actionsLocked ? (
                            <span className="text-[#B0A898] text-xs italic">Protected</span>
                          ) : deleteId === member.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDelete(member.id)}
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
                                onClick={() => openEdit(member)}
                                aria-label={`Edit ${member.name}`}
                                className="h-8 w-8 rounded-lg bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 flex items-center justify-center hover:bg-[#EDE8D8] hover:text-[#1E2A35] active:scale-95 transition-all"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteId(member.id)}
                                aria-label={`Delete ${member.name}`}
                                className="h-8 w-8 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_150px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 shrink-0">
                  {['Name', 'Email', 'Role', 'Discipline', 'Status', 'Actions'].map((h) => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>

                <div ref={containerRef} className="flex-1 min-h-0 divide-y divide-[#D4CDB5]/30 overflow-hidden">
                  {pageStaff.map((member) => {
                    const actionsLocked = isStaffMemberLockedForAdmin(member, adminUser?.role);

                    return (
                      <div
                        key={member.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMember(member)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedMember(member);
                          }
                        }}
                        className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_150px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#1E2A35]/08 border border-[#1E2A35]/12 flex items-center justify-center shrink-0 overflow-hidden">
                            {member.photo ? (
                              <img src={member.photo} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[#1E2A35] text-xs font-bold">{staffInitials(member.name)}</span>
                            )}
                          </div>
                          <span className="text-[#1E2A35] text-sm font-semibold truncate">{member.name}</span>
                        </div>
                        <span className="text-[#8A7E6E] text-sm truncate">{member.email}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
                          member.role === 'Dev' ? 'bg-violet-50 text-violet-700 border border-violet-200' :
                          member.role === 'Admin' || member.role === 'Front Desk' || member.role === 'Marketing'
                            ? 'bg-[#1E2A35]/10 text-[#1E2A35] border border-[#1E2A35]/15' :
                          member.role === 'Administrator' ? 'bg-[#3A4A5A]/10 text-[#3A4A5A]' :
                          'bg-[#c49a3c]/12 text-[#a67f2e]'
                        }`}>{member.role}</span>
                        <span className="text-[#5A5048] text-sm truncate">{member.specialty}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${member.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-[#EDE8D8] text-[#8A7E6E] border border-[#D4CDB5]/60'}`}>{member.status}</span>
                        <div className="flex items-center gap-1 w-[150px]" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          {actionsLocked ? (
                            <span className="text-[#B0A898] text-xs italic">Protected</span>
                          ) : deleteId === member.id ? (
                            <>
                              <span className="text-red-600 text-xs font-semibold whitespace-nowrap mr-1">Delete?</span>
                              <button onClick={() => handleDelete(member.id)} className="h-7 px-2.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 active:scale-95 transition-all whitespace-nowrap">Yes</button>
                              <button onClick={() => setDeleteId(null)} className="h-7 px-2.5 bg-white border border-[#D4CDB5]/70 text-[#8A7E6E] text-xs rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all whitespace-nowrap">No</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => openEdit(member)} className="h-7 px-2.5 bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 text-xs font-medium rounded-lg hover:bg-[#EDE8D8] active:scale-95 transition-all whitespace-nowrap">Edit</button>
                              <button onClick={() => setDeleteId(member.id)} className="h-7 px-2.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 active:scale-95 transition-all whitespace-nowrap">Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <AdminTablePagination
              page={currentPage}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={filtered.length}
              noun="staff"
              onPageChange={setPage}
            />
          </div>
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
              <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
                <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center gap-2">
                  <KeyRound size={14} className="text-[#c49a3c]" />
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
              <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
                <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center gap-2">
                  <ShieldOff size={14} className="text-[#c49a3c]" />
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
              <div className={`bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden ${CARD_HOVER_GROW}`}>
                <div className="px-6 py-4 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <h2 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}>Deletion / Deactivation Requests</h2>
                  </div>
                  <span className="text-[#8A7E6E] text-xs">{deletionReqs.filter(r => r.status === 'pending').length} pending</span>
                </div>
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_150px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/40 bg-[#F8F3E8]/40">
                  {['Account', 'Email', 'Type', 'Requested', 'Status', 'Actions'].map(h => (
                    <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
                  ))}
                </div>
                <div className="divide-y divide-[#D4CDB5]/30">
                  {deletionReqs.map(req => (
                    <div key={req.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.2fr)_150px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px]">
                      <p className="text-[#1E2A35] text-sm font-semibold truncate">{req.account}</p>
                      <p className="text-[#8A7E6E] text-sm truncate">{req.email}</p>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EDE8D8] text-[#5A5048] border border-[#D4CDB5]/60 w-fit">{req.type}</span>
                      <p className="text-[#8A7E6E] text-sm">{req.requestedAt}</p>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
                        req.status === 'pending'  ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        req.status === 'approved' || req.status === 'archived' ? 'bg-[#EDE8D8] text-[#5A5048] border border-[#D4CDB5]/60' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {req.status === 'archived' ? '✓ Archived' : req.status}
                      </span>
                      <div className="flex items-center gap-1 w-[150px]">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => setDeletionReqs(prev => prev.map(r => r.id === req.id ? { ...r, status: 'archived' } : r))}
                              className="h-7 px-2.5 bg-[#EDE8D8] text-[#5A5048] text-xs font-bold rounded-lg hover:bg-[#E3DCC8] active:scale-95 transition-all whitespace-nowrap"
                            >
                              Archive
                            </button>
                            <button
                              onClick={() => setDeletionReqs(prev => prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r))}
                              className="h-7 px-2.5 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-100 active:scale-95 transition-all whitespace-nowrap"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {selectedMember && (
        <StaffSummaryModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

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

              {/* Nationality */}
              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Nationality</label>
                <div className="relative">
                  <select
                    value={form.nationality}
                    onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                    className={`${selectClass} ${!form.nationality ? 'text-[#C0B8A8]' : ''}`}
                  >
                    <option value="">Select nationality…</option>
                    {NATIONALITIES.map((item) => (
                      <option key={item} value={item} className="text-[#1E2A35]">
                        {item}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898] pointer-events-none" />
                </div>
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

              {/* Staff type + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Staff Type</label>
                  <div className="relative">
                    <select
                      value={form.staffRole}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          staffRole: e.target.value as StaffUserRole,
                          disciplineIds: e.target.value === 'coach' ? f.disciplineIds : [],
                        }))
                      }
                      className={selectClass}
                    >
                      {STAFF_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
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

              {/* Discipline multi-select (coaches only) */}
              {form.staffRole === 'coach' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest">Discipline</label>
                    <span className="text-[#B0A898] text-xs">{form.disciplineIds.length} selected</span>
                  </div>
                  {disciplines.length === 0 ? (
                    <p className="text-[#B0A898] text-sm px-1 py-2">No active disciplines found.</p>
                  ) : (
                    <DisciplineMultiSelect
                      disciplines={disciplines}
                      selectedIds={form.disciplineIds}
                      onToggle={toggleDiscipline}
                      selectClass={selectClass}
                    />
                  )}
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
                className="flex-1 py-3 rounded-full border border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-300 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.95rem' }}
              >
                {saving ? 'Saving…' : editingId !== null ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}