import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X, ChevronDown, Mail, Phone, UserCheck, Check, Pencil, Trash2, LayoutGrid, List } from 'lucide-react';
import { SearchableIdSelect } from '../components/SearchableIdSelect';
import { useAdminUrlSearchFilter } from '../hooks/useAdminUrlSearchFilter';
import { toast } from 'sonner';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PortalTitleToolbar } from '../context/PortalChromeContext';
import { CategorizedAddFilter, matchesAnySelected } from '../components/filters/CategorizedAddFilter';
import { ACCOUNT_STATUS_FILTER_GROUP } from '../components/filters/status-filter-groups';
import { AdminTablePagination, useFitPageSize } from '../components/layout/AdminTablePagination';
import {
  AlphabeticalSortSelect,
  sortAlphabetically,
  type AlphabeticalOrder,
} from '../components/layout/ChronologicalSortSelect';
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

const DELETE_CONFIRM_WORD = 'delete';

function staffDeleteDialogCopy(member: Pick<StaffMember, 'accountRole'>) {
  if (member.accountRole === 'coach') {
    return { title: 'Delete coach account?', removedFrom: 'coaches' as const };
  }
  return { title: 'Delete staff account?', removedFrom: 'staffing' as const };
}

const STAFF_TYPE_OPTIONS: { value: StaffUserRole; label: string }[] = [
  { value: 'coach', label: 'Coach' },
  { value: 'admin', label: 'Admin' },
  { value: 'frontdesk', label: 'Front Desk' },
  { value: 'marketing', label: 'Marketing' },
];

/** Roles admins may assign when editing (matches DB RLS in 065_admin_edit_staff_directory). */
const STAFF_TYPE_OPTIONS_ADMIN_EDIT: { value: StaffUserRole; label: string }[] = [
  { value: 'coach', label: 'Coach' },
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
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '4rem',
                  letterSpacing: '0.04em',
                  color: accent }}
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
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
                      letterSpacing: '0.04em',
                      color: accent }}
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

