import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Shield, Stethoscope, X } from 'lucide-react';
import type { CoachStudentProfileItem } from '../../../lib/admin-service';
import { fetchCoachStudentProfileForClass } from '../../../lib/admin-service';
import {
  HEALTH_QUESTIONS,
  parseHealthDeclaration,
  type HealthAnswer,
} from '../../../lib/health-declaration';
import { loadMemberSignatureUrl } from '../../../lib/member-documents';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

function healthAnswerLabel(value: HealthAnswer): string {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  return '—';
}

function displayText(value: string): string {
  const trimmed = value.trim();
  return trimmed || '—';
}

function formatSex(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === 'male') return 'Male';
  if (v === 'female') return 'Female';
  if (v === 'prefer_not_to_say') return 'Prefer not to say';
  return displayText(value);
}

function formatAge(age: number | null): string {
  if (age == null) return '—';
  return `${age} years old`;
}

function formatHeight(value?: string | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '—';
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed} cm`;
  return trimmed;
}

function formatWeight(value?: string | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '—';
  if (/^\d+(\.\d+)?$/.test(trimmed)) return `${trimmed} kg`;
  return trimmed;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#D4CDB5]/50 bg-[#FBF9F3]/80 px-3 py-2.5 min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9A8E7E]">{label}</p>
      <p className="text-[#1E2A35] text-sm font-semibold mt-1 break-words leading-snug">{value}</p>
    </div>
  );
}

export function StaffCoachStudentProfileModal({
  classId,
  accountId,
  onClose,
}: {
  classId: string;
  accountId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<CoachStudentProfileItem | null>(null);
  const [healthSignatureUrl, setHealthSignatureUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setClient(null);
    setHealthSignatureUrl('');

    void (async () => {
      const result = await fetchCoachStudentProfileForClass(classId, accountId);
      if (cancelled) return;
      if (result.error || !result.data) {
        setError(result.error ?? 'Could not load this student profile.');
        setLoading(false);
        return;
      }
      setClient(result.data);
      const medical = parseHealthDeclaration(result.data.healthDeclaration);
      if (medical.signaturePath && !medical.signatureOptOut) {
        const url = await loadMemberSignatureUrl(medical.signaturePath);
        if (!cancelled) setHealthSignatureUrl(url);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [classId, accountId]);

  const medicalDisplay = useMemo(
    () => parseHealthDeclaration(client?.healthDeclaration),
    [client?.healthDeclaration],
  );

  const medicalSummary = useMemo(() => {
    if (!client?.healthDeclaration.trim()) return 'No declaration on file';
    const yesCount = HEALTH_QUESTIONS.filter((q) => medicalDisplay.answers[q.id] === 'yes').length;
    if (yesCount > 0) return `${yesCount} item${yesCount === 1 ? '' : 's'} flagged yes`;
    const allNo = HEALTH_QUESTIONS.every((q) => medicalDisplay.answers[q.id] === 'no');
    if (allNo) return 'All answers no';
    return 'Review responses';
  }, [client?.healthDeclaration, medicalDisplay.answers]);

  const medicalAllAnswersNo = useMemo(() => {
    if (!client?.healthDeclaration.trim()) return false;
    return HEALTH_QUESTIONS.every((q) => medicalDisplay.answers[q.id] === 'no');
  }, [client?.healthDeclaration, medicalDisplay.answers]);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[130] bg-[#1E2A35]/50 backdrop-blur-[2px]"
        role="presentation"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-[#FFFCF7] shadow-2xl max-h-[min(92vh,46rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-student-profile-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0 overflow-hidden border-b border-[#D4CDB5]/45 bg-gradient-to-br from-[#F8F3E8] via-white to-[#FBF9F3] px-5 pt-5 pb-4">
            <div className="flex gap-3 items-start pr-8">
              <div className="w-16 h-16 rounded-2xl border-2 border-white shadow-md bg-[#F8F3E8] overflow-hidden shrink-0 ring-1 ring-[#D4CDB5]/40">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader2 size={22} className="animate-spin text-[#c49a3c]" />
                  </div>
                ) : client?.photo ? (
                  <img src={client.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-[#1E2A35] font-bold text-lg">
                    {(client?.name ?? '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[#c49a3c] text-[10px] font-bold uppercase tracking-[0.22em] mb-1">
                  Class roster
                </p>
                <h2
                  id="staff-student-profile-title"
                  className="text-[#1E2A35] leading-none truncate"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.65rem', letterSpacing: '0.04em' }}
                >
                  {client?.name ?? 'Loading…'}
                </h2>
                {client?.nickname.trim() || client?.age != null ? (
                  <p className="text-[#8A7E6E] text-xs mt-1 truncate">
                    {[client.nickname.trim() ? `“${client.nickname.trim()}”` : null, client.age != null ? formatAge(client.age) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl text-[#8A7E6E] hover:bg-white/80 flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-[#8A7E6E]">
                <Loader2 size={28} className="animate-spin text-[#c49a3c]" />
                <p className="text-sm">Loading profile…</p>
              </div>
            ) : error ? (
              <p className="text-red-600 text-sm text-center py-10">{error}</p>
            ) : client ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Member since" value={displayText(client.joinDate)} />
                  <StatTile label="Nickname" value={displayText(client.nickname)} />
                  <StatTile label="Age" value={formatAge(client.age)} />
                  <StatTile label="Sex" value={formatSex(client.sex)} />
                  <StatTile label="Height" value={formatHeight(client.height)} />
                  <StatTile label="Weight" value={formatWeight(client.weight)} />
                </div>

                <Accordion type="single" collapsible className="rounded-2xl border border-[#D4CDB5]/55 bg-white overflow-hidden">
                  <AccordionItem value="medical" className="border-0">
                    <AccordionTrigger
                      showChevron={false}
                      className="px-4 py-3.5 hover:no-underline hover:bg-[#FBF9F3]/80 group w-full"
                    >
                      <div className="flex flex-1 items-center gap-3 min-w-0 text-left w-full">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#c49a3c]/12 text-[#c49a3c]">
                          <Stethoscope size={17} strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[#1E2A35] text-sm font-semibold">Medical questionnaire</p>
                          <p className="text-[#8A7E6E] text-xs mt-0.5 truncate">{medicalSummary}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 pl-1">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-full shrink-0"
                            aria-hidden
                          >
                            {medicalAllAnswersNo ? (
                              <CheckCircle2 size={20} strokeWidth={2.25} className="text-[#2F9E44]" />
                            ) : (
                              <AlertTriangle size={20} strokeWidth={2.25} className="text-[#D97706]" />
                            )}
                          </span>
                          <ChevronDown
                            size={18}
                            className="shrink-0 text-[#8A7E6E] transition-transform duration-200 group-data-[state=open]:rotate-180"
                            aria-hidden
                          />
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-0">
                      <div className="bg-[#c49a3c]/06 border border-[#c49a3c]/18 rounded-xl px-3 py-2.5 flex items-start gap-2.5 mb-3">
                        <Shield size={14} className="text-[#c49a3c] mt-0.5 shrink-0" />
                        <p className="text-[#7A6A52] text-[11px] leading-relaxed">
                          Shared with assigned coaches for safety during sessions. Not for contact or billing.
                        </p>
                      </div>

                      {!client.healthDeclaration.trim() ? (
                        <p className="text-[#B0A898] text-sm py-2">No health declaration on file.</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {HEALTH_QUESTIONS.map((question) => {
                            const answer = medicalDisplay.answers[question.id];
                            return (
                              <div
                                key={question.id}
                                className="flex gap-3 rounded-xl border border-[#D4CDB5]/45 bg-[#FBF9F3]/50 px-3 py-2.5"
                              >
                                <p className="text-[#5A5048] text-xs flex-1 min-w-0 leading-relaxed">{question.text}</p>
                                <span
                                  className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    answer === 'yes'
                                      ? 'bg-red-50 text-red-600'
                                      : answer === 'no'
                                        ? 'bg-[#E8F0E8] text-[#4A6B4A]'
                                        : 'text-[#B0A898]'
                                  }`}
                                >
                                  {healthAnswerLabel(answer)}
                                </span>
                              </div>
                            );
                          })}

                          {medicalDisplay.details.trim() ? (
                            <div className="rounded-xl border border-[#D4CDB5]/45 px-3 py-2.5 mt-1">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E] mb-1">
                                Additional details
                              </p>
                              <p className="text-[#5A5048] text-xs leading-relaxed whitespace-pre-wrap">
                                {displayText(medicalDisplay.details)}
                              </p>
                            </div>
                          ) : null}

                          <div className="rounded-xl border border-[#D4CDB5]/45 px-3 py-2.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E] mb-1">
                              Acknowledgment
                            </p>
                            <p className="text-[#5A5048] text-xs">
                              {medicalDisplay.acknowledged ? 'Declared and acknowledged' : 'Not acknowledged'}
                            </p>
                            {healthSignatureUrl && !medicalDisplay.signatureOptOut ? (
                              <div className="rounded-lg border border-[#D4CDB5]/50 bg-white px-3 py-2 mt-2">
                                <img
                                  src={healthSignatureUrl}
                                  alt="Student e-signature"
                                  className="h-14 w-auto max-w-full object-contain mx-auto"
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ) : null}
          </div>

          <div className="px-5 py-3.5 border-t border-[#D4CDB5]/50 shrink-0 bg-white/80">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-full bg-[#1E2A35] text-white text-sm font-semibold hover:bg-[#2a3a48] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
