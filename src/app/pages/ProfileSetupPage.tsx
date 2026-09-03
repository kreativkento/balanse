import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  User, Calendar, ChevronRight, AlertCircle,
  Shield, FileText, Check, X, Heart, Eye,
  Phone, Weight, Ruler, PenLine, Eraser,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NATIONALITIES } from '../data/nationalities';
import { ProfileImageHero } from '../components/ProfileImages';
import { TC_LAST_UPDATED, TERMS_BLOCKS } from '../data/termsAndConditions';
import { generateAndSaveSignedTermsPdf } from '../../lib/signed-terms';

const HEALTH_DECLARATION_QUESTIONS = [
  'Do you have any cardiovascular conditions (heart disease, hypertension, arrhythmia)?',
  'Do you have any respiratory conditions (asthma, COPD, breathing difficulties)?',
  'Do you have any musculoskeletal injuries or chronic pain (back, knees, shoulders, etc.)?',
  'Are you currently pregnant or postpartum within the last 6 months?',
  'Do you have diabetes or any metabolic condition?',
  'Are you currently taking medications that may affect physical activity?',
];

function HealthDeclarationModal({ onClose, onAccept }: { onClose: () => void; onAccept: () => void }) {
  const [answers, setAnswers] = useState<boolean[]>(HEALTH_DECLARATION_QUESTIONS.map(() => false));
  const [acknowledged, setAcknowledged] = useState(false);

  const toggle = (i: number) => setAnswers(prev => prev.map((v, idx) => idx === i ? !v : v));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
              <Heart size={16} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>Health Declaration</h3>
              <p className="text-[#9A8E7E] text-xs">Please answer honestly</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <p className="text-[#5A5048] text-sm leading-relaxed">
            This health declaration helps our coaches ensure your safety during classes. Answer each question honestly. If you answered "Yes" to any item, our coaches may reach out before your first session.
          </p>

          <div className="flex flex-col gap-3">
            {HEALTH_DECLARATION_QUESTIONS.map((q, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-2xl border border-[#D4CDB5]/50 hover:border-[#c49a3c]/30 transition-colors">
                <p className="text-[#5A5048] text-sm flex-1 min-w-0">{q}</p>
                <div className="flex gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => setAnswers(prev => prev.map((v, idx) => idx === i ? true : v))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${answers[i] ? 'bg-red-500 text-white border-red-500' : 'bg-white text-[#8A7E6E] border-[#D4CDB5]/60 hover:border-red-300'}`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setAnswers(prev => prev.map((v, idx) => idx === i ? false : v))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${!answers[i] ? 'bg-[#6B8E6B] text-white border-[#6B8E6B]' : 'bg-white text-[#8A7E6E] border-[#D4CDB5]/60 hover:border-green-300'}`}
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
          </div>

          <label
            onClick={() => setAcknowledged(v => !v)}
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${acknowledged ? 'border-[#c49a3c]/60 bg-[#c49a3c]/06' : 'border-[#D4CDB5]/60 hover:border-[#c49a3c]/30'}`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${acknowledged ? 'bg-[#c49a3c] border-[#c49a3c]' : 'border-[#D4CDB5]'}`}>
              {acknowledged && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
            <p className="text-[#5A5048] text-xs leading-relaxed">
              I declare that the above information is true and accurate. I understand that providing false information may affect my safety during classes and is grounds for membership suspension.
            </p>
          </label>
        </div>

        <div className="px-5 sm:px-7 pb-6 sm:pb-7 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!acknowledged}
            className={`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${acknowledged ? 'bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97]' : 'bg-[#EDE8D8] text-[#9A8E7E] cursor-not-allowed'}`}
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
          >
            <Check size={14} /> I Declare
          </button>
        </div>
      </div>
    </div>
  );
}

function SignaturePad({
  onInkChange,
  canvasRef,
}: {
  onInkChange: (hasInk: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  const onInkChangeRef = useRef(onInkChange);
  onInkChangeRef.current = onInkChange;

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 8 || h < 8) return;
    if (sizeRef.current.w === w && sizeRef.current.h === h && canvas.width > 0) return;
    sizeRef.current = { w, h };
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1E2A35';
    ctx.lineWidth = 2.25;
    hasInkRef.current = false;
    onInkChangeRef.current(false);
  };

  useEffect(() => {
    setupCanvas();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => setupCanvas());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const next = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last.current = next;
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      onInkChange(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    last.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-40 sm:h-52 w-full rounded-2xl bg-[#F8F3E8] border-2 border-[#D4CDB5]/70 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="pointer-events-none absolute left-6 right-6 bottom-8 h-px bg-[#c49a3c]/50" />
      <p className="pointer-events-none absolute left-0 right-0 bottom-3 text-center text-[#B0A898] text-[11px] uppercase tracking-widest">
        Sign here
      </p>
    </div>
  );
}

function TermsModal({ onClose, onAccept }: { onClose: () => void; onAccept: (signatureDataUrl: string) => void }) {
  const [step, setStep] = useState<'terms' | 'sign'>('terms');
  const [scrolled, setScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [padKey, setPadKey] = useState(0);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolled(true);
  };

  const clearSignature = () => {
    setPadKey((k) => k + 1);
    setHasInk(false);
  };

  const confirmSignature = () => {
    if (!hasInk || !accepted) return;
    const dataUrl = signatureCanvasRef.current?.toDataURL('image/png') ?? '';
    if (!dataUrl) return;
    onAccept(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#c49a3c]/10 border border-[#c49a3c]/30 flex items-center justify-center shrink-0">
              {step === 'terms' ? <FileText size={16} className="text-[#c49a3c]" /> : <PenLine size={16} className="text-[#c49a3c]" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-[#1E2A35] truncate" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>
                {step === 'terms' ? 'Balansé Terms & Conditions' : 'E-Signature'}
              </h3>
              <p className="text-[#9A8E7E] text-xs">
                {step === 'terms' ? `Last Updated: ${TC_LAST_UPDATED}` : 'Draw your signature to complete the agreement'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 sm:px-7 pt-4 shrink-0">
          <div className="flex items-center gap-2 bg-[#F8F3E8] rounded-2xl px-3 py-2.5 border border-[#D4CDB5]/50">
            <div className={`flex items-center gap-1.5 min-w-0 ${step === 'terms' ? 'text-[#a67f2e]' : 'text-[#8A7E6E]'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step === 'sign' || accepted ? 'bg-[#c49a3c] text-white' : 'bg-[#c49a3c] text-white'}`}>
                {step === 'sign' ? <Check size={11} strokeWidth={3} /> : <span className="text-[10px] font-bold">1</span>}
              </div>
              <span className="text-[11px] sm:text-xs font-semibold truncate">Read &amp; Agree</span>
            </div>
            <div className={`flex-1 h-px ${step === 'sign' ? 'bg-[#c49a3c]' : 'bg-[#D4CDB5]'}`} />
            <div className={`flex items-center gap-1.5 min-w-0 ${step === 'sign' ? 'text-[#a67f2e]' : 'text-[#8A7E6E]'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step === 'sign' ? 'bg-[#c49a3c] text-white' : 'bg-[#EDE8D8] text-[#9A8E7E]'}`}>
                <span className="text-[10px] font-bold">2</span>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold truncate">E-Signature</span>
            </div>
          </div>
        </div>

        {step === 'terms' ? (
          <>
            <div className="px-5 sm:px-7 py-5 max-h-[46vh] overflow-y-auto flex-1 min-h-0" onScroll={handleScroll}>
              <div className="space-y-4 text-sm text-[#5A5048] leading-relaxed">
                {TERMS_BLOCKS.map((block, i) => {
                  if (block.type === 'heading') {
                    return <p key={i} className="font-semibold text-[#1E2A35] mb-1">{block.text}</p>;
                  }
                  if (block.type === 'labelValue') {
                    return <p key={i}>{block.label}: {block.value}</p>;
                  }
                  if (block.type === 'bullets') {
                    return (
                      <ul key={i} className="list-disc pl-5 space-y-2">
                        {block.items.map((item) => (
                          <li key={item.label}><span className="font-semibold text-[#1E2A35]">{item.label}</span> {item.text}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.type === 'numbered') {
                    return (
                      <ol key={i} className="list-decimal pl-5 space-y-3">
                        {block.items.map((item) => <li key={item.slice(0, 24)}>{item}</li>)}
                      </ol>
                    );
                  }
                  return <p key={i}>{block.text}</p>;
                })}
              </div>

              <div className="mt-4 bg-[#F8F3E8] border border-[#D4CDB5]/60 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Eye size={14} className="text-[#c49a3c] shrink-0" />
                <p className="text-[#8A7E6E] text-xs">You can download this signed agreement as a PDF anytime from your Profile page.</p>
              </div>
            </div>

            {!scrolled && (
              <p className="text-[#B0A898] text-xs text-center py-2 shrink-0">Scroll to read all terms</p>
            )}

            <div className="px-5 sm:px-7 pb-6 sm:pb-7 flex flex-col gap-3 shrink-0">
              <label
                onClick={() => scrolled && setAccepted(v => !v)}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${accepted ? 'border-[#c49a3c]/60 bg-[#c49a3c]/06' : scrolled ? 'border-[#D4CDB5]/60 hover:border-[#c49a3c]/30' : 'border-[#D4CDB5]/40 opacity-50 cursor-not-allowed'}`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${accepted ? 'bg-[#c49a3c] border-[#c49a3c]' : 'border-[#D4CDB5]'}`}>
                  {accepted && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <p className="text-[#5A5048] text-xs leading-relaxed">
                  I have read the above Waiver &amp; Release form and Media Release &amp; Consent Statement, fully understand and agree to its contents.
                </p>
              </label>

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => accepted && setStep('sign')}
                  disabled={!accepted}
                  className={`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${accepted ? 'bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97]' : 'bg-[#EDE8D8] text-[#9A8E7E] cursor-not-allowed'}`}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-5 sm:px-7 py-5 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
            <p className="text-[#5A5048] text-sm leading-relaxed">
              Please draw your electronic signature below using your mouse, trackpad, or touchscreen. This confirms you agree to the Balansé Terms &amp; Conditions.
            </p>

            <SignaturePad key={padKey} canvasRef={signatureCanvasRef} onInkChange={setHasInk} />

            {!hasInk && (
              <p className="text-[#B0A898] text-xs text-center -mt-1">A signature is required to complete this agreement.</p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-auto pt-1">
              <button
                type="button"
                onClick={() => { clearSignature(); setStep('terms'); }}
                className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={clearSignature}
                disabled={!hasInk}
                className={`flex-1 py-3 rounded-full border text-sm transition-all flex items-center justify-center gap-2 ${hasInk ? 'border-[#D4CDB5]/70 text-[#5A5048] hover:bg-[#EDE8D8]' : 'border-[#D4CDB5]/40 text-[#B0A898] cursor-not-allowed'}`}
              >
                <Eraser size={14} /> Clear
              </button>
              <button
                type="button"
                onClick={confirmSignature}
                disabled={!hasInk || !accepted}
                className={`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${hasInk && accepted ? 'bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97]' : 'bg-[#EDE8D8] text-[#9A8E7E] cursor-not-allowed'}`}
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
              >
                <Check size={14} /> Confirm Signature
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { completeProfile, updateProfile, user } = useAuth();

  // Pre-filled from signup — editable in case of corrections
  const [firstName, setFirstName]       = useState(user?.profile?.firstName || '');
  const [lastName, setLastName]         = useState(user?.profile?.lastName || '');
  const [middleInitial, setMiddleInitial] = useState(user?.profile?.middleInitial || '');

  const [birthday, setBirthday]         = useState('');
  const [sex, setSex]                   = useState<'male' | 'female' | 'prefer_not_to_say' | ''>('');
  const [phone, setPhone]               = useState('');
  const [nationality, setNationality]   = useState('');
  const [weight, setWeight]             = useState('');
  const [height, setHeight]             = useState('');
  const [healthSigned, setHealthSigned] = useState(false);
  const [termsSigned, setTermsSigned]   = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showTermsModal, setShowTermsModal]   = useState(false);
  const [errors, setErrors]             = useState<Record<string, string>>({});
  const [loading, setLoading]           = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required.';
    if (!lastName.trim())  e.lastName  = 'Last name is required.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    if (!nationality.trim()) e.nationality = 'Nationality is required.';
    if (!birthday) e.birthday = 'Birthday is required.';
    if (!sex) e.sex = 'Please select your sex.';
    if (!healthSigned) e.health = 'You must complete the Health Declaration.';
    if (!termsSigned)  e.terms  = 'You must accept the Terms & Conditions and provide an e-signature.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const fullName = [firstName.trim(), middleInitial.trim() ? middleInitial.trim() + '.' : '', lastName.trim()].filter(Boolean).join(' ');
    const digits = phone.replace(/\D/g, '');
    const normalizedPhone = digits.startsWith('63') ? `+${digits}` : `+63${digits}`;
    completeProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleInitial: middleInitial.trim(),
      name: fullName,
      birthday,
      sex,
      phone: normalizedPhone,
      nationality: nationality.trim(),
      weight: weight.trim(),
      height: height.trim(),
      healthDeclarationSigned: healthSigned,
      termsAccepted: termsSigned,
      profileComplete: true,
    });
    navigate('/dashboard');
  };

  useEffect(() => {
    if (!user) navigate('/signup');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8F3E8] flex flex-col overflow-x-hidden">
      {showHealthModal && (
        <HealthDeclarationModal
          onClose={() => setShowHealthModal(false)}
          onAccept={() => { setHealthSigned(true); setShowHealthModal(false); setErrors(e => ({ ...e, health: '' })); }}
        />
      )}
      {showTermsModal && (
        <TermsModal
          onClose={() => setShowTermsModal(false)}
          onAccept={async (signatureDataUrl) => {
            setTermsSigned(true);
            setShowTermsModal(false);
            setErrors(e => ({ ...e, terms: '' }));
            const signerName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || user?.name || 'Member';
            if (user?.email) {
              try {
                await generateAndSaveSignedTermsPdf({
                  email: user.email,
                  signerName,
                  signatureDataUrl,
                });
              } catch (err) {
                console.error('Failed to save signed Terms PDF:', err);
              }
            }
          }}
        />
      )}

      <div className="flex-1 flex items-center justify-center px-4 sm:px-5 py-6 sm:py-8 w-full min-w-0">
        <div className="w-full max-w-md min-w-0">

          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm overflow-hidden">
            <ProfileImageHero
              photoUrl={user.profile.photo || ''}
              coverUrl={user.profile.coverImage || ''}
              initials={
                [firstName, lastName]
                  .map((part) => part.trim()[0])
                  .filter(Boolean)
                  .join('')
                  .toUpperCase() || 'U'
              }
              editable
              onPhotoUploaded={(url) => updateProfile({ photo: url })}
              onCoverUploaded={(url) => updateProfile({ coverImage: url })}
            />
            <div className="px-5 pb-5 sm:px-8 sm:pb-8 md:px-10 md:pb-10 pt-20 sm:pt-24">
            {/* Header */}
            <div className="mb-5 sm:mb-6">
              <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.75rem, 6vw, 2.2rem)', letterSpacing: '0.05em' }}>
                Profile Setup
              </h1>
              <p className="text-[#8A7E6E] text-sm mt-1">Tell us about yourself to complete your account.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 sm:gap-3 mb-6 bg-[#F8F3E8] rounded-2xl px-3 sm:px-4 py-3 border border-[#D4CDB5]/50 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#c49a3c] flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-[#8A7E6E] text-[11px] sm:text-xs truncate">Account Created</span>
              </div>
              <div className="flex-1 min-w-4 h-px bg-[#c49a3c]" />
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#c49a3c] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <span className="text-[#a67f2e] text-[11px] sm:text-xs font-semibold truncate">Profile Setup</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0" noValidate>

              {/* Name section — pre-filled from signup */}
              <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/60 p-3 sm:p-4 flex flex-col gap-3 min-w-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <User size={13} className="text-[#c49a3c] shrink-0" />
                    <p className="text-[#5A5048] text-sm font-semibold">Full Name</p>
                  </div>
                  <span className="text-[#B0A898] text-xs sm:ml-auto">From registration</span>
                </div>

                {/* First + M.I. */}
                <div className="flex gap-2 sm:gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <label className="text-[#8A7E6E] text-xs mb-1.5 block">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => { setFirstName(e.target.value); setErrors(v => ({ ...v, firstName: '' })); }}
                      placeholder="Juan"
                      className={`w-full bg-white border text-[#1E2A35] placeholder-[#B0A898] rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#c49a3c]/20 transition-all text-sm ${errors.firstName ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'}`}
                      autoComplete="given-name"
                    />
                    {errors.firstName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.firstName}</p>}
                  </div>
                  <div className="w-16 sm:w-20 shrink-0">
                    <label className="text-[#8A7E6E] text-xs mb-1.5 block">M.I.</label>
                    <input
                      type="text"
                      value={middleInitial}
                      onChange={e => setMiddleInitial(e.target.value.slice(0, 2))}
                      placeholder="A"
                      maxLength={2}
                      className="w-full bg-white border border-[#D4CDB5] text-[#1E2A35] placeholder-[#B0A898] rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#c49a3c]/20 focus:border-[#c49a3c]/60 transition-all text-sm text-center"
                      autoComplete="additional-name"
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div>
                  <label className="text-[#8A7E6E] text-xs mb-1.5 block">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => { setLastName(e.target.value); setErrors(v => ({ ...v, lastName: '' })); }}
                    placeholder="dela Cruz"
                    className={`w-full bg-white border text-[#1E2A35] placeholder-[#B0A898] rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#c49a3c]/20 transition-all text-sm ${errors.lastName ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'}`}
                    autoComplete="family-name"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.lastName}</p>}
                </div>
              </div>

              {/* Phone Number → profiles_client.phone */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 flex items-center gap-1.5 block">
                  <Phone size={13} className="text-[#c49a3c]" /> Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A7E6E] text-sm font-medium pointer-events-none">+63</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(v => ({ ...v, phone: '' })); }}
                    placeholder="9XX XXX XXXX"
                    className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-14 pr-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#c49a3c]/20 transition-all ${errors.phone ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'}`}
                    autoComplete="tel"
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.phone}</p>}
              </div>

              {/* Nationality */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">
                  Nationality <span className="text-red-500">*</span>
                </label>
                <select
                  value={nationality}
                  onChange={e => { setNationality(e.target.value); setErrors(v => ({ ...v, nationality: '' })); }}
                  className={`w-full bg-[#F8F3E8] border text-[#1E2A35] rounded-2xl px-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#c49a3c]/20 transition-all appearance-none ${errors.nationality ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'} ${!nationality ? 'text-[#B0A898]' : ''}`}
                >
                  <option value="">Select nationality…</option>
                  {NATIONALITIES.map((item) => (
                    <option key={item} value={item} className="text-[#1E2A35]">
                      {item}
                    </option>
                  ))}
                </select>
                {errors.nationality && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.nationality}</p>}
              </div>

              {/* Birthday */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#c49a3c]" /> Birthday <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={e => { setBirthday(e.target.value); setErrors(v => ({ ...v, birthday: '' })); }}
                  className={`w-full bg-[#F8F3E8] border text-[#1E2A35] rounded-2xl px-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#c49a3c]/20 transition-all ${errors.birthday ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#c49a3c]/60'}`}
                />
                {errors.birthday && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.birthday}</p>}
              </div>

              {/* Sex */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 block">Sex <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([['male', 'Male'], ['female', 'Female'], ['prefer_not_to_say', 'Prefer not to say']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => { setSex(val); setErrors(v => ({ ...v, sex: '' })); }}
                      className={`py-3 px-2 rounded-2xl border-2 text-xs font-semibold transition-all text-center ${sex === val ? 'border-[#c49a3c] bg-[#c49a3c]/08 text-[#c49a3c]' : 'border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#5A5048] hover:border-[#c49a3c]/40'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {errors.sex && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {errors.sex}</p>}
              </div>

              {/* Weight & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5A5048] text-sm font-semibold mb-2 flex items-center gap-1.5 block">
                    <Weight size={13} className="text-[#c49a3c]" /> Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="65"
                      min={1}
                      className="w-full bg-[#F8F3E8] border border-[#D4CDB5] text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-4 pr-12 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#c49a3c]/20 focus:border-[#c49a3c]/60 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9A8E7E] text-xs font-medium pointer-events-none">kg</span>
                  </div>
                </div>
                <div>
                  <label className="text-[#5A5048] text-sm font-semibold mb-2 flex items-center gap-1.5 block">
                    <Ruler size={13} className="text-[#c49a3c]" /> Height
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="170"
                      min={1}
                      className="w-full bg-[#F8F3E8] border border-[#D4CDB5] text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-4 pr-12 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#c49a3c]/20 focus:border-[#c49a3c]/60 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9A8E7E] text-xs font-medium pointer-events-none">cm</span>
                  </div>
                </div>
              </div>

              {/* Consent section */}
              <div>
                <p className="text-[#5A5048] text-sm font-semibold mb-2">Consent &amp; Agreements</p>
                <div className="flex flex-col gap-2">

                  {/* Health Declaration */}
                  <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all min-w-0 ${healthSigned ? 'border-green-300 bg-green-50' : errors.health ? 'border-red-300 bg-red-50/30' : 'border-[#D4CDB5]/60'}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${healthSigned ? 'bg-green-100' : 'bg-red-50'}`}>
                        <Heart size={16} className={healthSigned ? 'text-green-600' : 'text-red-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${healthSigned ? 'text-green-700' : 'text-[#1E2A35]'}`}>Health Declaration</p>
                        <p className="text-[#9A8E7E] text-xs">{healthSigned ? 'Completed ✓' : 'Required before first session'}</p>
                      </div>
                    </div>
                    {healthSigned ? (
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center self-end sm:self-auto shrink-0">
                        <Check size={13} className="text-green-600" strokeWidth={3} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowHealthModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1 text-[#c49a3c] text-xs font-bold border border-[#c49a3c]/40 px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[#c49a3c]/08 transition-all shrink-0"
                      >
                        Complete <ChevronRight size={12} />
                      </button>
                    )}
                  </div>

                  {/* Terms & Conditions */}
                  <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all min-w-0 ${termsSigned ? 'border-green-300 bg-green-50' : errors.terms ? 'border-red-300 bg-red-50/30' : 'border-[#D4CDB5]/60'}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${termsSigned ? 'bg-green-100' : 'bg-[#c49a3c]/10'}`}>
                        <FileText size={16} className={termsSigned ? 'text-green-600' : 'text-[#c49a3c]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${termsSigned ? 'text-green-700' : 'text-[#1E2A35]'}`}>Terms &amp; Conditions</p>
                        <p className="text-[#9A8E7E] text-xs break-words">{termsSigned ? `Accepted & signed ✓ (Updated ${TC_LAST_UPDATED})` : `Last Updated: ${TC_LAST_UPDATED}`}</p>
                      </div>
                    </div>
                    {termsSigned ? (
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center self-end sm:self-auto shrink-0">
                        <Check size={13} className="text-green-600" strokeWidth={3} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1 text-[#c49a3c] text-xs font-bold border border-[#c49a3c]/40 px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[#c49a3c]/08 transition-all shrink-0"
                      >
                        View &amp; Accept <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {(errors.health || errors.terms) && (
                  <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.health || errors.terms}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#c49a3c] text-white font-bold text-base rounded-full py-4 min-h-[56px] shadow-[0_4px_24px_rgba(196,154,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#a67f2e] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Setting up profile...
                  </>
                ) : (
                  <>
                    Complete Setup <Shield size={16} />
                  </>
                )}
              </button>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