export default function AdminStaffPage() {
  const navigate = useNavigate();
  const { adminUser } = useAdminAuth();
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [alphaOrder, setAlphaOrder] = useState<AlphabeticalOrder>('az');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useAdminUrlSearchFilter();
  const [viewMode, setViewMode] = useState<StaffViewMode>('list');
  const [page, setPage] = useState(1);
  const { containerRef, pageSize } = useFitPageSize({
    layout: viewMode === 'card' ? 'staff-card' : 'table',
    fallback: viewMode === 'card' ? 6 : 8,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
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

  const staffFilterGroups = useMemo(
    () => [
      ACCOUNT_STATUS_FILTER_GROUP,
      {
        id: 'role',
        label: 'Role',
        options: [...new Set(staff.map((member) => member.role))].sort().map((role) => ({
          value: role,
          label: role,
        })),
      },
    ],
    [staff],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const matched = staff.filter((s) =>
      (s.name.toLowerCase().includes(q)
        || s.email.toLowerCase().includes(q)
        || s.specialty.toLowerCase().includes(q))
      && matchesAnySelected(statusFilters, s.status)
      && matchesAnySelected(roleFilters, s.role),
    );
    return sortAlphabetically(matched, (s) => s.name, alphaOrder);
  }, [staff, search, statusFilters, roleFilters, alphaOrder]);

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
  }, [search, viewMode, statusFilters, roleFilters, alphaOrder]);

  useEffect(() => {
    setDeleteConfirmInput('');
  }, [deleteTarget?.id]);

  const deleteConfirmReady =
    deleteConfirmInput.trim().toLowerCase() === DELETE_CONFIRM_WORD;

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

  const staffTypeOptionsForModal =
    editingId !== null && adminUser?.role !== 'dev'
      ? STAFF_TYPE_OPTIONS_ADMIN_EDIT
      : STAFF_TYPE_OPTIONS;

  const staffTypeSelectOptions = useMemo(
    () =>
      staffTypeOptionsForModal.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [staffTypeOptionsForModal],
  );

  const statusSelectOptions = useMemo(
    () => [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    [],
  );

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
    if (
      editingId !== null
      && adminUser?.role !== 'dev'
      && (form.staffRole === 'admin' || form.staffRole === 'dev')
    ) {
      setFormError('Only a dev can assign Admin or Dev roles when editing.');
      return;
    }

    setSaving(true);
    setFormError('');

    const selectedNames = form.disciplineIds
      .map((id) => disciplines.find((item) => item.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    const specialtyLabel = selectedNames[0] ?? '';
    const savedName = form.name.trim();

    try {
    if (editingId !== null) {
      const result = await updateStaffAccountFromForm(editingId, {
          name: savedName,
        email: form.email.trim(),
          specialty: specialtyLabel,
          staffRole: form.staffRole,
          disciplineIds: form.disciplineIds,
          status: form.status,
        });
      if (!result.ok) {
          const message = result.error || 'Failed to update staff account.';
          setFormError(message);
          toast.error(message);
        return;
      }
        await loadStaff();
        setShowModal(false);
        toast.success(`Staff profile updated for ${savedName}.`);
        return;
      }

      const result = await createStaffAccount({
        email: form.email.trim(),
        password: form.password,
        name: savedName,
        specialty: specialtyLabel,
        staffRole: form.staffRole,
        disciplineIds: form.disciplineIds,
        status: form.status,
      });
      if (!result.ok) {
        const message = result.error || 'Failed to create staff account.';
        setFormError(message);
        toast.error(message);
        return;
      }
    await loadStaff();
    setShowModal(false);
      toast.success(`Staff account created for ${savedName}.`);
    } catch {
      const message = 'Something went wrong while saving. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (member: StaffMember) => {
    if (isStaffMemberLockedForAdmin(member, adminUser?.role)) return;
    setDeleteTarget(member);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !deleteConfirmReady || deleting) return;

    const deletedName = deleteTarget.name;
    const { removedFrom } = staffDeleteDialogCopy(deleteTarget);
    setDeleting(true);
    const result = await deleteManagedAccount(deleteTarget.id);
    setDeleting(false);

    if (!result.ok) {
      toast.error(
        result.error
          || `Could not delete this ${deleteTarget.accountRole === 'coach' ? 'coach' : 'staff'} account. Try again or contact support.`,
      );
      return;
    }

    if (selectedMember?.id === deleteTarget.id) {
      setSelectedMember(null);
    }
    setDeleteTarget(null);
    setDeleteConfirmInput('');
    await loadStaff();
    toast.success(`Account deleted. ${deletedName} was removed from ${removedFrom} and auth.`);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <>
      <div className="h-full min-h-0 overflow-hidden flex flex-col">
      <div className="max-w-8xl mx-auto px-6 pb-8 pt-1 w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        <PortalTitleToolbar>
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
          <CategorizedAddFilter
            groups={staffFilterGroups}
            selected={{ status: statusFilters, role: roleFilters }}
            onChange={(next) => {
              setStatusFilters(next.status ?? []);
              setRoleFilters(next.role ?? []);
            }}
          />
          <AlphabeticalSortSelect value={alphaOrder} onChange={setAlphaOrder} />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="text-[#8A7E6E] text-sm whitespace-nowrap">
              {filtered.length} of {staff.length} staff
            </span>
            <button
              type="button"
              onClick={openAdd}
              className="action-button flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm leading-none"
            >
              <Plus size={16} className="shrink-0" />
              <span>Add Staff</span>
            </button>
          </div>
        </PortalTitleToolbar>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

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
                              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.05em', color: accent }}
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
                                onClick={() => openDeleteConfirm(member)}
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
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_100px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60 shrink-0">
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
                        className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_100px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] cursor-pointer"
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
                        <div
                          className="flex items-center gap-1.5 w-[100px]"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                        {actionsLocked ? (
                          <span className="text-[#B0A898] text-xs italic">Protected</span>
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
                                onClick={() => openDeleteConfirm(member)}
                                aria-label={`Delete ${member.name}`}
                                className="h-8 w-8 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
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
        </div>
      </div>

      {selectedMember && (
        <StaffSummaryModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      {deleteTarget && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => {
              if (!deleting) setDeleteTarget(null);
            }}
            role="presentation"
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-staff-title"
              aria-describedby="delete-staff-desc"
              className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50">
                <h3
                  id="delete-staff-title"
                  className="text-[#1E2A35]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
                >
                  {staffDeleteDialogCopy(deleteTarget).title}
                </h3>
              </div>
              <div className="px-7 py-5 flex flex-col gap-4">
                <p id="delete-staff-desc" className="text-[#5A5048] text-sm leading-relaxed">
                  This permanently removes{' '}
                  <span className="font-semibold text-[#1E2A35]">{deleteTarget.name}</span>
                  {' '}({deleteTarget.email}) and their profile data. This cannot be undone.
                </p>
                <div>
                  <label htmlFor="delete-staff-confirm" className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                    Type <span className="font-bold text-[#1E2A35] normal-case tracking-normal">{DELETE_CONFIRM_WORD}</span> to confirm
                  </label>
                  <input
                    id="delete-staff-confirm"
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={deleting}
                    placeholder={DELETE_CONFIRM_WORD}
                    className="w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all placeholder-[#C0B8A8] disabled:opacity-60"
                  />
                </div>
              </div>
              <div className="px-7 pb-7 flex items-center gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm font-medium hover:bg-[#EDE8D8] transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting || !deleteConfirmReady}
                  onClick={() => void handleConfirmDelete()}
                  className="flex-1 py-3 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 active:scale-[0.97] transition-all disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </div>
          </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.04em' }}
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

              {/* Staff type + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Staff Type</label>
                  <SearchableIdSelect
                    value={form.staffRole}
                    onChange={(staffRole) =>
                      setForm((f) => ({
                        ...f,
                        staffRole: staffRole as StaffUserRole,
                        disciplineIds: staffRole === 'coach' ? f.disciplineIds : [],
                      }))
                    }
                    options={staffTypeSelectOptions}
                    placeholder="Select type…"
                    searchable={false}
                    clearable={false}
                    emptyText="No roles."
                  />
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Status</label>
                  <SearchableIdSelect
                      value={form.status}
                    onChange={(status) =>
                      setForm((f) => ({
                        ...f,
                        status: (status || 'active') as 'active' | 'inactive',
                      }))
                    }
                    options={statusSelectOptions}
                    placeholder="Select status…"
                    searchable={false}
                    clearable={false}
                    emptyText="No options."
                  />
                </div>
              </div>

              {editingId === null && (
                <p className="text-[#8A7E6E] text-xs leading-relaxed -mt-1">
                  Use an existing client email to promote them to staff (e.g. Front Desk). New emails create a fresh login.
                </p>
              )}

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
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="action-button flex-1 py-3 rounded-full bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
               
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