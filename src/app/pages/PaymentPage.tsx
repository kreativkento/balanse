import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft, Check, Upload, FileImage,
  X, ShieldCheck, ChevronRight, Banknote, Info, Receipt,
  CreditCard, Smartphone,
} from 'lucide-react';

// ─────────────────────────────────────────────
// STEP INDICATOR (reused pattern)
// ─────────────────────────────────────────────

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Select Class', 'Payment', 'Confirmed'];
  return (
    <div className="hidden md:flex items-center gap-0">
      {steps.map((label, i) => {
        const num = i + 1;
        const isActive = num === step;
        const isDone   = num < step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone   ? 'bg-[#C49A3C] text-white' :
                  isActive ? 'bg-[#C49A3C] text-white shadow-[0_0_0_3px_rgba(196,154,60,0.2)]' :
                             'bg-[#EDE8D8] text-[#9A8E7E]'
                }`}
                style={{ fontSize: '0.7rem', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : num}
              </div>
              <span
                className={`text-[10px] mt-1 whitespace-nowrap ${isActive ? 'text-[#C49A3C]' : 'text-[#B0A898]'}`}
                style={{ letterSpacing: '0.05em' }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-14 h-px mx-1.5 mb-4 transition-colors ${isDone ? 'bg-[#C49A3C]' : 'bg-[#D4CDB5]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// CLASS ACCENT COLORS
// ─────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  'Yoga':             '#C49A3C',
  'Calisthenics':     '#3A4A5A',
  'Animal Flow':      '#6B8E6B',
  'Groundworks':      '#8B6F5A',
  'Circuit Training': '#B86A4A',
  'Mat Pilates':      '#9A7A8A',
  'Kickboxing':       '#7A3A4A',
  'Capoeira':         '#A07050',
  'Personal Coaching':'#A67E2A',
};

// ─────────────────────────────────────────────
// PAYMENT PAGE
// ─────────────────────────────────────────────

export default function PaymentPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const booking   = location.state?.booking;

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'gcash' | 'maya'>('cash');
  const [uploadedFile, setUploadedFile]   = useState<File | null>(null);
  const [reference, setReference]         = useState('');
  const [notes, setNotes]                 = useState('');
  const [dragOver, setDragOver]           = useState(false);
  const [errors, setErrors]               = useState<{ file?: string; ref?: string }>({});
  const [requestReceipt, setRequestReceipt] = useState(false);
  const [receiptType, setReceiptType]     = useState<'physical' | 'email'>('email');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard — if no booking state, navigate away after render
  useEffect(() => {
    if (!booking) navigate('/book');
  }, [booking, navigate]);

  if (!booking) return null;

  const classColor = CLASS_COLORS[booking.className] || '#C49A3C';

  const handleFileChange = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setErrors(e => ({ ...e, file: 'Please upload a JPG, PNG, WEBP, or PDF file.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(e => ({ ...e, file: 'File must be under 10MB.' }));
      return;
    }
    setUploadedFile(file);
    setErrors(e => ({ ...e, file: undefined }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  };

  const handleSubmit = () => {
    const newErrors: { file?: string; ref?: string } = {};
    if (['bank', 'gcash', 'maya'].includes(paymentMethod) && !uploadedFile) newErrors.file = 'Please upload your proof of payment.';
    if (['bank', 'gcash', 'maya'].includes(paymentMethod) && !reference.trim()) newErrors.ref = 'Please enter your reference number.';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    navigate('/booking-pending', {
      state: {
        booking,
        reference: reference.trim(),
        fileName: uploadedFile?.name,
        notes: notes.trim(),
      },
    });
  };

  return (
    <div className="bg-[#F8F3E8] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-8">

        {/* ── Header ── */}
        <div className="pt-6 pb-5 border-b border-[#D4CDB5]/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/book')}
              className="w-10 h-10 rounded-full bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center text-[#1E2A35] hover:bg-[#E3DCC8] active:scale-95 transition-all shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1
                className="text-[#1E2A35] leading-none"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '0.05em' }}
              >
                Payment Verification
              </h1>
              <p className="text-[#8A7E6E] text-xs mt-0.5">Upload your proof of payment to confirm your booking</p>
            </div>
          </div>
          <StepBar step={2} />
        </div>

        {/* ── Body ── */}
        <div className="py-6 pb-10 flex gap-7 items-start">

          {/* ── LEFT: Booking summary ── */}
          <div className="w-72 shrink-0 sticky top-6">

            {/* Booking card */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
              {/* Color band */}
              <div className="h-2" style={{ backgroundColor: classColor }} />

              <div className="p-5">
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">Your Booking</p>
                <h2
                  className="text-[#1E2A35] leading-none mb-3"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.8rem', letterSpacing: '0.04em', color: classColor }}
                >
                  {booking.className}
                </h2>

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-[#D4CDB5]/40">
                    <span className="text-[#9A8E7E] text-xs">Date</span>
                    <span className="text-[#1E2A35] text-xs font-semibold">{booking.dateLabel}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#D4CDB5]/40">
                    <span className="text-[#9A8E7E] text-xs">Time</span>
                    <span className="text-[#1E2A35] text-xs font-semibold">{booking.time}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#D4CDB5]/40">
                    <span className="text-[#9A8E7E] text-xs">Duration</span>
                    <span className="text-[#1E2A35] text-xs font-semibold">{booking.duration}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#D4CDB5]/40">
                    <span className="text-[#9A8E7E] text-xs">Coach</span>
                    <span className="text-[#1E2A35] text-xs font-semibold">{booking.trainer}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#D4CDB5]/40">
                    <span className="text-[#9A8E7E] text-xs">Type</span>
                    <span className="text-[#1E2A35] text-xs font-semibold">Single Class Pass</span>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-4 pt-4 border-t border-[#D4CDB5]/40">
                  <div className="flex items-end justify-between">
                    <span className="text-[#8A7E6E] text-xs uppercase tracking-widest">Total</span>
                    <span
                      className="leading-none"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: '0.02em', color: classColor }}
                    >
                      {booking.price}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2.5 mt-3 px-1">
              <ShieldCheck size={14} className="text-[#8A9E7A] mt-0.5 shrink-0" />
              <p className="text-[#9A8E7E] text-xs leading-relaxed">
                Your payment info is reviewed by our team and kept confidential. No auto-charges.
              </p>
            </div>
          </div>

          {/* ── RIGHT: Payment form ── */}
          <div className="flex-1 flex flex-col gap-5">

            {/* Payment method */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
              <p
                className="text-[#1E2A35] mb-4"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
              >
                Payment Method
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Cash */}
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-[#C49A3C] bg-[#C49A3C]/06'
                      : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#C49A3C]/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#8A9E7A] flex items-center justify-center">
                    <Banknote size={18} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${paymentMethod === 'cash' ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}>Cash</p>
                    <p className="text-[#9A8E7E] text-xs">Pay at studio</p>
                  </div>
                  {paymentMethod === 'cash' && (
                    <div className="w-5 h-5 rounded-full bg-[#C49A3C] flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* Bank Transfer */}
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 transition-all ${
                    paymentMethod === 'bank'
                      ? 'border-[#C49A3C] bg-[#C49A3C]/06'
                      : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#C49A3C]/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#3A4A5A] flex items-center justify-center">
                    <CreditCard size={18} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${paymentMethod === 'bank' ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}>Bank Transfer</p>
                    <p className="text-[#9A8E7E] text-xs">BPI / BDO</p>
                  </div>
                  {paymentMethod === 'bank' && (
                    <div className="w-5 h-5 rounded-full bg-[#C49A3C] flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* GCash */}
                <button
                  onClick={() => setPaymentMethod('gcash')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 transition-all ${
                    paymentMethod === 'gcash'
                      ? 'border-[#C49A3C] bg-[#C49A3C]/06'
                      : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#C49A3C]/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#007DFF' }}>
                    <Smartphone size={18} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${paymentMethod === 'gcash' ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}>GCash</p>
                    <p className="text-[#9A8E7E] text-xs">E-wallet</p>
                  </div>
                  {paymentMethod === 'gcash' && (
                    <div className="w-5 h-5 rounded-full bg-[#C49A3C] flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* Maya */}
                <button
                  onClick={() => setPaymentMethod('maya')}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 transition-all ${
                    paymentMethod === 'maya'
                      ? 'border-[#C49A3C] bg-[#C49A3C]/06'
                      : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#C49A3C]/40'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#46BFA8' }}>
                    <Smartphone size={18} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${paymentMethod === 'maya' ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}>Maya</p>
                    <p className="text-[#9A8E7E] text-xs">E-wallet</p>
                  </div>
                  {paymentMethod === 'maya' && (
                    <div className="w-5 h-5 rounded-full bg-[#C49A3C] flex items-center justify-center">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Payment instructions */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
              <p
                className="text-[#1E2A35] mb-1"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
              >
                {paymentMethod === 'cash' ? 'Cash Payment Instructions'
                  : paymentMethod === 'bank' ? 'Bank Transfer Details'
                  : paymentMethod === 'gcash' ? 'GCash Payment Details'
                  : 'Maya Payment Details'}
              </p>

              {paymentMethod === 'cash' ? (
                <>
                  <p className="text-[#8A7E6E] text-xs mb-4">Settle your payment at the studio reception before or on the day of your class.</p>
                  <div className="bg-[#F8F3E8] border border-[#D4CDB5]/50 rounded-2xl p-4 flex flex-col gap-3">
                    {[
                      { step: '1', text: 'Present this booking request at the reception counter.' },
                      { step: '2', text: `Pay ₱${booking.priceNum} in cash — bring exact amount if possible.` },
                      { step: '3', text: 'The receptionist will confirm and stamp your booking.' },
                    ].map(item => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#C49A3C] flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-white text-xs font-black">{item.step}</span>
                        </div>
                        <p className="text-[#5A5048] text-sm leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mt-3 bg-[#C49A3C]/06 border border-[#C49A3C]/20 rounded-xl px-3.5 py-2.5">
                    <Info size={12} className="text-[#C49A3C] mt-0.5 shrink-0" />
                    <p className="text-[#7A6A52] text-xs leading-relaxed">
                      Your booking slot will be held for 30 minutes. Please arrive early to confirm your payment.
                    </p>
                  </div>
                </>
              ) : paymentMethod === 'bank' ? (
                <>
                  <p className="text-[#8A7E6E] text-xs mb-4">Send the exact amount and keep a screenshot of your receipt.</p>
                  <div className="bg-[#F8F3E8] border border-[#D4CDB5]/50 rounded-2xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Bank</p>
                        <p className="text-[#1E2A35] text-sm font-semibold">BPI</p>
                      </div>
                      <div>
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Account Number</p>
                        <p className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                          1234 - 5678 - 90
                        </p>
                      </div>
                      <div>
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Account Name</p>
                        <p className="text-[#1E2A35] text-sm font-semibold">BALANSÉ Studio</p>
                      </div>
                      <div>
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Amount</p>
                        <p className="text-[#C49A3C]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.02em' }}>
                          ₱{booking?.priceNum ?? 360}.00
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-3 bg-[#C49A3C]/06 border border-[#C49A3C]/20 rounded-xl px-3.5 py-2.5">
                    <Info size={12} className="text-[#C49A3C] mt-0.5 shrink-0" />
                    <p className="text-[#7A6A52] text-xs leading-relaxed">
                      Use your full name as the payment description. This helps our team verify faster.
                    </p>
                  </div>
                </>
              ) : (
                /* GCash or Maya */
                <>
                  <p className="text-[#8A7E6E] text-xs mb-4">
                    Send the exact amount to our {paymentMethod === 'gcash' ? 'GCash' : 'Maya'} number and keep a screenshot of your payment confirmation.
                  </p>
                  <div className="bg-[#F8F3E8] border border-[#D4CDB5]/50 rounded-2xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">{paymentMethod === 'gcash' ? 'GCash' : 'Maya'} Number</p>
                        <p className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', letterSpacing: '0.08em' }}>
                          0917 - 123 - 4567
                        </p>
                      </div>
                      <div>
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Account Name</p>
                        <p className="text-[#1E2A35] text-sm font-semibold">BALANSÉ Studio</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1">Amount</p>
                        <p className="text-[#C49A3C]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', letterSpacing: '0.02em' }}>
                          ₱{booking?.priceNum ?? 360}.00
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-3 bg-[#C49A3C]/06 border border-[#C49A3C]/20 rounded-xl px-3.5 py-2.5">
                    <Info size={12} className="text-[#C49A3C] mt-0.5 shrink-0" />
                    <p className="text-[#7A6A52] text-xs leading-relaxed">
                      Use your full name as the payment note. Screenshot your confirmation and upload it below.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Upload proof (bank transfer, GCash, or Maya) */}
            {['bank', 'gcash', 'maya'].includes(paymentMethod) && (
              <>
                <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                  <p
                    className="text-[#1E2A35] mb-1"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
                  >
                    Upload Proof of Payment
                  </p>
                  <p className="text-[#8A7E6E] text-xs mb-4">JPG, PNG, WEBP or PDF · Max 10MB</p>

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 cursor-pointer transition-all ${
                      dragOver
                        ? 'border-[#C49A3C] bg-[#C49A3C]/06'
                        : uploadedFile
                          ? 'border-[#8A9E7A]/60 bg-[#8A9E7A]/05'
                          : errors.file
                            ? 'border-red-300 bg-red-50/40'
                            : 'border-[#D4CDB5]/70 bg-[#F8F3E8]/50 hover:border-[#C49A3C]/40 hover:bg-[#C49A3C]/04'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleFileChange(f);
                      }}
                    />

                    {uploadedFile ? (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-[#8A9E7A]/15 border border-[#8A9E7A]/30 flex items-center justify-center mb-3">
                          <FileImage size={22} className="text-[#6B8E6B]" />
                        </div>
                        <p className="text-[#1E2A35] text-sm font-semibold">{uploadedFile.name}</p>
                        <p className="text-[#8A7E6E] text-xs mt-1">
                          {(uploadedFile.size / 1024).toFixed(0)} KB · Click to replace
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); setUploadedFile(null); }}
                          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#EDE8D8] flex items-center justify-center text-[#8A7E6E] hover:bg-red-100 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-[#EDE8D8] border border-[#D4CDB5]/60 flex items-center justify-center mb-3">
                          <Upload size={22} className="text-[#9A8E7E]" />
                        </div>
                        <p className="text-[#1E2A35] text-sm font-semibold">Drop your screenshot here</p>
                        <p className="text-[#8A7E6E] text-xs mt-1">or click to browse files</p>
                      </>
                    )}
                  </div>
                  {errors.file && <p className="text-red-500 text-xs mt-2">{errors.file}</p>}
                </div>

                {/* Reference number + notes */}
                <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
                  <p
                    className="text-[#1E2A35] mb-4"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
                  >
                    Transaction Details
                  </p>

                  <div className="flex flex-col gap-4">
                    {/* Reference number */}
                    <div>
                      <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">
                        Reference / Transaction Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={reference}
                        onChange={e => {
                          setReference(e.target.value);
                          if (e.target.value.trim()) setErrors(er => ({ ...er, ref: undefined }));
                        }}
                        placeholder="e.g. GCash-2026041234567"
                        className={`w-full rounded-xl border px-4 py-3 text-sm text-[#1E2A35] bg-[#F8F3E8] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#C49A3C]/30 transition-all ${
                          errors.ref ? 'border-red-300' : 'border-[#D4CDB5]/70 focus:border-[#C49A3C]/50'
                        }`}
                      />
                      {errors.ref && <p className="text-red-500 text-xs mt-1">{errors.ref}</p>}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[#8A7E6E] text-xs uppercase tracking-widest mb-2">
                        Notes <span className="text-[#B0A898]">(optional)</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Any additional message for our team..."
                        className="w-full rounded-xl border border-[#D4CDB5]/70 px-4 py-3 text-sm text-[#1E2A35] bg-[#F8F3E8] placeholder-[#C0B8A8] outline-none focus:ring-2 focus:ring-[#C49A3C]/30 focus:border-[#C49A3C]/50 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Receipt Request */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt size={17} className="text-[#C49A3C]" />
                  <p
                    className="text-[#1E2A35]"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.15rem', letterSpacing: '0.06em' }}
                  >
                    Request Official Receipt
                  </p>
                </div>
                <button
                  onClick={() => setRequestReceipt(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${requestReceipt ? 'bg-[#C49A3C]' : 'bg-[#D4CDB5]'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${requestReceipt ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-[#8A7E6E] text-xs mb-4">
                An official receipt will be issued upon payment confirmation. Choose your preferred format.
              </p>
              {requestReceipt && (
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'email' as const,    label: 'E-Receipt', desc: 'Sent to your registered email address' },
                    { id: 'physical' as const, label: 'Physical Receipt', desc: 'Pick up at the studio reception' },
                  ].map(opt => (
                    <label
                      key={opt.id}
                      onClick={() => setReceiptType(opt.id)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                        receiptType === opt.id
                          ? 'border-[#C49A3C]/60 bg-[#C49A3C]/06'
                          : 'border-[#D4CDB5]/60 bg-[#F8F3E8] hover:border-[#C49A3C]/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        receiptType === opt.id ? 'border-[#C49A3C]' : 'border-[#D4CDB5]'
                      }`}>
                        {receiptType === opt.id && <div className="w-2 h-2 rounded-full bg-[#C49A3C]" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${receiptType === opt.id ? 'text-[#C49A3C]' : 'text-[#1E2A35]'}`}>{opt.label}</p>
                        <p className="text-[#9A8E7E] text-xs">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5">
              <button
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-2 bg-[#C49A3C] text-white rounded-full py-4 shadow-[0_4px_20px_rgba(196,154,60,0.35)] hover:bg-[#A67E2A] active:scale-[0.97] transition-all"
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.05rem', letterSpacing: '0.1em' }}
              >
                Submit for Verification <ChevronRight size={18} />
              </button>
              <p className="text-[#B0A898] text-xs text-center mt-3 leading-relaxed">
                By submitting, you confirm that the payment details above are accurate.
                Our team will verify and confirm your booking within 24 hours.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}