import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { toastDeleted, toastOperationFailed, toastUpdated } from '../../../lib/operation-toast';
import {
  CLASS_BLOCK_STATUSES,
  CLASS_BOOKING_OPTIONS,
  CLASS_STATUS_CLASS_OPTIONS,
  formatClassBooking,
  formatClassDateTime,
  formatClassStatusClass,
  type ClassBlockStatus,
  type ClassDisplay,
  type ClassUpsertInput,
} from '../../../lib/class-service';
import type { DisciplineDisplay } from '../../../lib/discipline-service';
import { isDisciplineActive } from '../../../lib/discipline-service';
import {
  buildStartEndFromMinutes,
  dateKeyFromIso,
  localMinutesFromIso,
} from '../../../lib/admin-schedule-map';
import { ClockDatePicker } from '../calendar/ClockDatePicker';
import { ClockTimePicker } from '../calendar/ClockTimePicker';
import {
  CALENDAR_DAY_END_HOUR,
  CLOCK_MINUTE_STEP,
  formatMinutesOfDay,
  snapMinutesToStep,
} from '../calendar/clock-time';
import { formatDateLongFromKey, getTodayDateKey } from '../calendar/weekCalendarUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  coachAvailabilityForScheduleSlot,
  coachAvailabilityHint,
  fetchStaffAvailabilityForSchedule,
  type CoachScheduleAvailabilityStatus,
} from '../../../lib/staff-availability-service';

const ASSIGN_SELECT_NONE = '__assign_select_none__';

function assignSelectInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function AssignSelectLeadImage({
  name,
  imageUrl,
  size = 28,
}: {
  name: string;
  imageUrl?: string;
  size?: number;
}) {
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    return (
      <ImageWithFallback
        src={trimmed}
        alt=""
        className="shrink-0 rounded-lg object-cover ring-1 ring-[#D4CDB5]/60 bg-white"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-[#1E2A35]/10 text-[10px] font-bold text-[#1E2A35] ring-1 ring-[#D4CDB5]/60"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {assignSelectInitials(name) || '?'}
    </div>
  );
}

type AssignLeadSelectOption = {
  value: string;
  label: string;
  imageUrl?: string;
};

function AssignScheduleLeadSelect({
  label,
  labelClass,
  value,
  onValueChange,
  placeholder,
  options,
  allowEmpty = false,
  renderTrailing,
}: {
  label: ReactNode;
  labelClass: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: AssignLeadSelectOption[];
  allowEmpty?: boolean;
  renderTrailing?: (option: AssignLeadSelectOption) => ReactNode;
}) {
  const hasValue = Boolean(value);
  const selectValue = allowEmpty ? (value || ASSIGN_SELECT_NONE) : value;
  const selected = options.find((option) => option.value === value);

  return (
    <div className="min-w-0 w-full">
      <label className={labelClass}>{label}</label>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (allowEmpty && next === ASSIGN_SELECT_NONE) {
            onValueChange('');
            return;
          }
          onValueChange(next);
        }}
      >
        <SelectTrigger
          className={cn(
            'w-full min-w-0 h-auto rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2 text-sm shadow-none',
            'focus-visible:ring-2 focus-visible:ring-[#c49a3c]/25 focus-visible:border-[#c49a3c]/50',
            'data-[size=default]:h-auto [&_svg]:text-[#B0A898]',
            hasValue ? 'text-[#1E2A35]' : 'text-[#C0B8A8] font-medium',
          )}
        >
          {hasValue && selected ? (
            <span className="flex w-full min-w-0 flex-1 items-center gap-2.5 text-left">
              <AssignSelectLeadImage name={selected.label} imageUrl={selected.imageUrl} size={28} />
              <span className="min-w-0 flex-1 truncate font-semibold text-[#1E2A35]">
                {selected.label}
              </span>
              {renderTrailing ? (
                <span className="flex h-2.5 w-5 shrink-0 items-center justify-end">
                  {renderTrailing(selected)}
                </span>
              ) : null}
            </span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={6}
          className="z-[200] rounded-2xl border border-[#D4CDB5]/70 bg-white shadow-xl p-1.5 max-h-56"
        >
          {allowEmpty && (
            <SelectItem
              value={ASSIGN_SELECT_NONE}
              className="rounded-xl py-2.5 text-sm text-[#8A7E6E] focus:bg-[#F8F3E8] focus:text-[#5A5048] cursor-pointer"
            >
              {placeholder}
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              textValue={option.label}
              className={cn(
                'rounded-xl py-2 pl-2 pr-8 text-sm text-[#1E2A35] font-medium focus:bg-[#c49a3c]/12 focus:text-[#1E2A35] cursor-pointer',
                renderTrailing &&
                  '[&>span:nth-child(2)]:flex [&>span:nth-child(2)]:min-w-0 [&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:w-full',
              )}
            >
              <span className="flex w-full min-w-0 items-center gap-2.5">
                <AssignSelectLeadImage name={option.label} imageUrl={option.imageUrl} size={32} />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {renderTrailing ? (
                  <span className="flex h-2.5 w-5 shrink-0 items-center justify-end">
                    {renderTrailing(option)}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CoachAvailabilityIndicator({ status }: { status: CoachScheduleAvailabilityStatus }) {
  const hint = coachAvailabilityHint(status);

  if (status === 'not_set') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full border border-[#B0A898] bg-transparent"
            aria-label={hint}
            tabIndex={0}
          />
        </TooltipTrigger>
        <TooltipContent side="left" className="z-[250] text-xs max-w-[14rem]">
          {hint}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
            status === 'available' ? 'bg-green-500' : 'bg-red-500',
          )}
          aria-label={hint}
          tabIndex={0}
        />
      </TooltipTrigger>
      <TooltipContent side="left" className="z-[250] text-xs max-w-[14rem]">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}

type AssignCoachOption = AssignLeadSelectOption & {
  availability: CoachScheduleAvailabilityStatus;
};

function AssignScheduleCoachSelect({
  label,
  labelClass,
  value,
  onValueChange,
  placeholder,
  options,
}: {
  label: ReactNode;
  labelClass: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: AssignCoachOption[];
}) {
  return (
    <AssignScheduleLeadSelect
      label={label}
      labelClass={labelClass}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      options={options}
      allowEmpty
      renderTrailing={(option) => (
        <CoachAvailabilityIndicator
          status={(option as AssignCoachOption).availability}
        />
      )}
    />
  );
}

function AssignScheduleSelect({
  label,
  labelClass,
  value,
  onValueChange,
  placeholder,
  options,
  allowEmpty = false,
}: {
  label: string;
  labelClass: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string; hint?: string }[];
  allowEmpty?: boolean;
}) {
  const hasValue = Boolean(value);
  const selectValue = allowEmpty ? (value || ASSIGN_SELECT_NONE) : value;

  return (
    <div className="min-w-0 w-full">
      <label className={labelClass}>{label}</label>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (allowEmpty && next === ASSIGN_SELECT_NONE) {
            onValueChange('');
            return;
          }
          onValueChange(next);
        }}
      >
        <SelectTrigger
          className={cn(
            'w-full min-w-0 h-auto rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2 text-sm shadow-none',
            'focus-visible:ring-2 focus-visible:ring-[#c49a3c]/25 focus-visible:border-[#c49a3c]/50',
            'data-[size=default]:h-auto [&_svg]:text-[#B0A898]',
            hasValue ? 'text-[#1E2A35] font-semibold' : 'text-[#C0B8A8] font-medium',
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={6}
          className="z-[200] rounded-2xl border border-[#D4CDB5]/70 bg-white shadow-xl p-1.5 max-h-56"
        >
          {allowEmpty && (
            <SelectItem
              value={ASSIGN_SELECT_NONE}
              className="rounded-xl py-2.5 text-sm text-[#8A7E6E] focus:bg-[#F8F3E8] focus:text-[#5A5048] cursor-pointer"
            >
              {placeholder}
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              textValue={option.label}
              className="rounded-xl py-2.5 pr-8 text-sm text-[#1E2A35] font-medium focus:bg-[#c49a3c]/12 focus:text-[#1E2A35] cursor-pointer"
            >
              <span className="flex flex-col gap-0.5 min-w-0 text-left">
                <span className="truncate">{option.label}</span>
                {option.hint ? (
                  <span className="text-[10px] font-normal text-[#8A7E6E] truncate">{option.hint}</span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface ClassPersonOption {
  accountId: string;
  name: string;
  email: string;
  photo?: string;
}

interface AdminClassModalProps {
  mode: 'create' | 'edit';
  initial: ClassUpsertInput;
  classItem?: ClassDisplay | null;
  disciplines: DisciplineDisplay[];
  coaches: ClassPersonOption[];
  students: ClassPersonOption[];
  onClose: () => void;
  onSave: (input: ClassUpsertInput) => Promise<{ success: boolean; error: string | null }>;
  onDelete?: () => Promise<{ success: boolean; error: string | null }>;
  /** Opened from “Assign Schedule” on a calendar block */
  assignSchedule?: boolean;
  /** Block already has class assignment (coach/discipline) — update flow */
  assignScheduleIsUpdate?: boolean;
}

const BLOCK_STATUS_LABEL: Record<ClassBlockStatus, string> = {
  vacant: 'Vacant',
  assigned: 'Assigned',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function scheduleSlotFromForm(form: ClassUpsertInput): {
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
} {
  const dateKey = form.startsAt ? dateKeyFromIso(form.startsAt) : getTodayDateKey();
  const startMinutes = form.startsAt
    ? snapMinutesToStep(localMinutesFromIso(form.startsAt))
    : 9 * 60;
  let endMinutes = form.endsAt
    ? snapMinutesToStep(localMinutesFromIso(form.endsAt))
    : startMinutes + 60;
  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(CALENDAR_DAY_END_HOUR * 60 + 55, startMinutes + CLOCK_MINUTE_STEP);
  }
  return { dateKey, startMinutes, endMinutes };
}

function applyScheduleSlot(
  form: ClassUpsertInput,
  dateKey: string,
  startMinutes: number,
  endMinutes: number,
): ClassUpsertInput {
  const { startsAt, endsAt } = buildStartEndFromMinutes(dateKey, startMinutes, endMinutes);
  return { ...form, startsAt, endsAt };
}

function disciplineNameById(
  disciplines: DisciplineDisplay[],
  disciplineId: string | null | undefined,
): string {
  if (!disciplineId) return '';
  return disciplines.find((item) => item.id === disciplineId)?.name.trim() ?? '';
}

function resolveAssignScheduleClassName(
  form: ClassUpsertInput,
  disciplines: DisciplineDisplay[],
): string {
  const trimmed = form.name.trim();
  if (trimmed) return trimmed;
  return disciplineNameById(disciplines, form.disciplineId);
}

function prepareAssignScheduleSavePayload(
  form: ClassUpsertInput,
  disciplines: DisciplineDisplay[],
  isUpdate: boolean,
): ClassUpsertInput {
  return {
    ...form,
    name: resolveAssignScheduleClassName(form, disciplines),
    statusBlock: isUpdate ? form.statusBlock : 'assigned',
  };
}

function coachDisplayName(coaches: ClassPersonOption[], accountId: string | undefined): string {
  if (!accountId) return '—';
  return coaches.find((coach) => coach.accountId === accountId)?.name ?? 'Coach';
}

function assignScheduleSlotLabel(input: ClassUpsertInput): string {
  if (!input.startsAt) return '—';
  const dateKey = dateKeyFromIso(input.startsAt);
  const start = snapMinutesToStep(localMinutesFromIso(input.startsAt));
  const end = input.endsAt
    ? snapMinutesToStep(localMinutesFromIso(input.endsAt))
    : start + 60;
  return `${formatDateLongFromKey(dateKey)} · ${formatMinutesOfDay(start)} – ${formatMinutesOfDay(end)}`;
}

function summarizeAssignScheduleChanges(
  before: ClassUpsertInput,
  after: ClassUpsertInput,
  disciplines: DisciplineDisplay[],
  coaches: ClassPersonOption[],
): string[] {
  const changes: string[] = [];
  const beforeName = resolveAssignScheduleClassName(before, disciplines);
  const afterName = resolveAssignScheduleClassName(after, disciplines);

  if ((before.disciplineId ?? '') !== (after.disciplineId ?? '')) {
    changes.push(`Discipline → ${disciplineNameById(disciplines, after.disciplineId) || '—'}`);
  }
  if (beforeName !== afterName) {
    changes.push(`Class name → ${afterName}`);
  }
  if (before.description.trim() !== after.description.trim()) {
    changes.push('Description updated');
  }
  const beforeCoachId = before.coachAccountIds[0] ?? '';
  const afterCoachId = after.coachAccountIds[0] ?? '';
  if (beforeCoachId !== afterCoachId) {
    changes.push(`Coach → ${coachDisplayName(coaches, afterCoachId)}`);
  }
  if (before.statusClass !== after.statusClass) {
    changes.push(`Class booking → ${formatClassBooking(after.statusClass)}`);
  }
  if (before.classLimit !== after.classLimit) {
    changes.push(`Class limit → ${after.classLimit ?? '—'}`);
  }
  if (before.statusBlock !== after.statusBlock) {
    changes.push(`Block status → ${BLOCK_STATUS_LABEL[after.statusBlock]}`);
  }
  const scheduleUnchanged =
    before.startsAt === after.startsAt && (before.endsAt ?? '') === (after.endsAt ?? '');
  if (!scheduleUnchanged) {
    changes.push(`Schedule → ${assignScheduleSlotLabel(after)}`);
  }
  return changes;
}

function showAssignScheduleSaveToast(
  isUpdate: boolean,
  before: ClassUpsertInput,
  after: ClassUpsertInput,
  disciplines: DisciplineDisplay[],
  coaches: ClassPersonOption[],
) {
  if (isUpdate) {
    const changes = summarizeAssignScheduleChanges(before, after, disciplines, coaches);
    if (changes.length === 0) {
      toast.success('Schedule updated', { description: 'Your changes were saved.' });
      return;
    }
    toast.success('Schedule updated', { description: changes.join(' · ') });
    return;
  }

  const className = resolveAssignScheduleClassName(after, disciplines);
  const coachName = coachDisplayName(coaches, after.coachAccountIds[0]);
  toast.success('Schedule assigned', {
    description: `${className} · ${coachName} · ${assignScheduleSlotLabel(after)}`,
  });
}

const inputClass =
  'w-full px-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50';

const compactInputClass =
  'w-full min-w-0 max-w-full px-3 py-2 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50';

const fieldLabelClass = 'text-[#9A8E7E] text-[10px] uppercase tracking-widest mb-1 block';
const fieldLabelClassDefault = 'text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block';

export function AdminClassModal({
  mode,
  initial,
  classItem,
  disciplines,
  coaches,
  students,
  onClose,
  onSave,
  onDelete,
  assignSchedule = false,
  assignScheduleIsUpdate = false,
}: AdminClassModalProps) {
  const [form, setForm] = useState<ClassUpsertInput>(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [coachQuery, setCoachQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [coachAvailabilityStatus, setCoachAvailabilityStatus] = useState<
    Map<string, CoachScheduleAvailabilityStatus>
  >(() => new Map());

  useEffect(() => {
    let next = initial;
    if (assignSchedule) {
      const coachId = initial.coachAccountIds[0];
      next = {
        ...initial,
        coachAccountIds: coachId ? [coachId] : [],
        statusClass: assignScheduleIsUpdate ? initial.statusClass : false,
      };
    }
    setForm(next);
    setShowConfirm(false);
    setShowDeleteConfirm(false);
    setError('');
    setCoachQuery('');
    setStudentQuery('');
  }, [initial, mode, assignSchedule, assignScheduleIsUpdate]);

  const activeDisciplines = useMemo(
    () => disciplines.filter((item) => isDisciplineActive(item) || item.id === form.disciplineId),
    [disciplines, form.disciplineId],
  );

  const filteredCoaches = useMemo(() => {
    const q = coachQuery.trim().toLowerCase();
    if (!q) return coaches;
    return coaches.filter(
      (coach) =>
        coach.name.toLowerCase().includes(q) || coach.email.toLowerCase().includes(q),
    );
  }, [coaches, coachQuery]);

  const scheduleSlot = useMemo(() => scheduleSlotFromForm(form), [form]);

  useEffect(() => {
    if (!assignSchedule || coaches.length === 0) {
      setCoachAvailabilityStatus(new Map());
      return;
    }

    let cancelled = false;
    const accountIds = coaches.map((coach) => coach.accountId);

    void (async () => {
      const { entries } = await fetchStaffAvailabilityForSchedule(
        accountIds,
        scheduleSlot.dateKey,
      );
      if (cancelled) return;

      const entryByAccount = new Map(entries.map((entry) => [entry.accountId, entry]));
      const next = new Map<string, CoachScheduleAvailabilityStatus>();

      for (const accountId of accountIds) {
        next.set(
          accountId,
          coachAvailabilityForScheduleSlot(
            entryByAccount.get(accountId),
            scheduleSlot.startMinutes,
            scheduleSlot.endMinutes,
          ),
        );
      }

      setCoachAvailabilityStatus(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    assignSchedule,
    coaches,
    scheduleSlot.dateKey,
    scheduleSlot.startMinutes,
    scheduleSlot.endMinutes,
  ]);

  const assignScheduleDisplayName = useMemo(() => {
    const resolved = resolveAssignScheduleClassName(form, disciplines);
    return resolved || 'Class details';
  }, [form, disciplines]);

  const assignDisciplineOptions = useMemo(
    () =>
      activeDisciplines.map((discipline) => ({
        value: discipline.id,
        label: discipline.name,
        imageUrl: discipline.logoUrl,
      })),
    [activeDisciplines],
  );

  const assignCoachOptions = useMemo(
    () =>
      [...coaches]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((coach) => ({
          value: coach.accountId,
          label: coach.name,
          imageUrl: coach.photo,
          availability: coachAvailabilityStatus.get(coach.accountId) ?? 'not_set',
        })),
    [coaches, coachAvailabilityStatus],
  );

  const assignClassBookingOptions = useMemo(
    () =>
      CLASS_BOOKING_OPTIONS.map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
    [],
  );

  const assignBlockStatusOptions = useMemo(
    () =>
      CLASS_BLOCK_STATUSES.map((status) => ({
        value: status,
        label: BLOCK_STATUS_LABEL[status],
      })),
    [],
  );

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(q) || student.email.toLowerCase().includes(q),
    );
  }, [students, studentQuery]);

  const toggleId = (field: 'coachAccountIds' | 'studentAccountIds', accountId: string) => {
    setForm((current) => {
      const exists = current[field].includes(accountId);
      const next = exists
        ? current[field].filter((id) => id !== accountId)
        : [...current[field], accountId];
      return { ...current, [field]: next };
    });
  };

  const handleSaveClick = () => {
    setError('');
    if (!assignSchedule && !form.name.trim()) {
      setError('Class name is required.');
      return;
    }
    if (!form.disciplineId) {
      setError(assignSchedule ? 'Choose a discipline.' : 'Choose a discipline tag.');
      return;
    }
    if (form.coachAccountIds.length < 1) {
      setError(assignSchedule ? 'Select a coach.' : 'Assign at least one coach.');
      return;
    }
    if (assignSchedule && form.coachAccountIds.length > 1) {
      setError('Select only one coach.');
      return;
    }
    if (form.classLimit == null || form.classLimit < 1) {
      setError('Class limit is required.');
      return;
    }
    if (!assignSchedule && form.studentAccountIds.length > form.classLimit) {
      setError(`Enrollment (${form.studentAccountIds.length}) exceeds class limit (${form.classLimit}).`);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError('');
    const payload = assignSchedule
      ? prepareAssignScheduleSavePayload(form, disciplines, assignScheduleIsUpdate)
      : form;
    const result = await onSave(payload);
    setSaving(false);
    if (!result.success) {
      const message = result.error ?? 'Failed to save class.';
      setError(message);
      toastOperationFailed(message);
      setShowConfirm(false);
      return;
    }
    if (assignSchedule) {
      showAssignScheduleSaveToast(assignScheduleIsUpdate, initial, payload, disciplines, coaches);
    } else {
      toastUpdated('Class');
    }
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    setError('');
    const result = await onDelete();
    setDeleting(false);
    if (!result.success) {
      const message = result.error ?? 'Failed to delete class.';
      setError(message);
      toastOperationFailed(message);
      setShowDeleteConfirm(false);
      return;
    }
    toastDeleted('Class');
    onClose();
  };

  const labelClass = assignSchedule ? fieldLabelClass : fieldLabelClassDefault;
  const fieldInputClass = assignSchedule ? compactInputClass : inputClass;

  const coachPicker = (
    <div
      className={`rounded-xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/50 flex flex-col min-h-0 ${
        assignSchedule ? 'p-3 h-full' : 'p-4'
      }`}
    >
      <div className="mb-2 shrink-0">
        <p className={labelClass}>Assigned coaches</p>
        <p className="text-[#1E2A35] text-xs font-semibold">
          {form.coachAccountIds.length} selected · min 1
        </p>
      </div>
      <input
        value={coachQuery}
        onChange={(e) => setCoachQuery(e.target.value)}
        placeholder="Search coaches…"
        className={`${fieldInputClass} mb-2 shrink-0`}
      />
      <div
        className={`min-h-0 flex-1 ${
          assignSchedule
            ? 'grid grid-cols-2 xl:grid-cols-3 gap-1 content-start overflow-y-auto overscroll-contain'
            : 'max-h-48 overflow-y-auto flex flex-col gap-1.5'
        }`}
      >
        {filteredCoaches.length === 0 && (
          <p className="text-[#8A7E6E] text-sm px-1 py-2 col-span-full">No coaches found.</p>
        )}
        {filteredCoaches.map((coach) => {
          const checked = form.coachAccountIds.includes(coach.accountId);
          return (
            <label
              key={coach.accountId}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer border transition-colors ${
                checked
                  ? 'bg-white border-[#c49a3c]/40'
                  : 'bg-transparent border-transparent hover:bg-white/70'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleId('coachAccountIds', coach.accountId)}
                className="accent-[#c49a3c] shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-[#1E2A35] truncate">{coach.name}</span>
                <span className="block text-[10px] text-[#8A7E6E] truncate">{coach.email}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const studentPicker = (
    <div
      className={`rounded-xl border border-[#D4CDB5]/60 bg-[#F8F3E8]/50 flex flex-col min-h-0 ${
        assignSchedule ? 'p-3 h-full' : 'p-4'
      }`}
    >
      <div className="mb-2 shrink-0">
        <p className={labelClass}>Enrolled students</p>
        <p className="text-[#1E2A35] text-xs font-semibold">
          {form.studentAccountIds.length} / {form.classLimit ?? '—'} seats
        </p>
      </div>
      <input
        value={studentQuery}
        onChange={(e) => setStudentQuery(e.target.value)}
        placeholder="Search students…"
        className={`${fieldInputClass} mb-2 shrink-0`}
      />
      <div
        className={`min-h-0 flex-1 ${
          assignSchedule
            ? 'grid grid-cols-2 xl:grid-cols-3 gap-1 content-start overflow-y-auto overscroll-contain'
            : 'max-h-48 overflow-y-auto flex flex-col gap-1.5'
        }`}
      >
        {filteredStudents.length === 0 && (
          <p className="text-[#8A7E6E] text-sm px-1 py-2 col-span-full">No students found.</p>
        )}
        {filteredStudents.map((student) => {
          const checked = form.studentAccountIds.includes(student.accountId);
          const atLimit =
            !checked
            && (form.classLimit == null || form.studentAccountIds.length >= form.classLimit);
          return (
            <label
              key={student.accountId}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border transition-colors ${
                atLimit
                  ? 'opacity-50 cursor-not-allowed border-transparent'
                  : checked
                    ? 'bg-white border-[#c49a3c]/40 cursor-pointer'
                    : 'bg-transparent border-transparent hover:bg-white/70 cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={atLimit}
                onChange={() => toggleId('studentAccountIds', student.accountId)}
                className="accent-[#c49a3c] shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-[#1E2A35] truncate">{student.name}</span>
                <span className="block text-[10px] text-[#8A7E6E] truncate">{student.email}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const modalBody = (
    <div
      className={`fixed inset-0 flex items-center justify-center p-2 sm:p-4 ${
        assignSchedule ? 'z-[110]' : 'z-[100]'
      }`}
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl border border-[#D4CDB5]/60 shadow-2xl w-full flex flex-col ${
          assignSchedule
            ? 'max-w-[min(96vw,52rem)] min-w-0 overflow-hidden'
            : 'max-w-3xl max-h-[92vh] overflow-y-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3 shrink-0 bg-white ${
            assignSchedule ? 'px-4 py-2.5' : 'px-6 pt-6 pb-4 sticky top-0 z-10'
          }`}
        >
          <div className="min-w-0">
            <p className="text-[#9A8E7E] text-[10px] uppercase tracking-widest mb-0.5">
              {assignSchedule
                ? assignScheduleIsUpdate
                  ? 'Update schedule'
                  : 'Assign schedule'
                : mode === 'create'
                  ? 'New class'
                  : 'Edit class'}
            </p>
            <h2
              className="text-[#1E2A35] leading-none truncate"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: assignSchedule ? '1.45rem' : '1.8rem',
                letterSpacing: '0.04em',
              }}
            >
              {assignSchedule
                ? assignScheduleDisplayName
                : form.name.trim() || (mode === 'create' ? 'Untitled Class' : classItem?.name || 'Class')}
            </h2>
            {assignSchedule && classItem?.uid && (
              <p className="text-[#8A7E6E] text-[11px] mt-1 truncate">
                Block #{classItem.uid} · {formatDateLongFromKey(scheduleSlot.dateKey)}
              </p>
            )}
            {!assignSchedule && mode === 'edit' && classItem && (
              <p className="text-[#8A7E6E] text-xs mt-2">
                Created {formatClassDateTime(classItem.createdAt)} by {classItem.createdByName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#D4CDB5]/70 text-[#1E2A35] hover:bg-[#EDE8D8] flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div
          className={
            assignSchedule
              ? 'px-5 py-3 flex flex-col gap-3 min-w-0 w-full'
              : 'px-6 py-5 flex flex-col gap-5'
          }
        >
          {assignSchedule ? (
            <div className="flex flex-col gap-3 min-w-0 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0 w-full">
                <section className="flex flex-col gap-2 rounded-xl border border-[#D4CDB5]/55 bg-[#F8F3E8]/40 px-3 py-2.5 min-w-0 overflow-hidden">
                  <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest font-medium">Class</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                    <AssignScheduleLeadSelect
                      label={<>Discipline <span className="text-red-600" aria-hidden="true">*</span></>}
                      labelClass={labelClass}
                      value={form.disciplineId ?? ''}
                      onValueChange={(disciplineId) =>
                        setForm((c) => ({ ...c, disciplineId }))
                      }
                      placeholder="Select discipline…"
                      options={assignDisciplineOptions}
                      allowEmpty
                    />
                    <div className="min-w-0">
                      <label className={labelClass}>
                        Class name{' '}
                        <span className="normal-case tracking-normal text-[#B0A898]">(optional)</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                        className={fieldInputClass}
                        placeholder={
                          disciplineNameById(disciplines, form.disciplineId) || 'Uses discipline name'
                        }
                      />
                    </div>
                  </div>
                  <p className="text-[#9A8E7E] text-[10px] leading-snug truncate">
                    Blank name uses discipline
                    {disciplineNameById(disciplines, form.disciplineId)
                      ? `: “${disciplineNameById(disciplines, form.disciplineId)}”`
                      : ' once selected.'}
                  </p>
                  <div className="min-w-0">
                    <label className={labelClass}>Description</label>
                    <input
                      value={form.description}
                      onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                      className={fieldInputClass}
                      placeholder="Optional notes…"
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-2 rounded-xl border border-[#D4CDB5]/55 bg-[#F8F3E8]/40 px-3 py-2.5 min-w-0 overflow-hidden">
                  <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest font-medium">Assignment</p>
                  <AssignScheduleCoachSelect
                    label={<>Assigned Coach <span className="text-red-600" aria-hidden="true">*</span></>}
                    labelClass={labelClass}
                    value={form.coachAccountIds[0] ?? ''}
                    onValueChange={(id) =>
                      setForm((c) => ({ ...c, coachAccountIds: id ? [id] : [] }))
                    }
                    placeholder="Select coach…"
                    options={assignCoachOptions}
                  />
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <AssignScheduleSelect
                      label="Class booking"
                      labelClass={labelClass}
                      value={String(form.statusClass)}
                      onValueChange={(value) =>
                        setForm((c) => ({
                          ...c,
                          statusClass: value === 'true',
                        }))
                      }
                      placeholder="Closed or Open…"
                      options={assignClassBookingOptions}
                    />
                    <div className="min-w-0">
                      <label className={labelClass}>
                        Class limit <span className="text-red-600" aria-hidden="true">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.classLimit ?? ''}
                        placeholder="12"
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          setForm((c) => ({
                            ...c,
                            classLimit: raw === '' ? null : Math.max(1, Number(raw) || 1),
                          }));
                        }}
                        className={fieldInputClass}
                      />
                    </div>
                  </div>
                  {assignScheduleIsUpdate ? (
                    <AssignScheduleSelect
                      label="Block status"
                      labelClass={labelClass}
                      value={form.statusBlock}
                      onValueChange={(statusBlock) =>
                        setForm((c) => ({
                          ...c,
                          statusBlock: statusBlock as ClassBlockStatus,
                        }))
                      }
                      placeholder="Select block status…"
                      options={assignBlockStatusOptions}
                    />
                  ) : (
                    <p className="text-[#9A8E7E] text-[10px] leading-snug">
                      Block status becomes{' '}
                      <span className="font-semibold text-[#5A5048]">Occupied</span> when you assign.
                    </p>
                  )}
                </section>
              </div>

              <section className="flex flex-col gap-2 rounded-xl border border-[#D4CDB5]/55 bg-[#F8F3E8]/40 px-3 py-2.5 min-w-0 overflow-hidden relative z-30">
                <p className="text-[#8A7E6E] text-[10px] uppercase tracking-widest font-medium">Schedule</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0 w-full">
                  <div className="min-w-0 w-full">
                    <ClockDatePicker
                      label="Date"
                      value={scheduleSlot.dateKey}
                      onChange={(dateKey) =>
                        setForm((c) =>
                          applyScheduleSlot(
                            c,
                            dateKey,
                            scheduleSlotFromForm(c).startMinutes,
                            scheduleSlotFromForm(c).endMinutes,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="min-w-0 w-full">
                    <ClockTimePicker
                      label="Start"
                      value={scheduleSlot.startMinutes}
                      headerDateLabel={formatDateLongFromKey(scheduleSlot.dateKey)}
                      onChange={(startMinutes) =>
                        setForm((c) => {
                          const slot = scheduleSlotFromForm(c);
                          const endMinutes =
                            slot.endMinutes <= startMinutes
                              ? Math.min(
                                  CALENDAR_DAY_END_HOUR * 60 + 55,
                                  startMinutes + CLOCK_MINUTE_STEP,
                                )
                              : slot.endMinutes;
                          return applyScheduleSlot(c, slot.dateKey, startMinutes, endMinutes);
                        })
                      }
                    />
                  </div>
                  <div className="min-w-0 w-full">
                    <ClockTimePicker
                      label="End"
                      value={scheduleSlot.endMinutes}
                      minMinutes={scheduleSlot.startMinutes + CLOCK_MINUTE_STEP}
                      headerDateLabel={formatDateLongFromKey(scheduleSlot.dateKey)}
                      onChange={(endMinutes) =>
                        setForm((c) => {
                          const slot = scheduleSlotFromForm(c);
                          return applyScheduleSlot(c, slot.dateKey, slot.startMinutes, endMinutes);
                        })
                      }
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Morning Yoga Flow"
              />
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Discipline tag</label>
              <select
                value={form.disciplineId}
                onChange={(e) => setForm((c) => ({ ...c, disciplineId: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select discipline…</option>
                {activeDisciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Status</label>
              <select
                value={String(form.statusClass)}
                onChange={(e) =>
                  setForm((c) => ({ ...c, statusClass: e.target.value === 'true' }))
                }
                className={inputClass}
              >
                {CLASS_STATUS_CLASS_OPTIONS.map((option) => (
                  <option key={String(option.value)} value={String(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex flex-col gap-4">
              <ClockDatePicker
                value={scheduleSlot.dateKey}
                onChange={(dateKey) =>
                  setForm((c) =>
                    applyScheduleSlot(
                      c,
                      dateKey,
                      scheduleSlotFromForm(c).startMinutes,
                      scheduleSlotFromForm(c).endMinutes,
                    ),
                  )
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ClockTimePicker
                  label="Start time"
                  value={scheduleSlot.startMinutes}
                  headerDateLabel={formatDateLongFromKey(scheduleSlot.dateKey)}
                  onChange={(startMinutes) =>
                    setForm((c) => {
                      const slot = scheduleSlotFromForm(c);
                      const endMinutes =
                        slot.endMinutes <= startMinutes
                          ? Math.min(
                              CALENDAR_DAY_END_HOUR * 60 + 55,
                              startMinutes + CLOCK_MINUTE_STEP,
                            )
                          : slot.endMinutes;
                      return applyScheduleSlot(c, slot.dateKey, startMinutes, endMinutes);
                    })
                  }
                />
                <ClockTimePicker
                  label="End time"
                  value={scheduleSlot.endMinutes}
                  minMinutes={scheduleSlot.startMinutes + CLOCK_MINUTE_STEP}
                  headerDateLabel={formatDateLongFromKey(scheduleSlot.dateKey)}
                  onChange={(endMinutes) =>
                    setForm((c) => {
                      const slot = scheduleSlotFromForm(c);
                      return applyScheduleSlot(c, slot.dateKey, slot.startMinutes, endMinutes);
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">
                Block status
              </label>
              <div className="relative">
                <select
                  value={form.statusBlock}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, statusBlock: e.target.value as ClassBlockStatus }))
                  }
                  className={`${inputClass} appearance-none cursor-pointer pr-10`}
                >
                  {CLASS_BLOCK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {BLOCK_STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A898]"
                />
              </div>
            </div>

            <div>
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Class limit</label>
              <input
                type="number"
                min={1}
                value={form.classLimit ?? ''}
                placeholder="Set class limit"
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  setForm((c) => ({
                    ...c,
                    classLimit: raw === '' ? null : Math.max(1, Number(raw) || 1),
                  }));
                }}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[#9A8E7E] text-xs uppercase tracking-widest mb-2 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                rows={3}
                className={`${inputClass} resize-y min-h-[88px]`}
                placeholder="Optional notes for this class…"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {coachPicker}
            {studentPicker}
          </div>
          </>
          )}

          {error && (
            <div className={`bg-red-50 border border-red-200 rounded-xl px-4 shrink-0 ${assignSchedule ? 'py-2' : 'py-3'}`}>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {showConfirm && (
            <div className={`rounded-xl border border-[#c49a3c]/30 bg-[#c49a3c]/08 px-4 shrink-0 ${assignSchedule ? 'py-3' : 'py-4'}`}>
              <p className="text-[#1E2A35] text-sm font-semibold mb-1">
                {assignSchedule
                  ? assignScheduleIsUpdate
                    ? 'Save updates to this block?'
                    : 'Assign this class to the block?'
                  : mode === 'create'
                    ? 'Create this class?'
                    : 'Save class changes?'}
              </p>
              <p className="text-[#8A7E6E] text-sm mb-4">
                {assignSchedule
                  ? `"${assignScheduleDisplayName}" · 1 coach · booking ${formatClassBooking(form.statusClass).toLowerCase()}.`
                  : `${form.coachAccountIds.length} coach(es), ${form.studentAccountIds.length} student(s), class ${formatClassStatusClass(form.statusClass).toLowerCase()}.`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="action-button flex-1 py-2.5 rounded-full bg-[#c49a3c] text-white text-sm font-bold hover:bg-[#a67f2e] transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  {saving
                    ? 'Saving…'
                    : assignSchedule
                      ? assignScheduleIsUpdate
                        ? 'Confirm Update'
                        : 'Confirm Assign'
                      : mode === 'create'
                        ? 'Confirm Create'
                        : 'Confirm Save'}
                </button>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <p className="text-red-700 text-sm font-semibold mb-1">Delete this class?</p>
              <p className="text-red-600 text-sm mb-4">
                This permanently removes the class, coach assignments, and student enrollments.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-100 transition-all disabled:opacity-60"
                >
                  Keep Class
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          )}

          <div
            className={`flex flex-col sm:flex-row gap-2 border-t border-[#D4CDB5]/40 shrink-0 ${
              assignSchedule ? 'pt-2 mt-auto' : 'gap-3 pt-1'
            }`}
          >
            {mode === 'edit' && onDelete && !assignSchedule && (
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setShowDeleteConfirm(true);
                }}
                disabled={saving || deleting}
                className="sm:mr-auto py-3 px-5 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className={`flex-1 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all disabled:opacity-60 ${
                assignSchedule ? 'py-2.5' : 'py-3'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saving || deleting}
              className={`action-button flex-1 rounded-full text-white text-sm font-bold transition-all disabled:opacity-60 ${
                assignSchedule && assignScheduleIsUpdate
                  ? 'bg-[#c49a3c] hover:bg-[#a67f2e]'
                  : 'bg-[#1E2A35] hover:bg-[#263545]'
              } ${assignSchedule ? 'py-2.5' : 'py-3'}`}
            >
              {assignSchedule
                ? assignScheduleIsUpdate
                  ? 'Update Schedule'
                  : 'Assign'
                : mode === 'create'
                  ? 'Create Class'
                  : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (assignSchedule) {
    const portaled = createPortal(
      <TooltipProvider delayDuration={200}>{modalBody}</TooltipProvider>,
      document.body,
    );
    return portaled;
  }

  return modalBody;
}
