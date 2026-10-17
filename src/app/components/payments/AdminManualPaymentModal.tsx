import { useEffect, useMemo, useState } from 'react';
import { Banknote, Check, CreditCard, Loader2, Smartphone, Upload, X } from 'lucide-react';
import { Switch } from '../ui/switch';
import { SearchableIdSelect } from '../SearchableIdSelect';
import type { ClientDirectoryItem } from '../../../lib/admin-service';
import type { ClassDisplay } from '../../../lib/class-service';
import type { PaymentChannelRecord } from '../../../lib/payment-channel-service';
import {
  adminCreateClassPayment,
  uploadClassPaymentProof,
} from '../../../lib/class-payment-service';
import { toastCreated, toastOperationFailed } from '../../../lib/operation-toast';

const PH_TZ = 'Asia/Manila';

function formatClassOption(c: ClassDisplay): string {
  const start = new Date(c.startsAt);
  const when = new Intl.DateTimeFormat('en-PH', {
    timeZone: PH_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
  const label = c.name.trim() || c.disciplineName || 'Class';
  return `${label} · ${when}`;
}

function methodLeading(slug: string, label: string) {
  const s = slug.toLowerCase();
  const l = label.toLowerCase();
  if (s === 'cash' || l === 'cash') {
    return <Banknote size={14} className="shrink-0 text-[#1E2A35]" />;
  }
  if (l.includes('gcash')) {
    return <Smartphone size={14} className="shrink-0" style={{ color: '#007DFF' }} />;
  }
  if (l.includes('maya')) {
    return <Smartphone size={14} className="shrink-0" style={{ color: '#46BFA8' }} />;
  }
  return <CreditCard size={14} className="shrink-0 text-[#3A4A5A]" />;
}

export function AdminManualPaymentModal({
  clients,
  classes,
  channels,
  loadingOptions,
  onClose,
  onCreated,
}: {
  clients: ClientDirectoryItem[];
  classes: ClassDisplay[];
  channels: PaymentChannelRecord[];
  loadingOptions: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [accountId, setAccountId] = useState('');
  const [classId, setClassId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [requestPhysicalReceipt, setRequestPhysicalReceipt] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const methodChannels = useMemo(() => {
    const active = channels.filter((c) => c.isActive);
    const cash = active.find(
      (c) => c.slug === 'cash' || c.label.trim().toLowerCase() === 'cash',
    );
    const rest = active
      .filter((c) => c !== cash)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    return cash ? [cash, ...rest] : rest;
  }, [channels]);

  const enrollableClasses = useMemo(
    () =>
      classes
        .filter(
          (c) =>
            (c.statusBlock === 'active' || c.statusBlock === 'occupied')
            && c.statusClass !== 'close',
        )
        .sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
    [classes],
  );

  const clientOptions = useMemo(
    () =>
      [...clients]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({
          value: c.id,
          label: c.name,
          keywords: c.email,
        })),
    [clients],
  );

  const classOptions = useMemo(
    () =>
      enrollableClasses.map((c) => ({
        value: c.id,
        label: formatClassOption(c),
        keywords: c.disciplineName ?? '',
      })),
    [enrollableClasses],
  );

  const methodOptions = useMemo(
    () =>
      methodChannels.map((ch) => ({
        value: ch.id,
        label: ch.label,
        keywords: `${ch.slug} ${ch.subtitle}`,
      })),
    [methodChannels],
  );

  const channelById = useMemo(
    () => new Map(methodChannels.map((ch) => [ch.id, ch])),
    [methodChannels],
  );

  useEffect(() => {
    if (methodChannels.length > 0 && !channelId) {
      const cash = methodChannels.find((c) => c.slug === 'cash');
      setChannelId(cash?.id ?? methodChannels[0].id);
    }
  }, [methodChannels, channelId]);

  const inputClass =
    'w-full px-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-white text-[#1E2A35] text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25 focus:border-[#c49a3c]/50 transition-all placeholder-[#C0B8A8]';

  const handleSubmit = async () => {
    setFormError('');
    if (!accountId) {
      setFormError('Select a student.');
      return;
    }
    if (!classId) {
      setFormError('Select a class.');
      return;
    }
    if (!channelId) {
      setFormError('Select a payment method.');
      return;
    }
    const amountNum = Number(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      let proofStoragePath = '';
      if (proofFile) {
        const upload = await uploadClassPaymentProof(proofFile);
        if (!upload.ok) {
          setFormError(upload.error);
          toastOperationFailed(upload.error);
          return;
        }
        proofStoragePath = upload.storagePath;
      }

      const result = await adminCreateClassPayment({
        accountId,
        classId,
        paymentChannelId: channelId,
        amountPaid: amountNum,
        paymentReference: reference.trim(),
        memberNotes: notes.trim(),
        requestPhysicalReceipt,
        proofStoragePath,
        proofOriginalFilename: proofFile?.name ?? '',
        autoApprove,
      });

      if (!result.success) {
        const message = result.error ?? 'Could not save payment record.';
        setFormError(message);
        toastOperationFailed(message);
        return;
      }

      toastCreated(
        result.status === 'approved' ? 'Payment record (approved)' : 'Payment record',
      );
      await onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selectedChannel = channelById.get(channelId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4">
        <div className="px-7 pt-7 pb-5 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3">
          <div>
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Manual entry</p>
            <h3
              className="text-[#1E2A35] leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', letterSpacing: '0.05em' }}
            >
              Add payment record
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-4 max-h-[min(70vh,640px)] overflow-y-auto">
          {loadingOptions ? (
            <p className="text-[#8A7E6E] text-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Loading form options…
            </p>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
              Student <span className="text-red-500">*</span>
            </span>
            <SearchableIdSelect
              value={accountId}
              onChange={setAccountId}
              options={clientOptions}
              placeholder="Search student…"
              searchPlaceholder="Name or email…"
              emptyText="No students match."
              loading={loadingOptions}
              disabled={loadingOptions}
              invalid={Boolean(formError) && !accountId}
              renderOption={(option) => (
                <span className="flex flex-col min-w-0 gap-0.5">
                  <span className="truncate font-medium">{option.label}</span>
                  {option.keywords ? (
                    <span className="truncate text-xs text-[#8A7E6E]">{option.keywords}</span>
                  ) : null}
                </span>
              )}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
              Class <span className="text-red-500">*</span>
            </span>
            <SearchableIdSelect
              value={classId}
              onChange={setClassId}
              options={classOptions}
              placeholder="Select class…"
              searchPlaceholder="Search class or date…"
              emptyText="No enrollable classes."
              loading={loadingOptions}
              disabled={loadingOptions}
              invalid={Boolean(formError) && !classId}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                Method <span className="text-red-500">*</span>
              </span>
              <SearchableIdSelect
                value={channelId}
                onChange={setChannelId}
                options={methodOptions}
                placeholder="Select method…"
                searchPlaceholder="Search method…"
                emptyText={
                  methodOptions.length === 0
                    ? 'No active channels. Add Cash or other methods under Payment Channels.'
                    : 'No methods match.'
                }
                loading={loadingOptions}
                disabled={loadingOptions || methodOptions.length === 0}
                invalid={Boolean(formError) && !channelId}
                renderLeading={() =>
                  selectedChannel
                    ? methodLeading(selectedChannel.slug, selectedChannel.label)
                    : null
                }
                renderOption={(option) => {
                  const ch = channelById.get(option.value);
                  return (
                    <span className="flex items-center gap-2 min-w-0">
                      {methodLeading(ch?.slug ?? '', option.label)}
                      <span className="truncate">{option.label}</span>
                    </span>
                  );
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
                Amount (₱) <span className="text-red-500">*</span>
              </span>
              <input
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
              Reference / OR number
            </span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Walk-in cash, front desk, etc."
              className={`${inputClass} resize-none bg-[#F8F3E8]`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A7E6E]">
              Proof of payment (optional)
            </span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#D4CDB5]/70 bg-[#F8F3E8] text-sm text-[#5A5048] cursor-pointer hover:bg-[#EDE8D8] transition-colors">
                <Upload size={14} />
                {proofFile ? proofFile.name : 'Upload file'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {proofFile ? (
                <button
                  type="button"
                  onClick={() => setProofFile(null)}
                  className="text-xs text-[#8A7E6E] hover:text-[#1E2A35]"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </label>

          <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/80 px-4 py-3">
            <div>
              <p className="text-[#1E2A35] text-sm font-semibold">Physical receipt</p>
              <p className="text-[#8A7E6E] text-xs mt-0.5">Student wants a printed copy at the studio.</p>
            </div>
            <Switch
              checked={requestPhysicalReceipt}
              onCheckedChange={setRequestPhysicalReceipt}
              aria-label="Request physical receipt"
              className="data-[state=checked]:bg-[#c49a3c] data-[state=unchecked]:bg-[#D4CDB5] h-6 w-11 [&_[data-slot=switch-thumb]]:size-5"
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/80 px-4 py-3">
            <div>
              <p className="text-[#1E2A35] text-sm font-semibold">Verify &amp; enroll now</p>
              <p className="text-[#8A7E6E] text-xs mt-0.5">
                When off, the record stays pending until you approve it like other submissions.
              </p>
            </div>
            <Switch
              checked={autoApprove}
              onCheckedChange={setAutoApprove}
              aria-label="Verify and enroll immediately"
              className="data-[state=checked]:bg-[#c49a3c] data-[state=unchecked]:bg-[#D4CDB5] h-6 w-11 [&_[data-slot=switch-thumb]]:size-5"
            />
          </div>

          {formError ? (
            <p className="text-red-600 text-sm" role="alert">
              {formError}
            </p>
          ) : null}
        </div>

        <div className="px-7 pb-7 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving || loadingOptions}
            className="action-button flex-1 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] active:scale-[0.97] transition-all shadow-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Check size={16} /> Add record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
