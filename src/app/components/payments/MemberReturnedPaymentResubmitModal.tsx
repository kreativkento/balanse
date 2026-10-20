import { useEffect, useRef, useState } from 'react';
import { FileImage, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { toastCreated } from '../../../lib/operation-toast';
import { FALLBACK_PAYMENT_CHANNELS, type PaymentChannel } from '../../data/paymentChannels';
import { fetchActivePaymentChannelsForCheckout } from '../../../lib/payment-channel-service';
import {
  resubmitMemberClassPaymentEscrow,
  uploadClassPaymentProof,
  type ClassPaymentDisplay,
} from '../../../lib/class-payment-service';
import {
  notifySubscriptionPackagePaymentsChanged,
  resubmitMemberSubscriptionPackagePayment,
  type SubscriptionPackagePaymentDisplay,
} from '../../../lib/subscription-package-payment-service';
import { cn } from '../ui/utils';

type Props =
  | {
      kind: 'class';
      payment: ClassPaymentDisplay;
      onClose: () => void;
      onSuccess: () => void;
    }
  | {
      kind: 'subscription';
      payment: SubscriptionPackagePaymentDisplay;
      onClose: () => void;
      onSuccess: () => void;
    };

export function MemberReturnedPaymentResubmitModal(props: Props) {
  const { payment, onClose, onSuccess } = props;

  const [channels, setChannels] = useState<PaymentChannel[]>(FALLBACK_PAYMENT_CHANNELS);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(payment.paymentChannelId);
  const [reference, setReference] = useState(payment.paymentReference);
  const [notes, setNotes] = useState(payment.memberNotes);
  const [requestPhysicalReceipt, setRequestPhysicalReceipt] = useState(payment.requestPhysicalReceipt);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title =
    props.kind === 'class'
      ? payment.className?.trim() || 'Class payment'
      : payment.packageName;

  const subtitle = props.kind === 'class' ? payment.uid : payment.uid;
  const reviewNote = payment.reviewNote?.trim() ?? '';
  const amount =
    props.kind === 'class' ? payment.amountPaid : payment.amountPaid;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setChannelsLoading(true);
      const { data, error } = await fetchActivePaymentChannelsForCheckout();
      if (cancelled) return;
      if (error) toast.error(error);
      if (data.length > 0) {
        setChannels(data);
        setPaymentMethod((prev) => (data.some((c) => c.id === prev) ? prev : data[0].id));
      }
      setChannelsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setFileError('Please upload a JPG, PNG, WEBP, or PDF file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File must be under 10MB.');
      return;
    }
    setUploadedFile(file);
    setFileError(null);
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      setFileError('Upload an updated proof of payment to resubmit.');
      return;
    }
    if (channelsLoading || !paymentMethod || paymentMethod.startsWith('fallback-')) {
      toast.error('Payment channels are still loading.');
      return;
    }

    setSubmitting(true);
    try {
      const upload = await uploadClassPaymentProof(uploadedFile);
      if (!upload.ok) {
        toast.error(upload.error);
        return;
      }

      const payload = {
        paymentId: payment.id,
        paymentChannelId: paymentMethod,
        paymentReference: reference.trim(),
        proofStoragePath: upload.storagePath,
        proofOriginalFilename: uploadedFile.name,
        memberNotes: notes.trim(),
        requestPhysicalReceipt,
      };

      const result =
        props.kind === 'class'
          ? await resubmitMemberClassPaymentEscrow(payload)
          : await resubmitMemberSubscriptionPackagePayment(payload);

      if (!result.success) {
        toast.error(result.error ?? 'Could not resubmit payment.');
        return;
      }

      if (props.kind === 'subscription') {
        notifySubscriptionPackagePaymentsChanged();
      }

      toastCreated('Payment resubmitted');
      onSuccess();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(30,42,53,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-2xl w-full max-w-lg my-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="returned-payment-title"
      >
        <div className="px-6 pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-0.5">Returned — resubmit proof</p>
            <p className="text-[#9A8E7E] text-[11px] mt-1 leading-relaxed">
              This is a proof review, not a cash refund. Update the payment and send it back for approval.
            </p>
            <h3
              id="returned-payment-title"
              className="text-[#1E2A35] truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.35rem', letterSpacing: '0.05em' }}
            >
              {title}
            </h3>
            <p className="text-[#9A8E7E] text-xs font-mono mt-0.5">{subtitle} · ₱{amount.toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {reviewNote ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-red-700 text-xs font-semibold mb-1">Note from our team</p>
              <p className="text-red-600 text-xs leading-relaxed">{reviewNote}</p>
            </div>
          ) : (
            <p className="text-[#5A5048] text-sm leading-relaxed">
              Your payment was returned for review. Upload a new proof and resubmit when you are ready.
            </p>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9A8E7E] mb-2">Payment method</p>
            <div className="flex flex-wrap gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setPaymentMethod(ch.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    paymentMethod === ch.id
                      ? 'border-[#c49a3c] bg-[#c49a3c]/10 text-[#8a6824]'
                      : 'border-[#D4CDB5]/70 text-[#5A5048] hover:border-[#c49a3c]/40',
                  )}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9A8E7E] mb-2">
              Updated proof of payment <span className="text-red-500">*</span>
            </p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileChange(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 px-4 cursor-pointer transition-all',
                dragOver
                  ? 'border-[#c49a3c] bg-[#c49a3c]/06'
                  : uploadedFile
                    ? 'border-[#6B8E6B]/50 bg-[#6B8E6B]/06'
                    : fileError
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-[#D4CDB5]/70 bg-[#FBF9F3] hover:border-[#c49a3c]/45',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
              />
              {uploadedFile ? (
                <>
                  <FileImage size={26} className="text-[#6B8E6B] mb-2" />
                  <p className="text-sm font-semibold text-[#1E2A35] text-center">{uploadedFile.name}</p>
                  <p className="text-xs text-[#8A7E6E] mt-1">Tap to replace</p>
                </>
              ) : (
                <>
                  <Upload size={26} className="text-[#9A8E7E] mb-2" />
                  <p className="text-sm font-semibold text-[#1E2A35]">Drop file or click to upload</p>
                </>
              )}
              {fileError ? <p className="text-red-600 text-xs mt-2">{fileError}</p> : null}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#9A8E7E]">Reference (optional)</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#D4CDB5]/70 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#c49a3c]/25"
              placeholder="Transaction reference"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 select-none">
            <input
              type="checkbox"
              checked={requestPhysicalReceipt}
              onChange={(e) => setRequestPhysicalReceipt(e.target.checked)}
              className="sr-only"
            />
            <span className="text-sm text-[#1E2A35]">Printed receipt at front desk</span>
            <span
              aria-hidden
              className={cn(
                'relative flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors',
                requestPhysicalReceipt ? 'bg-[#c49a3c]' : 'bg-[#D4CDB5]',
              )}
            >
              <span
                className={cn(
                  'block size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
                  requestPhysicalReceipt ? 'translate-x-5' : 'translate-x-0',
                )}
              />
            </span>
          </label>
        </div>

        <div className="px-6 pb-6 pt-2 shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm font-medium hover:bg-[#EDE8D8]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="action-button flex-1 py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting…
              </>
            ) : (
              'Resubmit for review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
