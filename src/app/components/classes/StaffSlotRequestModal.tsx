import { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle, ChevronsUpDown, Loader2, X } from 'lucide-react';
import {
  fetchDisciplinesForPublic,
  statusColorFromHue,
  type DisciplineDisplay,
} from '../../../lib/discipline-service';
import { PendingPortalRequestWithdrawActions } from '../portal/PendingPortalRequestWithdrawActions';
import {
  toastCreated,
  toastDeleted,
  toastOperationFailed,
} from '../../../lib/operation-toast';
import { submitSlotRequest, withdrawPortalRequest } from '../../../lib/portal-request-service';
import { formatDateLongFromKey, formatTimeRange24 } from '../calendar/weekCalendarUtils';
import { formatMinutesToTime24 } from '../calendar/clock-time';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';

export type StaffSlotRequestContext = {
  classId: string;
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
  /** Prefill only when the vacant block already has a limit set. */
  defaultClassLimit?: number;
};

const requiredMark = <span className="text-red-400"> *</span>;

const COMBO_TRIGGER =
  'w-full rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all flex items-center justify-between gap-2 text-left';

const DISCIPLINE_LOGO_CLASS =
  'h-5 w-5 shrink-0 rounded-md bg-white/80 object-contain p-0.5 ring-1 ring-black/5';

function DisciplineStatusDot({ hue }: { hue: number }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: statusColorFromHue(hue) }}
      aria-hidden
    />
  );
}

function DisciplineLogo({ discipline }: { discipline: DisciplineDisplay }) {
  return (
    <img src={discipline.logoUrl} alt="" className={DISCIPLINE_LOGO_CLASS} loading="lazy" />
  );
}

function resolveSlotClassName(
  rawName: string,
  disciplineId: string,
  catalog: DisciplineDisplay[],
): string {
  const trimmed = rawName.trim();
  if (trimmed) return trimmed;
  return catalog.find((d) => d.id === disciplineId)?.name.trim() ?? '';
}

