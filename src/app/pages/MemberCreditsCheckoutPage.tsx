import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft,
  Check,
  Upload,
  FileImage,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Info,
  Receipt,
  CreditCard,
  Smartphone,
  QrCode,
  Copy,
  Coins,
  Loader2,
} from 'lucide-react';
import { FALLBACK_PAYMENT_CHANNELS, type PaymentChannel } from '../data/paymentChannels';
import { fetchActivePaymentChannelsForCheckout } from '../../lib/payment-channel-service';
import { cn } from '../components/ui/utils';
import { toast } from 'sonner';
import { toastCreated } from '../../lib/operation-toast';
import { uploadClassPaymentProof } from '../../lib/class-payment-service';
import type { SubscriptionPackageRecord } from '../../lib/subscription-package-service';
import {
  notifySubscriptionPackagePaymentsChanged,
  resubmitMemberSubscriptionPackagePayment,
  submitMemberSubscriptionPackagePayment,
} from '../../lib/subscription-package-payment-service';

const CHECKOUT_STEPS = ['Select package', 'Payment', 'Submitted'] as const;

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex md:hidden items-center justify-center gap-1.5 w-full">
      {CHECKOUT_STEPS.map((label, i) => {
        const num = i + 1;
        const isActive = num === step;
        const isDone = num < step;
        return (
          <div key={label} className="flex items-center gap-1.5 min-w-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide truncate max-w-[7.5rem] ${
                isActive
                  ? 'bg-[#c49a3c] text-white'
                  : isDone
                    ? 'bg-[#c49a3c]/15 text-[#8a6824]'
                    : 'bg-[#EDE8D8] text-[#9A8E7E]'
              }`}
            >
              {isDone ? <Check size={10} strokeWidth={3} className="shrink-0" /> : null}
              {label}
            </span>
            {i < CHECKOUT_STEPS.length - 1 ? (
              <ChevronRight size={12} className="text-[#D4CDB5] shrink-0" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden', className)}
    >
      <div className="border-b border-[#D4CDB5]/45 bg-[#FBF9F3]/80 px-4 py-3 sm:px-5">
        <p
          className="text-[#1E2A35] leading-none"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.05em' }}
        >
          {title}
        </p>
        {subtitle ? <p className="text-[#8A7E6E] text-xs mt-1 leading-relaxed">{subtitle}</p> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

const METHOD_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  bank: CreditCard,
  gcash: Smartphone,
  maya: Smartphone,
};

function PaymentQrImage({ url, label }: { url: string | null; label: string }) {
  if (!url) {
    return (
      <div className="w-full max-w-[10rem] aspect-square rounded-xl border-2 border-dashed border-[#D4CDB5]/70 bg-[#F8F3E8] flex flex-col items-center justify-center text-center px-3 mx-auto sm:mx-0">
        <QrCode size={22} className="text-[#B0A898] mb-2" />
        <p className="text-[#8A7E6E] text-[11px] leading-relaxed">QR not set for {label}</p>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={`${label} payment QR code`}
      className="w-full max-w-[10rem] aspect-square rounded-xl border border-[#D4CDB5]/70 bg-white p-2 object-contain mx-auto sm:mx-0 shadow-sm"
    />
  );
}

function CopyAccountButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-lg border border-[#D4CDB5]/60 bg-white px-2 py-1 text-[10px] font-semibold text-[#5A5048] hover:bg-[#EDE8D8] transition-colors"
    >
      {copied ? <Check size={12} className="text-[#6B8E6B]" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

type CheckoutLocationState = {
  pkg: SubscriptionPackageRecord;
  resubmitPaymentId?: string;
  rejectionNote?: string;
};

export default function MemberCreditsCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as CheckoutLocationState | null;
  const pkg = state?.pkg;
  const resubmitPaymentId = state?.resubmitPaymentId;
  const rejectionNote = state?.rejectionNote?.trim() ?? '';

  const [step, setStep] = useState<2 | 3>(2);
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>(FALLBACK_PAYMENT_CHANNELS);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState(FALLBACK_PAYMENT_CHANNELS[0]?.id ?? '');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<{ file?: string }>({});
  const [requestPhysicalReceipt, setRequestPhysicalReceipt] = useState(false);
  const [transactionDetailsOpen, setTransactionDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedUid, setSubmittedUid] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pkg) navigate('/credits', { replace: true });
  }, [pkg, navigate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setChannelsLoading(true);
      const { data, error } = await fetchActivePaymentChannelsForCheckout();
      if (cancelled) return;
      if (error) toast.error(error);
      if (data.length > 0) {
        setPaymentChannels(data);
        setPaymentMethod((prev) => (data.some((c) => c.id === prev) ? prev : data[0].id));
      }
      setChannelsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pkg) return null;

  const amount = pkg.priceAmount;
  const channel: PaymentChannel | undefined =
    paymentChannels.find((item) => item.id === paymentMethod) ?? paymentChannels[0];
  const canSubmit = Boolean(uploadedFile) && !channelsLoading && Boolean(paymentMethod);

  const handleFileChange = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setErrors((e) => ({ ...e, file: 'Please upload a JPG, PNG, WEBP, or PDF file.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((e) => ({ ...e, file: 'File must be under 10MB.' }));
      return;
    }
    setUploadedFile(file);
    setErrors((e) => ({ ...e, file: undefined }));
  };

  const handleSubmit = async () => {
    if (!uploadedFile) {
      setErrors({ file: 'Please upload your proof of payment.' });
      return;
    }
    if (channelsLoading || !paymentMethod || paymentMethod.startsWith('fallback-')) {
      toast.error('Payment channels are still loading. Please wait a moment.');
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
        subscriptionPackageId: pkg.id,
        paymentChannelId: paymentMethod,
        paymentReference: reference.trim(),
        proofStoragePath: upload.storagePath,
        proofOriginalFilename: uploadedFile.name,
        amountPaid: amount,
        memberNotes: notes.trim(),
        requestPhysicalReceipt,
      };
      const result = resubmitPaymentId
        ? await resubmitMemberSubscriptionPackagePayment({
            paymentId: resubmitPaymentId,
            paymentChannelId: payload.paymentChannelId,
            paymentReference: payload.paymentReference,
            proofStoragePath: payload.proofStoragePath,
            proofOriginalFilename: payload.proofOriginalFilename,
            memberNotes: payload.memberNotes,
            requestPhysicalReceipt: payload.requestPhysicalReceipt,
          })
        : await submitMemberSubscriptionPackagePayment(payload);

      if (!result.success) {
        toast.error(result.error ?? 'Could not submit payment.');
        return;
      }
      notifySubscriptionPackagePaymentsChanged();
      toastCreated(resubmitPaymentId ? 'Payment resubmitted' : 'Payment submission');
      setSubmittedUid(result.uid ?? null);
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 3) {
    return (
      <div className="bg-[#F8F3E8] min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-xl p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#c49a3c]/15 flex items-center justify-center text-[#c49a3c] mb-4">
            <Check size={28} strokeWidth={2.5} />
          </div>
          <h1
            className="text-[#1E2A35] mb-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.75rem', letterSpacing: '0.04em' }}
          >
            Submitted for review
          </h1>
          <p className="text-[#8A7E6E] text-sm leading-relaxed mb-1">
            Reference {submittedUid ? <strong className="text-[#1E2A35]">{submittedUid}</strong> : 'saved'} — our team
            will verify your proof within 24 hours.
          </p>
          <p className="text-[#8A7E6E] text-xs leading-relaxed mb-6">
            Credits are added to your wallet after approval. You will receive email feedback either way.
          </p>
          <button
            type="button"
            onClick={() => navigate('/credits')}
            className="action-button w-full py-3 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545]"
          >
            Back to credits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F3E8] min-h-screen pb-40 lg:pb-10">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-[#D4CDB5]/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/credits')}
                className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E] mb-0.5">
                  Credit checkout
                </p>
                <h1
                  className="text-[#1E2A35] leading-none truncate"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.15rem, 2.4vw, 1.5rem)',
                    letterSpacing: '0.04em' }}
                >
                  {resubmitPaymentId ? 'Resubmit payment' : 'Payment verification'}
                </h1>
                <p className="text-[#8A7E6E] text-xs sm:text-sm mt-1 leading-relaxed">
                  Pay using your preferred channel, then upload proof for admin validation.
                </p>
              </div>
            </div>
            <StepBar step={2} />
          </div>
        </div>

        {rejectionNote ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold text-xs uppercase tracking-wide mb-1">Previous rejection</p>
            <p className="text-xs leading-relaxed">{rejectionNote}</p>
          </div>
        ) : null}

        <div className="py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_1fr] gap-6 lg:gap-8 items-start">
          <aside className="lg:sticky lg:top-24 flex flex-col gap-3">
            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden">
              <div className="h-1.5 bg-[#c49a3c]" />
              <div className="p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A8E7E] mb-2">Package</p>
                <h2
                  className="leading-none mb-2 truncate text-[#c49a3c]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem', letterSpacing: '0.04em' }}
                >
                  {pkg.name}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9A8E7E]">{pkg.uid}</p>
                <p className="text-xs text-[#8A7E6E] mt-2 leading-relaxed">
                  {pkg.creditsGranted} credits · {pkg.creditValidityDays}-day validity once granted
                </p>
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#c49a3c]/25 bg-[#c49a3c]/08 px-3 py-2.5">
                  <Info size={14} className="text-[#c49a3c] mt-0.5 shrink-0" aria-hidden />
                  <p className="text-[#6B5A40] text-[11px] leading-relaxed">
                    The {pkg.creditValidityDays}-day validity period starts when an admin approves this pack.
                    Pack payments are recognized immediately (cleared) and an official receipt is issued.
                    Drop-in class fees stay held until the studio cancellation window.
                  </p>
                </div>
                <div className="mt-4 rounded-xl bg-[#F8F3E8] border border-[#D4CDB5]/50 px-4 py-3 flex items-end justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A7E6E]">Amount due</span>
                  <span
                    className="leading-none tabular-nums text-[#c49a3c]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em',  fontSize: '1.85rem' }}
                  >
                    ₱{amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-[#D4CDB5]/45 bg-white/70 px-3 py-2.5">
              <ShieldCheck size={15} className="text-[#6B8E6B] mt-0.5 shrink-0" />
              <p className="text-[#8A7E6E] text-[11px] leading-relaxed">
                Payments stay in escrow until verified. Credits post to your wallet only after approval.
              </p>
            </div>
          </aside>

          <div className="flex flex-col gap-5 min-w-0">
            <SectionCard title="Payment method" subtitle="Choose where you sent or will send payment.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Payment method">
                {paymentChannels.map(({ id, slug, label, sub, bg }) => {
                  const Icon = METHOD_ICONS[slug] ?? Smartphone;
                  const selected = paymentMethod === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPaymentMethod(id)}
                      className={`relative flex sm:flex-col items-center gap-3 sm:gap-2 rounded-xl border-2 px-3 py-3 transition-all ${
                        selected
                          ? 'border-[#c49a3c] bg-[#c49a3c]/08'
                          : 'border-[#D4CDB5]/55 bg-[#FBF9F3] hover:border-[#c49a3c]/35'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: bg }}
                      >
                        <Icon size={18} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1 sm:flex-none text-left sm:text-center">
                        <p className={`text-sm font-bold truncate ${selected ? 'text-[#8a6824]' : 'text-[#1E2A35]'}`}>
                          {label}
                        </p>
                        <p className="text-[#9A8E7E] text-xs truncate">{sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Physical receipt" subtitle="Optional printed copy at the studio.">
              <label className="flex cursor-pointer items-center justify-between gap-4 select-none">
                <input
                  type="checkbox"
                  checked={requestPhysicalReceipt}
                  onChange={(e) => setRequestPhysicalReceipt(e.target.checked)}
                  className="sr-only"
                  aria-label="Request physical receipt at the studio"
                />
                <div className="flex items-start gap-2 min-w-0">
                  <Receipt size={18} className="text-[#c49a3c] shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-[#1E2A35]">Pick up at the studio</p>
                </div>
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
            </SectionCard>

            <SectionCard title={`${channel?.label ?? 'Payment'} details`} subtitle="Transfer the exact amount shown.">
              <div className="rounded-xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/80 p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
                  <PaymentQrImage url={channel?.qrImageUrl ?? null} label={channel?.label ?? 'method'} />
                  <div className="flex flex-col gap-3 min-w-0 text-center md:text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A8E7E]">
                      {channel?.accountHint}
                    </p>
                    {channel?.accountNumber ? (
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <p
                          className="text-[#1E2A35] tabular-nums"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em',  fontSize: '1.15rem' }}
                        >
                          {channel.accountNumber}
                        </p>
                        <CopyAccountButton value={channel.accountNumber} />
                      </div>
                    ) : null}
                    <p className="text-sm font-semibold text-[#5A5048]">{channel?.accountName}</p>
                    <div className="inline-flex self-center md:self-start items-baseline gap-2 rounded-xl bg-white border px-4 py-2.5">
                      <span className="text-[10px] font-bold uppercase text-[#9A8E7E]">Send exactly</span>
                      <span
                        className="text-[#c49a3c] tabular-nums"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em',  fontSize: '1.65rem' }}
                      >
                        ₱{amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 mt-4 bg-[#c49a3c]/08 border border-[#c49a3c]/25 rounded-xl px-3.5 py-2.5">
                <Info size={14} className="text-[#c49a3c] mt-0.5 shrink-0" />
                <p className="text-[#6B5A40] text-xs leading-relaxed">
                  Screenshot your confirmation, then upload below. Reference number is optional but helps us match
                  faster.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Proof of payment" subtitle="Required · JPG, PNG, WEBP, or PDF up to 10MB">
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
                  'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 px-4 cursor-pointer transition-all',
                  dragOver
                    ? 'border-[#c49a3c] bg-[#c49a3c]/06'
                    : uploadedFile
                      ? 'border-[#6B8E6B]/50 bg-[#6B8E6B]/06'
                      : errors.file
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
                    <FileImage size={28} className="text-[#6B8E6B] mb-2" />
                    <p className="text-sm font-semibold text-[#1E2A35]">{uploadedFile.name}</p>
                    <p className="text-xs text-[#8A7E6E] mt-1">Tap to replace</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} className="text-[#9A8E7E] mb-2" />
                    <p className="text-sm font-semibold text-[#1E2A35]">Drop file or click to upload</p>
                  </>
                )}
                {errors.file ? <p className="text-red-600 text-xs mt-2">{errors.file}</p> : null}
              </div>
            </SectionCard>

            <section className="rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                id="credits-transaction-details-trigger"
                aria-expanded={transactionDetailsOpen}
                aria-controls="credits-transaction-details-panel"
                onClick={() => setTransactionDetailsOpen((open) => !open)}
                className="flex w-full items-start justify-between gap-3 border-b border-[#D4CDB5]/45 bg-[#FBF9F3]/80 px-4 py-3 text-left transition-colors hover:bg-[#F8F3E8]/90 sm:px-5 sm:py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-[#1E2A35] leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem',
                        letterSpacing: '0.05em' }}
                    >
                      Transaction details
                    </p>
                    <span className="rounded-full border border-[#D4CDB5]/70 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A8E7E]">
                      Optional
                    </span>
                    {(reference.trim() || notes.trim()) && !transactionDetailsOpen ? (
                      <span className="rounded-full border border-[#c49a3c]/35 bg-[#c49a3c]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8a6824]">
                        Added
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[#8A7E6E] text-xs mt-1 leading-relaxed">
                    Reference number and notes help us verify faster.
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={cn(
                    'mt-0.5 shrink-0 text-[#9A8E7E] transition-transform duration-200',
                    transactionDetailsOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              <div
                id="credits-transaction-details-panel"
                role="region"
                aria-labelledby="credits-transaction-details-trigger"
                hidden={!transactionDetailsOpen}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label
                        htmlFor="credits-payment-reference"
                        className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E] mb-2"
                      >
                        Reference / transaction number
                      </label>
                      <input
                        id="credits-payment-reference"
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. GCash-2026041234567"
                        className="w-full rounded-xl border border-[#D4CDB5]/70 px-4 py-3 text-sm text-[#1E2A35] bg-[#FBF9F3] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#c49a3c]/30 focus:border-[#c49a3c]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="credits-payment-notes"
                        className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E] mb-2"
                      >
                        Notes for our team
                      </label>
                      <textarea
                        id="credits-payment-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Anything else we should know…"
                        className="w-full rounded-xl border border-[#D4CDB5]/70 px-4 py-3 text-sm text-[#1E2A35] bg-[#FBF9F3] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#c49a3c]/30 focus:border-[#c49a3c]/50 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#D4CDB5]/60 bg-white/95 backdrop-blur px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={() => void handleSubmit()}
                className="action-button w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#1E2A35] text-white text-sm font-bold hover:bg-[#263545] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Coins size={16} /> {resubmitPaymentId ? 'Resubmit for review' : 'Submit for review'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
