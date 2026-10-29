import { useState, useRef, useEffect, type ComponentType, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft, Check, Upload, FileImage,
  X, ShieldCheck, ChevronRight, ChevronDown, Info, Receipt,
  CreditCard, Smartphone, QrCode, Copy, Calendar, Clock, User, Tag, Coins,
} from 'lucide-react';
import { FALLBACK_PAYMENT_CHANNELS, type PaymentChannel } from '../data/paymentChannels';
import { fetchActivePaymentChannelsForCheckout } from '../../lib/payment-channel-service';
import { cn } from '../components/ui/utils';
import { toast } from 'sonner';
import { toastCreated } from '../../lib/operation-toast';
import {
  submitMemberClassPayment,
  uploadClassPaymentProof,
} from '../../lib/class-payment-service';
import {
  enrollMemberClassWithCredit,
  fetchMemberCreditWalletBalance,
} from '../../lib/member-credits-service';

type CheckoutMode = 'payment' | 'credit';

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────

const CHECKOUT_STEPS = ['Select Class', 'Payment', 'Confirmed'] as const;

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <>
      <div className="hidden md:flex items-center gap-0">
        {CHECKOUT_STEPS.map((label, i) => {
          const num = i + 1;
          const isActive = num === step;
          const isDone = num < step;
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? 'bg-[#c49a3c] text-white'
                      : isActive
                        ? 'bg-[#c49a3c] text-white shadow-[0_0_0_3px_rgba(196,154,60,0.2)]'
                        : 'bg-[#EDE8D8] text-[#9A8E7E]'
                  }`}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '0.7rem',  letterSpacing: '0.05em' }}
                >
                  {isDone ? <Check size={13} strokeWidth={3} /> : num}
                </div>
                <span
                  className={`text-[10px] mt-1 whitespace-nowrap ${isActive ? 'text-[#c49a3c] font-semibold' : 'text-[#B0A898]'}`}
                  style={{ letterSpacing: '0.05em' }}
                >
                  {label}
                </span>
              </div>
              {i < CHECKOUT_STEPS.length - 1 && (
                <div className={`w-14 h-px mx-1.5 mb-4 transition-colors ${isDone ? 'bg-[#c49a3c]' : 'bg-[#D4CDB5]'}`} />
              )}
            </div>
          );
        })}
      </div>
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
    </>
  );
}

function PhysicalReceiptFields({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <SectionCard
      title="Physical receipt"
      subtitle="Saved on your payment record when you submit."
      className={cn('overflow-visible', checked && 'ring-1 ring-[#c49a3c]/35')}
    >
      <label className="flex cursor-pointer items-start justify-between gap-4 select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="sr-only"
          aria-label="Request physical receipt at the studio"
        />
        <div className="flex items-start gap-2.5 min-w-0">
          <Receipt size={18} className="text-[#c49a3c] shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="text-[#1E2A35] text-sm font-semibold">Pick up at the studio</p>
            <p className="text-[#8A7E6E] text-xs mt-1 leading-relaxed">
              An e-receipt is emailed when the cancellation window closes and the payment is cleared. Turn this on if you also want a printed copy.
            </p>
            {checked ? (
              <p className="text-[#c49a3c] text-xs mt-2 font-medium">
                Printed copy requested — we&apos;ll have it ready at the studio.
              </p>
            ) : null}
          </div>
        </div>
        <span
          aria-hidden
          className={cn(
            'relative mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors',
            checked ? 'bg-[#c49a3c]' : 'bg-[#D4CDB5]',
          )}
        >
          <span
            className={cn(
              'block size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </span>
      </label>
    </SectionCard>
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

// ─────────────────────────────────────────────
// CLASS ACCENT COLORS
// ─────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  Yoga: '#c49a3c',
  Calisthenics: '#3A4A5A',
  'Animal Flow': '#6B8E6B',
  Groundworks: '#8B6F5A',
  'Circuit Training': '#B86A4A',
  'Mat Pilates': '#9A7A8A',
  Kickboxing: '#7A3A4A',
  Capoeira: '#A07050',
  'Personal Coaching': '#a67f2e',
};

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
        <p className="text-[#B0A898] text-[10px] mt-1">Use account details</p>
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

function BookingSummaryRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-[#D4CDB5]/35 last:border-0">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F8F3E8] text-[#9A8E7E]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">{label}</p>
        <p className="text-[#1E2A35] text-sm font-semibold leading-snug truncate" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MEMBER PAYMENT PORTAL
// ─────────────────────────────────────────────

export default function MemberPaymentPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state?.booking;

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
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('payment');
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditsLoading, setCreditsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!booking) navigate('/class-schedule');
  }, [booking, navigate]);

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCreditsLoading(true);
      const { balance, error } = await fetchMemberCreditWalletBalance();
      if (cancelled) return;
      if (error) toast.error(error);
      setCreditBalance(balance);
      setCreditsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!booking) return null;

  const canUseCredits = !creditsLoading && creditBalance >= 1;
  const hasPaymentProof = uploadedFile !== null;
  const canSubmitCheckout =
    checkoutMode === 'credit'
      ? canUseCredits
      : hasPaymentProof && !channelsLoading && Boolean(paymentMethod);

  const classColor = CLASS_COLORS[booking.className] || '#c49a3c';
  const channel: PaymentChannel | undefined =
    paymentChannels.find((item) => item.id === paymentMethod) ?? paymentChannels[0];
  const amount = booking?.priceNum ?? 360;
  const amountDisplay = booking?.price ?? `₱${amount.toLocaleString()}`;

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleSubmitCredit = async () => {
    const classId = booking.classId as string | undefined;
    if (!classId) {
      toast.error('Missing class information. Please go back and try enrolling again.');
      return;
    }
    if (!canUseCredits) {
      toast.error('You need at least 1 available credit to enroll.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await enrollMemberClassWithCredit(classId);
      if (!result.success) {
        toast.error(result.error ?? 'Could not enroll with credits.');
        return;
      }
      toastCreated('Enrollment confirmed');
      navigate('/booking-pending', {
        state: {
          booking,
          creditEnrollment: true,
          balanceAfter: result.balanceAfter,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (checkoutMode === 'credit') {
      await handleSubmitCredit();
      return;
    }
    if (!uploadedFile) {
      setErrors({ file: 'Please upload your proof of payment.' });
      return;
    }
    const classId = booking.classId as string | undefined;
    if (!classId) {
      toast.error('Missing class information. Please go back and try enrolling again.');
      return;
    }
    if (channelsLoading || !paymentMethod || paymentMethod.startsWith('fallback-')) {
      toast.error('Payment channels are still loading. Please wait a moment.');
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const upload = await uploadClassPaymentProof(uploadedFile);
      if (!upload.ok) {
        toast.error(upload.error);
        return;
      }
      const result = await submitMemberClassPayment({
        classId,
        paymentChannelId: paymentMethod,
        paymentReference: reference.trim(),
        proofStoragePath: upload.storagePath,
        proofOriginalFilename: uploadedFile.name,
        amountPaid: amount,
        memberNotes: notes.trim(),
        requestPhysicalReceipt,
      });
      if (!result.success) {
        toast.error(result.error ?? 'Could not submit payment.');
        return;
      }
      toastCreated('Payment submission');
      navigate('/booking-pending', {
        state: {
          booking,
          reference: reference.trim(),
          fileName: uploadedFile.name,
          notes: notes.trim(),
          requestPhysicalReceipt,
          paymentMethod: channel?.label,
          paymentUid: result.uid,
          waitlisted: true,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/class-schedule');
  };

  return (
    <div className="bg-[#F8F3E8] min-h-screen pb-40 lg:pb-10">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-5 sm:pt-6 pb-4 sm:pb-5 border-b border-[#D4CDB5]/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A8E7E] mb-0.5">
                  Checkout
                </p>
                <h1
                  className="text-[#1E2A35] leading-none truncate"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.15rem, 2.4vw, 1.5rem)',
                    letterSpacing: '0.04em' }}
                >
                  {checkoutMode === 'credit' ? 'Use session credit' : 'Payment verification'}
                </h1>
                <p className="text-[#8A7E6E] text-xs sm:text-sm mt-1 leading-relaxed">
                  {checkoutMode === 'credit'
                    ? 'Apply 1 credit from your wallet — enrollment is confirmed immediately.'
                    : 'Pay online using your preferred channel, then upload proof so we can confirm your spot.'}
                </p>
              </div>
            </div>
            <div className="shrink-0 sm:pt-1">
              <StepBar step={2} />
            </div>
          </div>
        </div>

        <div className="py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_1fr] gap-6 lg:gap-8 items-start">
          <aside className="lg:sticky lg:top-24 flex flex-col gap-3 order-1">
            <div className="rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: classColor }} />
              <div className="p-4 sm:p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A8E7E] mb-2">
                  Your booking
                </p>
                <h2
                  className="leading-none mb-4 truncate"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem',
                    letterSpacing: '0.04em',
                    color: classColor }}
                  title={booking.className}
                >
                  {booking.className}
                </h2>

                <div className="flex flex-col">
                  <BookingSummaryRow
                    icon={<Calendar size={14} />}
                    label="Date"
                    value={booking.dateLabel}
                  />
                  <BookingSummaryRow icon={<Clock size={14} />} label="Time" value={booking.time} />
                  <BookingSummaryRow
                    icon={<Tag size={14} />}
                    label="Duration"
                    value={booking.duration}
                  />
                  {booking.trainer ? (
                    <BookingSummaryRow
                      icon={<User size={14} />}
                      label="Coach"
                      value={booking.trainer}
                    />
                  ) : null}
                  <BookingSummaryRow
                    icon={<Receipt size={14} />}
                    label="Pass type"
                    value="Single class pass"
                  />
                </div>

                <div className="mt-4 rounded-xl bg-[#F8F3E8] border border-[#D4CDB5]/50 px-4 py-3 flex items-end justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A7E6E]">
                    {checkoutMode === 'credit' ? 'Credit cost' : 'Amount due'}
                  </span>
                  <span
                    className="leading-none tabular-nums"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.85rem',
                      letterSpacing: '0.04em',
                      color: classColor }}
                  >
                    {checkoutMode === 'credit' ? '1 credit' : amountDisplay}
                  </span>
                </div>
                {checkoutMode === 'credit' ? (
                  <p className="text-[#8A7E6E] text-[11px] mt-2">
                    Balance: {creditsLoading ? '…' : creditBalance} credit{creditBalance === 1 ? '' : 's'}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-[#D4CDB5]/45 bg-white/70 px-3 py-2.5">
              <ShieldCheck size={15} className="text-[#6B8E6B] mt-0.5 shrink-0" />
              <p className="text-[#8A7E6E] text-[11px] leading-relaxed">
                {checkoutMode === 'credit'
                  ? 'Credits are deducted instantly. No payment proof is required.'
                  : 'Payments are reviewed manually. We never auto-charge your account.'}
              </p>
            </div>
          </aside>

          <div className="flex flex-col gap-5 order-2 min-w-0">
            <SectionCard title="How to enroll" subtitle="Pay online or use credits from your wallet.">
              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                role="radiogroup"
                aria-label="Checkout method"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={checkoutMode === 'payment'}
                  onClick={() => setCheckoutMode('payment')}
                  className={`relative flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                    checkoutMode === 'payment'
                      ? 'border-[#c49a3c] bg-[#c49a3c]/08'
                      : 'border-[#D4CDB5]/55 bg-[#FBF9F3] hover:border-[#c49a3c]/35'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#3A4A5A] flex items-center justify-center shrink-0">
                    <CreditCard size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1E2A35]">Pay online</p>
                    <p className="text-[#9A8E7E] text-xs">Choose your preferred payment channel</p>
                  </div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={checkoutMode === 'credit'}
                  disabled={!canUseCredits && !creditsLoading}
                  onClick={() => setCheckoutMode('credit')}
                  className={`relative flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    checkoutMode === 'credit'
                      ? 'border-[#c49a3c] bg-[#c49a3c]/08'
                      : 'border-[#D4CDB5]/55 bg-[#FBF9F3] hover:border-[#c49a3c]/35'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#c49a3c] flex items-center justify-center shrink-0">
                    <Coins size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1E2A35]">Use session credit</p>
                    <p className="text-[#9A8E7E] text-xs">
                      {creditsLoading
                        ? 'Loading balance…'
                        : canUseCredits
                          ? `${creditBalance} available · instant enroll`
                          : 'No credits available'}
                    </p>
                  </div>
                </button>
              </div>
            </SectionCard>

            {checkoutMode === 'credit' ? (
              <SectionCard
                title="Confirm credit enrollment"
                subtitle="One credit will be deducted and you will be added to the class roster immediately."
              >
                <div className="rounded-xl border border-[#c49a3c]/30 bg-[#c49a3c]/08 px-4 py-4">
                  <p className="text-[#1E2A35] text-sm font-semibold">1 credit → {booking.className}</p>
                  <p className="text-[#8A7E6E] text-xs mt-2 leading-relaxed">
                    This does not create a payment record. The deduction appears in your credit transaction history.
                  </p>
                </div>
              </SectionCard>
            ) : null}

            {checkoutMode === 'payment' ? (
            <>
            <SectionCard title="Payment method" subtitle="Choose where you sent or will send payment.">
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3"
                role="radiogroup"
                aria-label="Payment method"
              >
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
                      className={`relative flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 rounded-xl border-2 px-3 py-3 sm:py-4 text-left sm:text-center transition-all ${
                        selected
                          ? 'border-[#c49a3c] bg-[#c49a3c]/08 shadow-[0_0_0_1px_rgba(196,154,60,0.15)]'
                          : 'border-[#D4CDB5]/55 bg-[#FBF9F3] hover:border-[#c49a3c]/35'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: bg }}
                      >
                        <Icon size={18} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1 sm:flex-none">
                        <p className={`text-sm font-bold truncate ${selected ? 'text-[#8a6824]' : 'text-[#1E2A35]'}`}>
                          {label}
                        </p>
                        <p className="text-[#9A8E7E] text-xs truncate">{sub}</p>
                      </div>
                      {selected ? (
                        <span className="absolute top-2 right-2 sm:static sm:mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#c49a3c] text-white">
                          <Check size={11} strokeWidth={3} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <PhysicalReceiptFields
              checked={requestPhysicalReceipt}
              onCheckedChange={setRequestPhysicalReceipt}
            />

            <SectionCard
              title={`${channel?.label ?? 'Payment'} details`}
              subtitle={
                channel?.qrImageUrl
                  ? 'Scan the QR or use the account details — amount must match exactly.'
                  : 'Transfer the exact amount using the details below.'
              }
            >
              <div className="rounded-xl border border-[#D4CDB5]/50 bg-[#F8F3E8]/80 p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
                  <PaymentQrImage url={channel?.qrImageUrl ?? null} label={channel?.label ?? 'this method'} />
                  <div className="flex flex-col gap-3 min-w-0 text-center md:text-left">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A8E7E]">
                        {channel?.accountHint}
                      </p>
                      {channel?.accountNumber ? (
                        <div className="mt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <p
                            className="text-[#1E2A35] tabular-nums"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem',
                              letterSpacing: '0.05em' }}
                          >
                            {channel.accountNumber}
                          </p>
                          <CopyAccountButton value={channel.accountNumber} />
                        </div>
                      ) : null}
                      <p className="text-[#5A5048] text-sm font-semibold mt-1">{channel?.accountName}</p>
                    </div>
                    <div className="inline-flex self-center md:self-start items-baseline gap-2 rounded-xl bg-white border border-[#D4CDB5]/55 px-4 py-2.5 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A8E7E]">
                        Send exactly
                      </span>
                      <span
                        className="text-[#c49a3c] leading-none tabular-nums"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem',
                          letterSpacing: '0.04em' }}
                      >
                        ₱{amount.toLocaleString()}.00
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 mt-4 bg-[#c49a3c]/08 border border-[#c49a3c]/25 rounded-xl px-3.5 py-2.5">
                <Info size={14} className="text-[#c49a3c] mt-0.5 shrink-0" />
                <p className="text-[#6B5A40] text-xs leading-relaxed">
                  Use your full name in the payment note or message. Screenshot the confirmation screen, then upload it in the next section.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="Proof of payment"
              subtitle="Required · JPG, PNG, WEBP, or PDF up to 10MB"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 sm:py-10 px-4 cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#c49a3c]/40 ${
                  dragOver
                    ? 'border-[#c49a3c] bg-[#c49a3c]/06'
                    : uploadedFile
                      ? 'border-[#6B8E6B]/50 bg-[#6B8E6B]/06'
                      : errors.file
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-[#D4CDB5]/70 bg-[#FBF9F3] hover:border-[#c49a3c]/45 hover:bg-[#c49a3c]/04'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />

                {uploadedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-[#6B8E6B]/15 border border-[#6B8E6B]/30 flex items-center justify-center mb-3">
                      <FileImage size={22} className="text-[#6B8E6B]" />
                    </div>
                    <p className="text-[#1E2A35] text-sm font-semibold text-center break-all px-6">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[#8A7E6E] text-xs mt-1">
                      {(uploadedFile.size / 1024).toFixed(0)} KB · Tap to replace
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-[#D4CDB5]/60 flex items-center justify-center text-[#8A7E6E] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                      aria-label="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center mb-3">
                      <Upload size={22} className="text-[#9A8E7E]" />
                    </div>
                    <p className="text-[#1E2A35] text-sm font-semibold">Drop screenshot here</p>
                    <p className="text-[#8A7E6E] text-xs mt-1">or tap to browse</p>
                  </>
                )}
              </div>
              {errors.file ? <p className="text-red-600 text-xs mt-2 font-medium">{errors.file}</p> : null}
            </SectionCard>

            <section className="rounded-2xl border border-[#D4CDB5]/60 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                id="transaction-details-trigger"
                aria-expanded={transactionDetailsOpen}
                aria-controls="transaction-details-panel"
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
                id="transaction-details-panel"
                role="region"
                aria-labelledby="transaction-details-trigger"
                hidden={!transactionDetailsOpen}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label
                        htmlFor="payment-reference"
                        className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E] mb-2"
                      >
                        Reference / transaction number
                      </label>
                      <input
                        id="payment-reference"
                        type="text"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. GCash-2026041234567"
                        className="w-full rounded-xl border border-[#D4CDB5]/70 px-4 py-3 text-sm text-[#1E2A35] bg-[#FBF9F3] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#c49a3c]/30 focus:border-[#c49a3c]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="payment-notes"
                        className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E] mb-2"
                      >
                        Notes for our team
                      </label>
                      <textarea
                        id="payment-notes"
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
            </>
            ) : null}

            <div className="hidden lg:block rounded-2xl border border-[#D4CDB5]/60 bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !canSubmitCheckout}
                className="action-button w-full flex items-center justify-center gap-2 bg-[#c49a3c] text-white rounded-full py-3.5 text-sm font-bold shadow-[0_4px_18px_rgba(196,154,60,0.32)] hover:bg-[#a67f2e] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                {submitting
                  ? 'Submitting…'
                  : checkoutMode === 'credit'
                    ? 'Confirm with 1 credit'
                    : 'Submit for verification'}
                <ChevronRight size={18} />
              </button>
              <p className="text-[#B0A898] text-[11px] text-center mt-3 leading-relaxed">
                {checkoutMode === 'credit'
                  ? 'Your credit balance updates right away and enrollment is confirmed.'
                  : hasPaymentProof
                    ? 'By submitting, you confirm the payment details are accurate. Verification usually within 24 hours.'
                    : 'Upload proof of payment above to enable submission.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none lg:hidden">
        <div className="max-w-8xl mx-auto flex items-center gap-3 border-t border-[#D4CDB5]/60 bg-[#FBF9F3]/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(30,42,53,0.08)] pointer-events-auto">
          <div className="min-w-0 shrink">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A8E7E]">
              {checkoutMode === 'credit' ? 'Cost' : 'Due'}
            </p>
            <p
              className="text-[#c49a3c] leading-none tabular-nums truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em',  fontSize: '1.35rem' }}
            >
              {checkoutMode === 'credit' ? '1 credit' : amountDisplay}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canSubmitCheckout}
            className="action-button flex-1 flex items-center justify-center gap-1.5 bg-[#c49a3c] text-white rounded-full py-3 text-sm font-bold hover:bg-[#a67f2e] active:scale-[0.98] transition-all min-w-0 disabled:opacity-60 disabled:pointer-events-none"
          >
            {submitting ? 'Submitting…' : checkoutMode === 'credit' ? 'Use credit' : 'Submit'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
