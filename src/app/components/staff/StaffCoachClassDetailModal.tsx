import { createPortal } from 'react-dom';
import { CalendarDays, Clock, MapPin, Users, X } from 'lucide-react';
import type { ClassDisplay } from '../../../lib/class-service';

const PH_TZ = 'Asia/Manila';

function formatDisplayDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatTimeRange(startIso: string, endIso: string | null): string {
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: PH_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const start = timeFmt.format(new Date(startIso));
  if (!endIso) return start;
  return `${start} – ${timeFmt.format(new Date(endIso))}`;
}

function blockStatusLabel(status: ClassDisplay['statusBlock']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'occupied':
      return 'Occupied';
    case 'vacant':
      return 'Vacant';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
}

function openStatusLabel(status: ClassDisplay['statusClass']): string {
  switch (status) {
    case 'open':
      return 'Open for enrollment';
    case 'close':
      return 'Closed to enrollment';
    case 'pending':
      return 'Enrollment pending';
    default:
      return status;
  }
}

export function StaffCoachClassDetailModal({
  classRow,
  accentColor,
  onClose,
  onSelectStudent,
}: {
  classRow: ClassDisplay;
  accentColor: string;
  onClose: () => void;
  onSelectStudent: (accountId: string) => void;
}) {
  const limit = classRow.classLimit ?? 0;
  const enrolled = classRow.enrolledCount;
  const fillPct = limit > 0 ? Math.round((enrolled / limit) * 100) : 0;
  const isFull = limit > 0 && enrolled >= limit;
  const almostFull = limit > 0 && fillPct >= 80 && !isFull;
  const openSpots = limit > 0 ? Math.max(0, limit - enrolled) : null;
  const coachNames = classRow.coaches.map((c) => c.name).join(', ') || '—';

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[110] bg-[#1E2A35]/50 backdrop-blur-[2px]"
        role="presentation"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#D4CDB5]/60 bg-white shadow-2xl max-h-[min(90vh,40rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-class-detail-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1.5 shrink-0" style={{ backgroundColor: accentColor }} />
          <div className="px-6 pt-5 pb-4 border-b border-[#D4CDB5]/50 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[#8A7E6E] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                  Class session
                </p>
                <h2
                  id="staff-class-detail-title"
                  className="text-[#1E2A35] leading-tight"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.55rem', letterSpacing: '0.05em' }}
                >
                  {classRow.name.trim() || classRow.disciplineName}
                </h2>
                <p className="text-[#8A7E6E] text-xs mt-1 tabular-nums">Class ID {classRow.uid || '—'}</p>
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

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  isFull
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : almostFull
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                {isFull ? 'Fully booked' : almostFull ? 'Almost full' : 'Seats available'}
              </span>
              <span className="text-[#8A7E6E] text-xs">
                {enrolled}
                {limit > 0 ? ` / ${limit}` : ''} enrolled
                {openSpots !== null ? ` · ${openSpots} open` : ''}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            <div className="rounded-2xl border border-[#D4CDB5]/55 bg-[#F8F3E8]/60 px-4 py-3 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5 text-sm text-[#5A5048]">
                <CalendarDays size={16} className="text-[#c49a3c] shrink-0 mt-0.5" />
                <span>{formatDisplayDate(classRow.startsAt)}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-[#5A5048]">
                <Clock size={16} className="text-[#c49a3c] shrink-0 mt-0.5" />
                <span>{formatTimeRange(classRow.startsAt, classRow.endsAt)}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-[#5A5048]">
                <MapPin size={16} className="text-[#c49a3c] shrink-0 mt-0.5" />
                <span>{classRow.disciplineName}</span>
              </div>
            </div>

            {classRow.description.trim() ? (
              <div>
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest mb-1.5">Description</p>
                <p className="text-[#5A5048] text-sm leading-relaxed whitespace-pre-wrap">
                  {classRow.description.trim()}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-[#D4CDB5]/55 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E]">Coaches</p>
                <p className="text-[#1E2A35] text-xs font-medium mt-1">{coachNames}</p>
              </div>
              <div className="rounded-xl border border-[#D4CDB5]/55 px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E]">Schedule block</p>
                <p className="text-[#1E2A35] text-xs font-medium mt-1">{blockStatusLabel(classRow.statusBlock)}</p>
              </div>
              <div className="rounded-xl border border-[#D4CDB5]/55 px-3 py-2 col-span-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#9A8E7E]">Enrollment</p>
                <p className="text-[#1E2A35] text-xs font-medium mt-1">{openStatusLabel(classRow.statusClass)}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={15} className="text-[#8A7E6E]" />
                <p className="text-[#8A7E6E] text-xs uppercase tracking-widest">Enrolled students</p>
              </div>
              {classRow.students.length === 0 ? (
                <p className="text-[#B0A898] text-sm text-center py-6 rounded-2xl border border-dashed border-[#D4CDB5]/60">
                  No students enrolled yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {classRow.students.map((student) => {
                    const initials = student.name
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <button
                        key={student.accountId}
                        type="button"
                        onClick={() => onSelectStudent(student.accountId)}
                        className="flex items-center justify-between gap-3 bg-[#F8F3E8] rounded-xl border border-[#D4CDB5]/40 px-3 py-2.5 hover:border-[#c49a3c]/40 hover:bg-[#FBF9F3] transition-colors text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#1E2A35]/08 border border-[#1E2A35]/12 flex items-center justify-center shrink-0 overflow-hidden">
                            {student.photo ? (
                              <img src={student.photo} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[#1E2A35] text-[10px] font-bold">{initials || '?'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#1E2A35] text-sm font-medium truncate">{student.name}</p>
                            <p className="text-[#8A7E6E] text-[11px] truncate">{student.email}</p>
                          </div>
                        </div>
                        <span className="text-[#c49a3c] text-xs font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          Profile →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#D4CDB5]/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-full border border-[#D4CDB5]/70 text-[#5A5048] text-sm font-semibold hover:bg-[#EDE8D8] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
