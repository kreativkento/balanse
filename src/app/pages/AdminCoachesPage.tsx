import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus, Search, X, ChevronDown, Mail, Phone, Award, Globe, Check, Pencil, Trash2,
  Clock, AlertOctagon, Users, LayoutGrid, List, Eye, EyeOff,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { NATIONALITIES } from '../data/nationalities';
import {
  createStaffAccount,
  deleteManagedAccount,
  fetchCoachDisciplineMap,
  fetchStaffDirectoryAccounts,
  staffRowToListItem,
  updateStaffAccountFromForm,
  withBucketProfileImages,
} from '../../lib/admin-service';
import { fetchDisciplinesForAdmin, type DisciplineDisplay } from '../../lib/discipline-service';
import { AdminCoachAvailabilityPanel } from './AdminCoachAvailabilityPage';
import { AdminAbsenceTrackerPanel } from './AdminAbsenceTrackerPage';

interface CoachMember {
  id: string;
  name: string;
  email: string;
  specialty: string;
  disciplineIds: string[];
  disciplineNames: string[];
  status: 'active' | 'inactive';
  photo: string;
  coverImage: string;
  bio: string;
  experience: string;
  phone: string;
  nationality: string;
}

const ACCENT = '#745b3c';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  middleInitial: '',
  email: '',
  nationality: '',
  disciplineIds: [] as string[],
  status: 'active' as 'active' | 'inactive',
  password: '',
};

function buildFullName(firstName: string, middleInitial: string, lastName: string) {
  return [
    firstName.trim(),
    middleInitial.trim() ? `${middleInitial.trim().replace(/\.$/, '')}.` : '',
    lastName.trim(),
  ].filter(Boolean).join(' ');
}

function parseFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleInitial: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleInitial: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleInitial: '', lastName: parts[1] };
  const maybeMi = parts[1].replace(/\.$/, '');
  if (maybeMi.length <= 2) {
    return {
      firstName: parts[0],
      middleInitial: maybeMi,
      lastName: parts.slice(2).join(' '),
    };
  }
  return { firstName: parts[0], middleInitial: '', lastName: parts.slice(1).join(' ') };
}

function coachInitials(name: string) {
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
                    ? 'bg-[#745b3c]/12 text-[#1E2A35]'
                    : 'hover:bg-[#F8F3E8] text-[#5A5048]'
                }`}
              >
                <span className="text-sm font-semibold truncate">{discipline.name}</span>
                {selected && <Check size={14} className="text-[#745b3c] shrink-0" strokeWidth={2.5} />}
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

function CoachPhotoModal({ coach, onClose }: { coach: CoachMember; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo of ${coach.name}`}
    >
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className="absolute -top-3 -right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#8A7E6E] shadow-md transition-all hover:bg-[#F8F3E8]"
        >
          <X size={16} />
        </button>
        <div className="overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl">
          {coach.photo && !imgError ? (
            <img
              src={coach.photo}
              alt={coach.name}
              className="aspect-square w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center" style={{ backgroundColor: `${ACCENT}18` }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '4rem', letterSpacing: '0.08em', color: ACCENT }}>
                {coachInitials(coach.name)}
              </span>
            </div>
          )}
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-white/80">{coach.name}</p>
      </div>
    </div>
  );
}