function StaffProfileDisciplineSelect({
  disciplines,
  value,
  onChange,
  disabled,
  loading,
}: {
  disciplines: DisciplineDisplay[];
  value: string;
  onChange: (disciplineId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = disciplines.find((d) => d.id === value);
  const placeholder = loading
    ? 'Loading disciplines…'
    : disciplines.length === 0
      ? 'No disciplines available'
      : 'Select a discipline…';

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && !loading && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id="slot-req-discipline"
          role="combobox"
          aria-expanded={open}
          aria-controls="slot-req-discipline-list"
          disabled={disabled || loading || disciplines.length === 0}
          className={`${COMBO_TRIGGER} ${
            disabled || loading || disciplines.length === 0
              ? 'cursor-not-allowed opacity-70'
              : ''
          } ${selected ? 'text-[#1E2A35]' : 'text-[#C0B8A8]'}`}
        >
          <span className="min-w-0 flex flex-1 items-center gap-2">
            {selected && <DisciplineLogo discipline={selected} />}
            <span className="truncate">{selected?.name ?? placeholder}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {selected && <DisciplineStatusDot hue={selected.status.hue} />}
            {loading ? (
              <Loader2 size={16} className="shrink-0 animate-spin text-[#9A8E7E]" />
            ) : (
              <ChevronsUpDown size={16} className="shrink-0 text-[#9A8E7E]" />
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[120] w-[var(--radix-popover-trigger-width)] p-0 bg-white border-[#D4CDB5]/70 rounded-xl shadow-lg"
      >
        <Command className="bg-white">
          <CommandInput placeholder="Search disciplines…" className="text-sm" />
          <CommandList id="slot-req-discipline-list" className="max-h-52">
            <CommandEmpty className="text-[#8A7E6E] text-sm py-4 px-3">
              No matching disciplines.
            </CommandEmpty>
            <CommandGroup
              heading="Disciplines"
              className="[&_[cmdk-group-heading]]:text-[#8A7E6E] [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:font-semibold"
            >
              {disciplines.map((d) => (
                <CommandItem
                  key={d.id}
                  value={d.id}
                  keywords={[d.name, d.slug]}
                  onSelect={() => {
                    onChange(d.id === value ? '' : d.id);
                    setOpen(false);
                  }}
                  className="gap-2 py-2 text-sm text-[#1E2A35] data-[selected=true]:bg-[#c49a3c]/10 data-[selected=true]:text-[#1E2A35]"
                >
                  <Check
                    size={14}
                    className={d.id === value ? 'opacity-100 text-[#c49a3c]' : 'opacity-0'}
                  />
                  <DisciplineLogo discipline={d} />
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <DisciplineStatusDot hue={d.status.hue} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type StaffSlotRequestModalProps = {
  open: boolean;
  context: StaffSlotRequestContext | null;
  staffAccountId: string;
  staffDisplayName: string;
  /** Pending slot request already exists for this block. */
  alreadyRequested?: boolean;
  pendingSlotRequestId?: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
  onWithdrawn?: () => void;
};

export function StaffSlotRequestModal({
  open,
  context,
  staffAccountId,
  staffDisplayName,
  alreadyRequested = false,
  pendingSlotRequestId = null,
  onClose,
  onSubmitted,
  onWithdrawn,
}: StaffSlotRequestModalProps) {
  const [catalogDisciplines, setCatalogDisciplines] = useState<DisciplineDisplay[]>([]);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [disciplinesLoadError, setDisciplinesLoadError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [disciplineId, setDisciplineId] = useState('');
  const [classLimit, setClassLimit] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const timeLabel =
    context != null
      ? formatTimeRange24(
          formatMinutesToTime24(context.startMinutes),
          formatMinutesToTime24(context.endMinutes),
        )
      : '';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingDisciplines(true);
    setDisciplinesLoadError('');
    void fetchDisciplinesForPublic().then(({ data, error: fetchError }) => {
      if (cancelled) return;
      setLoadingDisciplines(false);
      if (fetchError) {
        setDisciplinesLoadError(fetchError);
        setCatalogDisciplines([]);
        return;
      }
      const sorted = [...data].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      setCatalogDisciplines(sorted);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !context) return;
    setName('');
    setDescription('');
    setDisciplineId('');
    const prefillLimit =
      context.defaultClassLimit != null && context.defaultClassLimit > 0
        ? context.defaultClassLimit
        : '';
    setClassLimit(prefillLimit);
    setNote('');
    setError('');
    setSuccess(false);
    setSubmitting(false);
    setConfirmWithdraw(false);
    setWithdrawing(false);
    setWithdrawError(null);
  }, [open, context?.classId, context?.defaultClassLimit]);

  useEffect(() => {
    if (!disciplineId) return;
    if (!catalogDisciplines.some((d) => d.id === disciplineId)) {
      setDisciplineId('');
    }
  }, [disciplineId, catalogDisciplines]);

  if (!open || !context) return null;

  const formLocked = alreadyRequested || success;

  const resetForContext = () => {
    setName('');
    setDescription('');
    setDisciplineId('');
    const prefillLimit =
      context.defaultClassLimit != null && context.defaultClassLimit > 0
        ? context.defaultClassLimit
        : '';
    setClassLimit(prefillLimit);
    setNote('');
    setError('');
    setSuccess(false);
    setSubmitting(false);
  };

  const classLimitValid =
    classLimit !== '' && Number.isFinite(classLimit) && classLimit >= 1;
  const canSubmit =
    !formLocked
    && !submitting
    && !loadingDisciplines
    && catalogDisciplines.length > 0
    && disciplineId.length > 0
    && classLimitValid;

  const handleClose = () => {
    resetForContext();
    onClose();
  };

  const canWithdraw =
    alreadyRequested && Boolean(pendingSlotRequestId) && !success;

  const handleWithdraw = () => {
    if (!pendingSlotRequestId || withdrawing) return;
    setWithdrawing(true);
    setWithdrawError(null);
    void withdrawPortalRequest(pendingSlotRequestId).then(({ error: withdrawErr }) => {
      setWithdrawing(false);
      if (withdrawErr) {
        setWithdrawError(withdrawErr);
        toastOperationFailed(withdrawErr);
        return;
      }
      toastDeleted('Slot request');
      setConfirmWithdraw(false);
      onWithdrawn?.();
      handleClose();
    });
  };

  const handleSubmit = () => {
    if (submitting) return;
    if (!disciplineId) {
      setError('Choose a discipline.');
      return;
    }
    if (!classLimitValid) {
      setError('Class limit is required (minimum 1).');
      return;
    }

    const resolvedName = resolveSlotClassName(name, disciplineId, catalogDisciplines);
    if (!resolvedName) {
      setError('Choose a discipline.');
      return;
    }

    setSubmitting(true);
    setError('');
    void submitSlotRequest({
      targetClassId: context.classId,
      name: resolvedName,
      description: description.trim(),
      disciplineId,
      classLimit: classLimit as number,
      coachAccountIds: [staffAccountId],
      note,
    }).then(({ error: submitError }) => {
      setSubmitting(false);
      if (submitError) {
        setError(submitError);
        toastOperationFailed(submitError);
        return;
      }
      toastCreated('Slot request');
      setSuccess(true);
      onSubmitted?.();
      setTimeout(handleClose, 1400);
    });
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 transition-all placeholder-[#C0B8A8]';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-slot-request-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#D4CDB5]/50 px-6 sm:px-8 pt-6 pb-4">
          <div>
            <p className="text-[#9A8E7E] text-[10px] uppercase tracking-widest">Slot request</p>
            <h2
              id="staff-slot-request-title"
              className="text-[#1E2A35] leading-none mt-1"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.45rem', letterSpacing: '0.05em' }}
            >
              Request this slot
            </h2>
            <p className="text-[#8A7E6E] text-xs mt-1.5 leading-relaxed">
              {formatDateLongFromKey(context.dateKey)} · {timeLabel}
              <span className="text-[#B0A898]"> · </span>
              <span className="text-[#5A5048] font-medium">{staffDisplayName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#8A7E6E] transition-all hover:bg-[#EDE8D8]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <CheckCircle size={40} className="text-green-500" />
            <p className="text-[#1E2A35] font-semibold">Request submitted</p>
            <p className="text-[#8A7E6E] text-sm max-w-xs">
              An admin will review your request. The slot stays vacant until approved.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 px-6 sm:px-8 py-4 max-h-[min(70vh,560px)] overflow-y-auto">
              {alreadyRequested && (
                <div className="sm:col-span-2 flex items-start gap-2 rounded-2xl border border-[#c49a3c]/45 bg-[#F8F0DC] px-3 py-2.5">
                  <CheckCircle size={14} className="text-[#a67f2e] shrink-0 mt-0.5" />
                  <p className="text-[#6B5420] text-xs leading-relaxed">
                    You already requested this slot. Waiting for admin approval.
                  </p>
                </div>
              )}
              <p className="sm:col-span-2 text-[#9A8E7E] text-xs leading-relaxed">
                Pending request — class details apply only after admin approval.
              </p>

              <div className="min-w-0 sm:col-span-1">
                <label htmlFor="slot-req-name" className="mb-1 block text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                  Class name <span className="normal-case tracking-normal text-[#B0A898]">(optional)</span>
                </label>
                <input
                  id="slot-req-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Morning Yoga Flow"
                  className={inputClass}
                  disabled={formLocked}
                />
                <p className="text-[#B0A898] text-[11px] mt-1 leading-relaxed">
                  If left blank, the discipline name is used by default.
                </p>
              </div>

              <div className="min-w-0 sm:col-span-1">
                <label htmlFor="slot-req-limit" className="mb-1 block text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                  Class limit{requiredMark}
                </label>
                <input
                  id="slot-req-limit"
                  type="number"
                  min={1}
                  required
                  value={classLimit}
                  placeholder="e.g. 12"
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    setClassLimit(raw === '' ? '' : Math.max(1, Number(raw) || 1));
                  }}
                  className={inputClass}
                  disabled={formLocked}
                />
              </div>

              <div className="min-w-0 sm:col-span-2">
                <label className="mb-1 block text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                  Discipline{requiredMark}
                </label>
                <StaffProfileDisciplineSelect
                  disciplines={catalogDisciplines}
                  value={disciplineId}
                  onChange={setDisciplineId}
                  disabled={formLocked}
                  loading={loadingDisciplines}
                />
                <p className="text-[#B0A898] text-[11px] mt-1 leading-relaxed">
                  All active disciplines from the studio catalog, A–Z.
                </p>
                {!loadingDisciplines && catalogDisciplines.length === 0 && (
                  <p className="text-amber-800 text-xs mt-1.5 leading-relaxed">
                    {disciplinesLoadError
                      ? 'Could not load disciplines. Try again or contact support.'
                      : 'No active disciplines are in the catalog yet. Ask an admin to add disciplines.'}
                  </p>
                )}
              </div>

              <div className="min-w-0 sm:col-span-1 flex flex-col">
                <label htmlFor="slot-req-desc" className="mb-1 block text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                  Description (optional)
                </label>
                <textarea
                  id="slot-req-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`${inputClass} min-h-[5.25rem] flex-1 resize-none`}
                  placeholder="Short class description…"
                  disabled={formLocked}
                />
              </div>

              <div className="min-w-0 sm:col-span-1 flex flex-col">
                <label htmlFor="slot-req-note" className="mb-1 block text-[#8A7E6E] text-[10px] uppercase tracking-widest">
                  Note to admin (optional)
                </label>
                <textarea
                  id="slot-req-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={`${inputClass} min-h-[5.25rem] flex-1 resize-none`}
                  placeholder="Anything ops should know…"
                  disabled={formLocked}
                />
              </div>

              {error && (
                <div className="sm:col-span-2 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}
            </div>

            {canWithdraw ? (
              <div className="border-t border-[#D4CDB5]/50 px-6 sm:px-8 py-4">
                <PendingPortalRequestWithdrawActions
                  variant="panel"
                  closeLabel="Close"
                  confirmingWithdraw={confirmWithdraw}
                  withdrawing={withdrawing}
                  withdrawError={withdrawError}
                  onClose={handleClose}
                  onStartWithdraw={() => {
                    setWithdrawError(null);
                    setConfirmWithdraw(true);
                  }}
                  onConfirmWithdraw={handleWithdraw}
                  onKeepRequest={() => {
                    setConfirmWithdraw(false);
                    setWithdrawError(null);
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 border-t border-[#D4CDB5]/50 px-6 sm:px-8 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-full border border-[#D4CDB5]/70 py-2.5 text-sm font-medium text-[#8A7E6E] transition-all hover:bg-[#EDE8D8] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || alreadyRequested}
                  className={`action-button flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-all disabled:cursor-default ${
                    alreadyRequested
                      ? 'bg-[#c49a3c]/25 text-[#8A6520] border border-[#c49a3c]/40'
                      : 'bg-[#1E2A35] text-white hover:bg-[#263545] disabled:opacity-50'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Submitting…
                    </>
                  ) : alreadyRequested ? (
                    'Requested'
                  ) : (
                    'Submit request'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
