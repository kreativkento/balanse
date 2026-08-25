import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  User, Calendar, ChevronRight, AlertCircle,
  Shield, FileText, Check, X, Heart, Eye,
  Phone, Weight, Ruler,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NATIONALITIES } from '../data/nationalities';

const TC_LAST_UPDATED = 'January 15, 2026';

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
              <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-2xl border border-[#D4CDB5]/50 hover:border-[#745b3c]/30 transition-colors">
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
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${acknowledged ? 'border-[#745b3c]/60 bg-[#745b3c]/06' : 'border-[#D4CDB5]/60 hover:border-[#745b3c]/30'}`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${acknowledged ? 'bg-[#745b3c] border-[#745b3c]' : 'border-[#D4CDB5]'}`}>
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

function TermsModal({ onClose, onAccept }: { onClose: () => void; onAccept: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setScrolled(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(30,42,53,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-[#D4CDB5]/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#745b3c]/10 border border-[#745b3c]/30 flex items-center justify-center">
              <FileText size={16} className="text-[#745b3c]" />
            </div>
            <div>
              <h3 className="text-[#1E2A35]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: '0.05em' }}>Terms & Conditions</h3>
              <p className="text-[#9A8E7E] text-xs">Last Updated: {TC_LAST_UPDATED}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-[#8A7E6E] hover:bg-[#EDE8D8] flex items-center justify-center transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-5 max-h-[55vh] overflow-y-auto" onScroll={handleScroll}>
          <div className="space-y-4 text-sm text-[#5A5048] leading-relaxed">
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">1. Membership & Sessions</p>
              <p>By enrolling at BALANSÉ Wellness Hub, you agree to the terms of your selected membership plan. Session credits are non-transferable and expire at the end of each billing cycle unless otherwise stated. All membership fees are non-refundable except as outlined in Section 3.</p>
            </section>
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">2. Booking & Attendance</p>
              <p>Members must book classes in advance through the BALANSÉ platform. Attendance is subject to capacity limits. Late arrivals may be denied entry after 5 minutes past class start time. No-shows consume session credits without refund.</p>
            </section>
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">3. Cancellation Policy</p>
              <p>Cancellations made at least 24 hours before a scheduled class are eligible for a 50% refund of the session fee. Cancellations made less than 24 hours before class start are non-refundable. There are no cancellation fees.</p>
            </section>
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">4. Code of Conduct</p>
              <p>Members are expected to treat all staff, coaches, and fellow members with respect. Disruptive, disrespectful, or harmful behavior is grounds for immediate membership termination without refund.</p>
            </section>
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">5. Liability Waiver</p>
              <p>Participation in physical activities at BALANSÉ Wellness Hub is voluntary. BALANSÉ and its staff are not liable for injuries sustained during activities when proper safety guidelines are followed. Members participate at their own risk.</p>
            </section>
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">6. Privacy</p>
              <p>Personal data collected at registration is used solely for membership management, communication, and service delivery. BALANSÉ does not sell or share your data with third parties without your explicit consent.</p>
            </section>
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">7. Schedule Visibility</p>
              <p>Members may optionally allow coaches to view their personal schedule for coordination purposes. This setting is off by default and can be changed at any time from the member dashboard.</p>
            </section>
            <section>
              <p className="font-semibold text-[#1E2A35] mb-1">8. Amendments</p>
              <p>BALANSÉ reserves the right to update these Terms and Conditions at any time. Members will be notified of material changes via email. Continued use of services constitutes acceptance of updated terms.</p>
            </section>
          </div>

          {/* PDF view prompt */}
          <div className="mt-4 bg-[#F8F3E8] border border-[#D4CDB5]/60 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Eye size={14} className="text-[#745b3c] shrink-0" />
            <p className="text-[#8A7E6E] text-xs">You can view these Terms as a PDF anytime from your Profile page.</p>
          </div>
        </div>

        {!scrolled && (
          <p className="text-[#B0A898] text-xs text-center py-2">Scroll to read all terms</p>
        )}

        <div className="px-5 sm:px-7 pb-6 sm:pb-7 flex flex-col gap-3">
          <label
            onClick={() => scrolled && setAccepted(v => !v)}
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${accepted ? 'border-[#745b3c]/60 bg-[#745b3c]/06' : scrolled ? 'border-[#D4CDB5]/60 hover:border-[#745b3c]/30' : 'border-[#D4CDB5]/40 opacity-50 cursor-not-allowed'}`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${accepted ? 'bg-[#745b3c] border-[#745b3c]' : 'border-[#D4CDB5]'}`}>
              {accepted && <Check size={12} className="text-white" strokeWidth={3} />}
            </div>
            <p className="text-[#5A5048] text-xs leading-relaxed">
              I have read and agree to the BALANSÉ Terms &amp; Conditions (Last Updated: {TC_LAST_UPDATED}).
            </p>
          </label>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-full border border-[#D4CDB5]/70 text-[#8A7E6E] text-sm hover:bg-[#EDE8D8] transition-all">
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!accepted}
              className={`flex-1 py-3 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${accepted ? 'bg-[#1E2A35] text-white hover:bg-[#263545] active:scale-[0.97]' : 'bg-[#EDE8D8] text-[#9A8E7E] cursor-not-allowed'}`}
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}
            >
              <Check size={14} /> I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { completeProfile, user } = useAuth();

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
    if (!termsSigned)  e.terms  = 'You must accept the Terms & Conditions.';
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
          onAccept={() => { setTermsSigned(true); setShowTermsModal(false); setErrors(e => ({ ...e, terms: '' })); }}
        />
      )}

      <div className="flex-1 flex items-center justify-center px-4 sm:px-5 py-6 sm:py-8 w-full min-w-0">
        <div className="w-full max-w-md min-w-0">

          <div className="bg-white rounded-3xl border border-[#D4CDB5]/60 shadow-sm p-5 sm:p-8 md:p-10 overflow-hidden">
            {/* Header */}
            <div className="mb-6 sm:mb-7">
              <div className="w-12 h-12 bg-[#745b3c]/10 border border-[#745b3c]/30 rounded-2xl flex items-center justify-center mb-4">
                <User size={22} className="text-[#745b3c]" />
              </div>
              <h1 className="text-[#1E2A35] leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(1.75rem, 6vw, 2.2rem)', letterSpacing: '0.05em' }}>
                Profile Setup
              </h1>
              <p className="text-[#8A7E6E] text-sm mt-1">Tell us about yourself to complete your account.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 sm:gap-3 mb-6 bg-[#F8F3E8] rounded-2xl px-3 sm:px-4 py-3 border border-[#D4CDB5]/50 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#745b3c] flex items-center justify-center shrink-0">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-[#8A7E6E] text-[11px] sm:text-xs truncate">Account Created</span>
              </div>
              <div className="flex-1 min-w-4 h-px bg-[#745b3c]" />
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#745b3c] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <span className="text-[#5e4a30] text-[11px] sm:text-xs font-semibold truncate">Profile Setup</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0" noValidate>

              {/* Name section — pre-filled from signup */}
              <div className="bg-[#F8F3E8] rounded-2xl border border-[#D4CDB5]/60 p-3 sm:p-4 flex flex-col gap-3 min-w-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <User size={13} className="text-[#745b3c] shrink-0" />
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
                      className={`w-full bg-white border text-[#1E2A35] placeholder-[#B0A898] rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#745b3c]/20 transition-all text-sm ${errors.firstName ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#745b3c]/60'}`}
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
                      className="w-full bg-white border border-[#D4CDB5] text-[#1E2A35] placeholder-[#B0A898] rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#745b3c]/20 focus:border-[#745b3c]/60 transition-all text-sm text-center"
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
                    className={`w-full bg-white border text-[#1E2A35] placeholder-[#B0A898] rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-[#745b3c]/20 transition-all text-sm ${errors.lastName ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#745b3c]/60'}`}
                    autoComplete="family-name"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} /> {errors.lastName}</p>}
                </div>
              </div>

              {/* Phone Number → profiles_client.phone */}
              <div>
                <label className="text-[#5A5048] text-sm font-semibold mb-2 flex items-center gap-1.5 block">
                  <Phone size={13} className="text-[#745b3c]" /> Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A7E6E] text-sm font-medium pointer-events-none">+63</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setErrors(v => ({ ...v, phone: '' })); }}
                    placeholder="9XX XXX XXXX"
                    className={`w-full bg-[#F8F3E8] border text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-14 pr-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#745b3c]/20 transition-all ${errors.phone ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#745b3c]/60'}`}
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
                  className={`w-full bg-[#F8F3E8] border text-[#1E2A35] rounded-2xl px-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#745b3c]/20 transition-all appearance-none ${errors.nationality ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#745b3c]/60'} ${!nationality ? 'text-[#B0A898]' : ''}`}
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
                  <Calendar size={14} className="text-[#745b3c]" /> Birthday <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={e => { setBirthday(e.target.value); setErrors(v => ({ ...v, birthday: '' })); }}
                  className={`w-full bg-[#F8F3E8] border text-[#1E2A35] rounded-2xl px-4 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#745b3c]/20 transition-all ${errors.birthday ? 'border-red-400' : 'border-[#D4CDB5] focus:border-[#745b3c]/60'}`}
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
                      className={`py-3 px-2 rounded-2xl border-2 text-xs font-semibold transition-all text-center ${sex === val ? 'border-[#745b3c] bg-[#745b3c]/08 text-[#745b3c]' : 'border-[#D4CDB5]/60 bg-[#F8F3E8] text-[#5A5048] hover:border-[#745b3c]/40'}`}
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
                    <Weight size={13} className="text-[#745b3c]" /> Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="65"
                      min={1}
                      className="w-full bg-[#F8F3E8] border border-[#D4CDB5] text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-4 pr-12 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#745b3c]/20 focus:border-[#745b3c]/60 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9A8E7E] text-xs font-medium pointer-events-none">kg</span>
                  </div>
                </div>
                <div>
                  <label className="text-[#5A5048] text-sm font-semibold mb-2 flex items-center gap-1.5 block">
                    <Ruler size={13} className="text-[#745b3c]" /> Height
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      placeholder="170"
                      min={1}
                      className="w-full bg-[#F8F3E8] border border-[#D4CDB5] text-[#1E2A35] placeholder-[#B0A898] rounded-2xl pl-4 pr-12 py-4 min-h-[56px] outline-none focus:ring-2 focus:ring-[#745b3c]/20 focus:border-[#745b3c]/60 transition-all"
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
                        className="w-full sm:w-auto flex items-center justify-center gap-1 text-[#745b3c] text-xs font-bold border border-[#745b3c]/40 px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[#745b3c]/08 transition-all shrink-0"
                      >
                        Complete <ChevronRight size={12} />
                      </button>
                    )}
                  </div>

                  {/* Terms & Conditions */}
                  <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all min-w-0 ${termsSigned ? 'border-green-300 bg-green-50' : errors.terms ? 'border-red-300 bg-red-50/30' : 'border-[#D4CDB5]/60'}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${termsSigned ? 'bg-green-100' : 'bg-[#745b3c]/10'}`}>
                        <FileText size={16} className={termsSigned ? 'text-green-600' : 'text-[#745b3c]'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${termsSigned ? 'text-green-700' : 'text-[#1E2A35]'}`}>Terms &amp; Conditions</p>
                        <p className="text-[#9A8E7E] text-xs break-words">{termsSigned ? `Accepted ✓ (Updated ${TC_LAST_UPDATED})` : `Last Updated: ${TC_LAST_UPDATED}`}</p>
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
                        className="w-full sm:w-auto flex items-center justify-center gap-1 text-[#745b3c] text-xs font-bold border border-[#745b3c]/40 px-3 py-2 sm:py-1.5 rounded-xl hover:bg-[#745b3c]/08 transition-all shrink-0"
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
                className="w-full flex items-center justify-center gap-2 bg-[#745b3c] text-white font-bold text-base rounded-full py-4 min-h-[56px] shadow-[0_4px_24px_rgba(116,91,60,0.4)] active:scale-[0.97] transition-all hover:bg-[#5e4a30] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
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
  );
}