function CoachSummaryModal({ coach, onClose }: { coach: CoachMember; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const initials = coachInitials(coach.name);
  const disciplines = coach.disciplineNames.length > 0
    ? coach.disciplineNames
    : coach.specialty !== '—'
      ? coach.specialty.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

  return (
    <>
      {photoOpen && <CoachPhotoModal coach={coach} onClose={() => setPhotoOpen(false)} />}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`Coach profile for ${coach.name}`}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <div className="relative h-36 md:h-40 overflow-hidden" style={{ backgroundColor: `${ACCENT}20` }}>
              {coach.coverImage ? (
                <img src={coach.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${ACCENT}35 0%, ${ACCENT}08 100%)` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#8A7E6E] shadow-sm backdrop-blur-sm transition-all hover:bg-white"
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: ACCENT }} />
            </div>

            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label={`View photo of ${coach.name}`}
              className="absolute bottom-0 left-6 md:left-8 z-10 h-24 w-24 md:h-28 md:w-28 translate-y-1/2 overflow-hidden rounded-2xl border-4 border-white shadow-lg transition-all hover:brightness-95 hover:ring-2 hover:ring-[#745b3c]/40 active:scale-[0.98] cursor-pointer"
            >
              {coach.photo && !imgError ? (
                <img
                  src={coach.photo}
                  alt={coach.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${ACCENT}18` }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.08em', color: ACCENT }}>
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
                  {coach.name}
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-[#8A7E6E]">Coach</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {coach.experience.trim() && (
                    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${ACCENT}18`, color: ACCENT }}>
                      {coach.experience}
                    </span>
                  )}
                  {coach.nationality.trim() && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#D4CDB5]/60 bg-[#F8F3E8] px-2.5 py-1 text-xs font-medium text-[#5A5048]">
                      <Globe size={11} className="text-[#745b3c]" />
                      {coach.nationality}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                      coach.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-[#EDE8D8] text-[#8A7E6E] border-[#D4CDB5]/60'
                    }`}
                  >
                    {coach.status}
                  </span>
                </div>
              </div>
              {disciplines.length > 0 && (
                <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                  {disciplines.map((discipline) => (
                    <span key={discipline} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: ACCENT }}>
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
                  {coach.bio.trim() || 'No bio provided yet.'}
                </p>
              </div>
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Contact</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                    <Mail size={13} className="text-[#745b3c] shrink-0" />
                    <span className="truncate">{coach.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                    <Phone size={13} className="text-[#745b3c] shrink-0" />
                    <span>{coach.phone.trim() || 'No phone on file'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#5A5048]">
                    <Globe size={13} className="text-[#745b3c] shrink-0" />
                    <span>{coach.nationality.trim() || 'No nationality on file'}</span>
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
                    <div className="w-1 h-1 rounded-full bg-[#745b3c] shrink-0" />
                    Role: Coach
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                    <div className="w-1 h-1 rounded-full bg-[#745b3c] shrink-0" />
                    Status: {coach.status}
                  </div>
                  {coach.experience.trim() && (
                    <div className="flex items-center gap-2 text-xs text-[#5A5048]">
                      <div className="w-1 h-1 rounded-full bg-[#745b3c] shrink-0" />
                      Experience: {coach.experience}
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

export default function AdminCoachesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { adminUser } = useAdminAuth();

  const tabParam = searchParams.get('tab');
  const pageTab: 'coaches' | 'availability' | 'absence' =
    tabParam === 'availability' || tabParam === 'absence' ? tabParam : 'coaches';

  const setPageTab = (tab: 'coaches' | 'availability' | 'absence') => {
    if (tab === 'coaches') setSearchParams({}, { replace: true });
    else setSearchParams({ tab }, { replace: true });
  };

  const [coaches, setCoaches] = useState<CoachMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [disciplines, setDisciplines] = useState<DisciplineDisplay[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<CoachMember | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  const loadCoaches = useCallback(async () => {
    setLoading(true);
    const [rows, disciplinesResult] = await Promise.all([
      fetchStaffDirectoryAccounts(),
      fetchDisciplinesForAdmin(),
    ]);
    setDisciplines(disciplinesResult.data.filter((item) => item.status.slug === 'active'));

    const disciplineNamesById = new Map(
      disciplinesResult.data.map((item) => [item.id, item.name]),
    );
    const coachRows = rows.filter((row) => row.account.role === 'coach');
    const coachDisciplineMap = await fetchCoachDisciplineMap(coachRows.map((row) => row.account.id));

    setCoaches(
      await Promise.all(
        coachRows.map(async (row) => {
          const item = await withBucketProfileImages(
            staffRowToListItem(
              row,
              disciplineNamesById,
              coachDisciplineMap.get(row.account.id) ?? [],
            ),
            row.account.auth_user_id,
          );
          return {
            id: item.id,
            name: item.name,
            email: item.email,
            specialty: item.specialty,
            disciplineIds: item.disciplineIds,
            disciplineNames: item.disciplineNames,
            status: item.status,
            photo: item.photo,
            coverImage: item.coverImage,
            bio: item.bio,
            experience: item.experience,
            phone: item.phone,
            nationality: item.nationality,
          };
        }),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!adminUser) navigate('/admin-login');
  }, [adminUser, navigate]);

  useEffect(() => {
    if (adminUser) void loadCoaches();
  }, [adminUser, loadCoaches]);

  if (!adminUser) return null;

  const filtered = coaches.filter(
    (coach) =>
      coach.name.toLowerCase().includes(search.toLowerCase()) ||
      coach.email.toLowerCase().includes(search.toLowerCase()) ||
      coach.specialty.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError('');
    setShowPassword(false);
    setShowModal(true);
  };

  const openEdit = (coach: CoachMember) => {
    const { firstName, middleInitial, lastName } = parseFullName(coach.name);
    setForm({
      firstName,
      lastName,
      middleInitial,
      email: coach.email,
      nationality: coach.nationality,
      disciplineIds: [...coach.disciplineIds],
      status: coach.status,
      password: '',
    });
    setEditingId(coach.id);
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

  const handleSave = async () => {
    const fullName = buildFullName(form.firstName, form.middleInitial, form.lastName);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError('First name, last name, and email are required.');
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
    if (form.disciplineIds.length < 1) {
      setFormError('Select at least one discipline.');
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
        name: fullName,
        email: form.email.trim(),
        specialty: specialtyLabel,
        nationality: form.nationality,
        staffRole: 'coach',
        disciplineIds: form.disciplineIds,
      });
      setSaving(false);
      if (!result.ok) {
        setFormError(result.error || 'Failed to update coach account.');
        return;
      }
    } else {
      const result = await createStaffAccount({
        email: form.email.trim(),
        password: form.password,
        name: fullName,
        specialty: specialtyLabel,
        nationality: form.nationality,
        staffRole: 'coach',
        disciplineIds: form.disciplineIds,
      });
      setSaving(false);
      if (!result.ok) {
        setFormError(result.error || 'Failed to create coach account.');
        return;
      }
    }

    await loadCoaches();
    setShowPassword(false);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteManagedAccount(id);
    if (result.ok) {
      await loadCoaches();
    }
    setDeleteId(null);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award size={14} className="text-[#745b3c]" />
              <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Admin › Coaches</span>
            </div>
            <h1
              className="text-[#1E2A35] leading-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '0.04em' }}
            >
              Coaches Management
            </h1>
          </div>
          {pageTab === 'coaches' && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#1E2A35] text-white px-5 py-2.5 rounded-full hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em', fontSize: '0.9rem' }}
            >
              <Plus size={16} /> Add Coach
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm mb-6 w-fit">
          {([
            ['coaches', 'Coaches', Users],
            ['availability', 'Coach Availability', Clock],
            ['absence', 'Absence Tracker', AlertOctagon],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setPageTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                pageTab === id ? 'bg-[#1E2A35] text-white shadow-sm' : 'text-[#8A7E6E] hover:text-[#1E2A35]'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {pageTab === 'availability' && <AdminCoachAvailabilityPanel />}
        {pageTab === 'absence' && <AdminAbsenceTrackerPanel />}

        {pageTab === 'coaches' && (
          <>
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0A898]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or discipline…"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#745b3c]/25 focus:border-[#745b3c]/50 transition-all placeholder-[#C0B8A8]"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-[#D4CDB5]/60 rounded-2xl p-1 shadow-sm">
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
          <span className="text-[#8A7E6E] text-sm ml-auto">{filtered.length} of {coaches.length} coaches</span>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm px-6 py-12 text-center text-[#B0A898] text-sm">
            Loading coaches…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm px-6 py-12 text-center text-[#B0A898] text-sm">
            No coaches match your search.
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((coach) => {
              const disciplineLabels = coach.disciplineNames.length > 0
                ? coach.disciplineNames
                : coach.specialty !== '—'
                  ? coach.specialty.split(',').map((item) => item.trim()).filter(Boolean)
                  : [];

              return (
                <div
                  key={coach.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCoach(coach)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCoach(coach);
                    }
                  }}
                  className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-[#745b3c]/30 transition-all cursor-pointer group"
                >
                  <div className="relative h-28 overflow-hidden" style={{ backgroundColor: `${ACCENT}15` }}>
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${ACCENT}30 0%, ${ACCENT}08 100%)` }} />
                    <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: ACCENT }} />
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          coach.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-white/80 text-[#8A7E6E] border-[#D4CDB5]/60'
                        }`}
                      >
                        {coach.status}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 pb-5 -mt-8 relative">
                    <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-[#F8F3E8] flex items-center justify-center mb-3">
                      {coach.photo ? (
                        <img src={coach.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[#5e4a30] text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem', letterSpacing: '0.06em' }}>
                          {coachInitials(coach.name)}
                        </span>
                      )}
                    </div>

                    <h3
                      className="text-[#1E2A35] leading-none mb-0.5"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.04em' }}
                    >
                      {coach.name}
                    </h3>
                    <p className="text-[#8A7E6E] text-xs font-semibold mb-1 truncate">{coach.email}</p>
                    {coach.nationality.trim() && (
                      <p className="text-[#B0A898] text-xs mb-3 flex items-center gap-1">
                        <Globe size={11} className="text-[#745b3c]" />
                        {coach.nationality}
                      </p>
                    )}

                    {disciplineLabels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {disciplineLabels.slice(0, 3).map((discipline) => (
                          <span
                            key={discipline}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: ACCENT }}
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
                      {deleteId === coach.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDelete(coach.id)}
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
                            onClick={() => openEdit(coach)}
                            aria-label={`Edit ${coach.name}`}
                            className="h-8 w-8 rounded-lg bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 flex items-center justify-center hover:bg-[#EDE8D8] hover:text-[#1E2A35] active:scale-95 transition-all"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(coach.id)}
                            aria-label={`Delete ${coach.name}`}
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
        <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1fr)_100px] gap-x-4 px-6 py-3 border-b border-[#D4CDB5]/50 bg-[#F8F3E8]/60">
            {['Name', 'Email', 'Discipline', 'Status', 'Actions'].map((h) => (
              <p key={h} className="text-[#8A7E6E] text-xs uppercase tracking-widest font-medium">{h}</p>
            ))}
          </div>

            <div className="divide-y divide-[#D4CDB5]/30">
              {filtered.map((coach) => (
                <div
                  key={coach.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCoach(coach)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCoach(coach);
                    }
                  }}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1fr)_100px] gap-x-4 px-6 py-4 items-center hover:bg-[#F8F3E8]/50 transition-colors min-h-[64px] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#745b3c]/12 border border-[#745b3c]/25 flex items-center justify-center shrink-0 overflow-hidden">
                      {coach.photo ? (
                        <img src={coach.photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[#5e4a30] text-xs font-bold">{coachInitials(coach.name)}</span>
                      )}
                    </div>
                    <span className="text-[#1E2A35] text-sm font-semibold truncate">{coach.name}</span>
                  </div>
                  <span className="text-[#8A7E6E] text-sm truncate">{coach.email}</span>
                  <span className="text-[#5A5048] text-sm truncate">{coach.specialty}</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
                      coach.status === 'active'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-[#EDE8D8] text-[#8A7E6E] border border-[#D4CDB5]/60'
                    }`}
                  >
                    {coach.status}
                  </span>
                  <div
                    className="flex items-center gap-1.5 w-[100px]"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {deleteId === coach.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDelete(coach.id)}
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
                          onClick={() => openEdit(coach)}
                          aria-label={`Edit ${coach.name}`}
                          className="h-8 w-8 rounded-lg bg-[#F8F3E8] text-[#5A5048] border border-[#D4CDB5]/60 flex items-center justify-center hover:bg-[#EDE8D8] hover:text-[#1E2A35] active:scale-95 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(coach.id)}
                          aria-label={`Delete ${coach.name}`}
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
        </div>
        )}
          </>
        )}
      </div>

      {selectedCoach && (
        <CoachSummaryModal coach={selectedCoach} onClose={() => setSelectedCoach(null)} />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between shrink-0">
              <h3
                className="text-[#1E2A35]"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
              >
                {editingId !== null ? 'Edit Coach' : 'Add Coach'}
              </h3>
              <button onClick={() => { setShowModal(false); setShowPassword(false); }} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_5.5rem] gap-3">
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="Juan"
                    className={inputClass}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                    M.I.
                  </label>
                  <input
                    type="text"
                    value={form.middleInitial}
                    onChange={(e) => setForm((f) => ({ ...f, middleInitial: e.target.value.slice(0, 2) }))}
                    placeholder="A"
                    maxLength={2}
                    className={`${inputClass} text-center`}
                    autoComplete="additional-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="dela Cruz"
                  className={inputClass}
                  autoComplete="family-name"
                />
              </div>

              <div>
                <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="coach@balanse.com"
                  className={inputClass}
                />
              </div>

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

              {editingId === null && (
                <div>
                  <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Set a temporary password"
                      className={`${inputClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0A898] hover:text-[#8A7E6E] transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

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

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}
            </div>

            <div className="px-7 pb-7 flex items-center gap-3 shrink-0 border-t border-[#D4CDB5]/40">
              <button
                onClick={() => { setShowModal(false); setShowPassword(false); }}
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
                {saving ? 'Saving…' : editingId !== null ? 'Save Changes' : 'Add Coach'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
