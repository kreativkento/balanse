export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const EMAIL_TIME_ZONE = 'Asia/Manila';

export function formatClassDate(startsAt: string | null): string {
  if (!startsAt) return '—';
  return new Date(startsAt).toLocaleDateString('en-PH', {
    timeZone: EMAIL_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatClassTimeRange(
  startsAt: string | null,
  endsAt: string | null,
): string {
  if (!startsAt) return '—';
  const start = new Date(startsAt);
  const startTime = start.toLocaleTimeString('en-PH', {
    timeZone: EMAIL_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!endsAt) return startTime;
  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString('en-PH', {
    timeZone: EMAIL_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${startTime} – ${endTime}`;
}

/** @deprecated Use formatClassDate + formatClassTimeRange */
export function scheduleLabelFromClass(
  startsAt: string | null,
  endsAt: string | null,
): string {
  const date = formatClassDate(startsAt);
  const time = formatClassTimeRange(startsAt, endsAt);
  if (date === '—') return time;
  if (time === '—') return date;
  return `${date}, ${time}`;
}

function classSessionDetailsBlock(input: {
  className: string;
  disciplineName: string;
  startsAt: string | null;
  endsAt: string | null;
  extraRows?: string;
  sectionLabel?: string;
}): string {
  const name = input.className.trim() || '—';
  const discipline = input.disciplineName.trim() || '—';
  const dateLabel = formatClassDate(input.startsAt);
  const timeLabel = formatClassTimeRange(input.startsAt, input.endsAt);
  const header = input.sectionLabel ?? 'Class details';

  return `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#FBF9F3;border:1px solid #E8E2D4;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:12px 18px;border-bottom:1px solid #F0EBE0;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9A8E7E;">${escapeHtml(header)}</td></tr>
        <tr><td style="padding:18px 18px 16px;">
          <p style="margin:0 0 14px;color:#1E2A35;font-size:22px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;">${escapeHtml(name)}</p>
          <p style="margin:0 0 8px;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Discipline:</strong> ${escapeHtml(discipline)}</p>
          <p style="margin:0 0 8px;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Date:</strong> ${escapeHtml(dateLabel)}</p>
          <p style="margin:0;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Time:</strong> ${escapeHtml(timeLabel)}</p>
          ${input.extraRows ?? ''}
        </td></tr>
      </table>`;
}

export function buildSlotRequestDecisionEmail(input: {
  coachName: string;
  approved: boolean;
  className: string;
  disciplineName: string;
  startsAt: string | null;
  endsAt: string | null;
  reviewNote: string;
  siteUrl: string;
}): { subject: string; html: string } {
  const title = input.approved ? 'Schedule request approved' : 'Schedule request declined';
  const lead = input.approved
    ? 'Your request to teach on the class schedule has been approved.'
    : 'Your request to teach on the class schedule was not approved at this time.';

  const noteBlock = input.reviewNote.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#FFFFFF;border:1px solid #E8E2D4;border-radius:10px;color:#5A5048;font-size:14px;line-height:1.5;"><strong style="color:#1E2A35;">Note from admin:</strong> ${escapeHtml(input.reviewNote.trim())}</p>`
    : '';

  const html = wrapEmail({
    siteUrl: input.siteUrl,
    title,
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.coachName)},</p>
      <p style="margin:0 0 18px;color:#5A5048;font-size:15px;line-height:1.55;">${lead}</p>
      ${classSessionDetailsBlock({
        sectionLabel: 'Requested time block',
        className: input.className,
        disciplineName: input.disciplineName,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      })}
      ${noteBlock}
      <p style="margin:20px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">View your classes in the staff portal.</p>
    `,
    ctaLabel: 'Open My Classes',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/staff-my-classes`,
  });

  return { subject: `Balansé — ${title}`, html };
}

export function buildCoachAssignedEmail(input: {
  coachName: string;
  className: string;
  disciplineName: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingOpen: boolean;
  siteUrl: string;
}): { subject: string; html: string } {
  const bookingLabel = input.bookingOpen ? 'Open for enrollment' : 'Closed for enrollment';
  const bookingRow = `<p style="margin:10px 0 0;padding-top:10px;border-top:1px solid #E8E2D4;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Booking:</strong> ${escapeHtml(bookingLabel)}</p>`;

  const html = wrapEmail({
    siteUrl: input.siteUrl,
    title: 'You’ve been assigned to a class',
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.coachName)},</p>
      <p style="margin:0 0 18px;color:#5A5048;font-size:15px;line-height:1.55;">You have been assigned as coach for the following session on the class schedule.</p>
      ${classSessionDetailsBlock({
        sectionLabel: 'Assignment',
        className: input.className,
        disciplineName: input.disciplineName,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        extraRows: bookingRow,
      })}
      <p style="margin:20px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">Review details and enrolled students in the staff portal.</p>
    `,
    ctaLabel: 'View My Classes',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/staff-my-classes`,
  });

  return { subject: 'Balansé — Class schedule assignment', html };
}

export function buildClassCancellationMemberEmail(input: {
  memberName: string;
  variant: 'coach_replaced' | 'class_cancelled';
  className: string;
  disciplineName: string;
  startsAt: string | null;
  endsAt: string | null;
  replacementCoachName?: string;
  siteUrl: string;
  waitlisted: boolean;
}): { subject: string; html: string } {
  const title = input.variant === 'class_cancelled'
    ? 'Class session cancelled'
    : 'Your class coach has changed';
  const lead = input.variant === 'class_cancelled'
    ? 'We’re writing to let you know that the following class session has been cancelled.'
    : 'The coach for your upcoming class session has changed. Your enrollment is still confirmed for the same date and time.';
  const coachRow = input.variant === 'coach_replaced' && input.replacementCoachName?.trim()
    ? `<p style="margin:10px 0 0;padding-top:10px;border-top:1px solid #E8E2D4;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">New coach:</strong> ${escapeHtml(input.replacementCoachName.trim())}</p>`
    : '';
  const waitlistNote = input.waitlisted
    ? '<p style="margin:14px 0 0;color:#8A7E6E;font-size:13px;line-height:1.5;">You are on the waitlist for this session; the update applies to this booking as well.</p>'
    : '';

  const html = wrapEmail({
    siteUrl: input.siteUrl,
    title,
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.memberName)},</p>
      <p style="margin:0 0 18px;color:#5A5048;font-size:15px;line-height:1.55;">${lead}</p>
      ${classSessionDetailsBlock({
        sectionLabel: 'Session',
        className: input.className,
        disciplineName: input.disciplineName,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        extraRows: coachRow,
      })}
      ${waitlistNote}
      <p style="margin:20px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">View your schedule in the member portal or contact the studio if you have questions.</p>
    `,
    ctaLabel: 'Open Class Schedule',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/member-class-schedule`,
  });

  const subject = input.variant === 'class_cancelled'
    ? `Balansé — Class cancelled: ${input.className}`
    : `Balansé — Coach update: ${input.className}`;

  return { subject, html };
}

function wrapEmail(input: {
  siteUrl: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}): string {
  const base = input.siteUrl.replace(/\/$/, '');
  const logoUrl = `${base}/logo_main.svg`;
  const logoWidth = 224;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1E8;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="margin:0 0 24px;text-align:center;">
      <a href="${escapeHtml(base)}" style="display:inline-block;text-decoration:none;">
        <img src="${escapeHtml(logoUrl)}" alt="Balansé Wellness" width="${logoWidth}" style="display:block;margin:0 auto;max-width:${logoWidth}px;width:${logoWidth}px;height:auto;border:0;outline:none;" />
      </a>
    </div>
    <div style="background:#FFFFFF;border:1px solid #D4CDB5;border-radius:16px;padding:28px 24px;box-shadow:0 4px 24px rgba(30,42,53,0.06);">
      <h1 style="margin:0 0 20px;color:#1E2A35;font-size:22px;font-weight:700;line-height:1.3;">${escapeHtml(input.title)}</h1>
      ${input.body}
      <p style="margin:24px 0 0;text-align:center;">
        <a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;background:#c49a3c;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">${escapeHtml(input.ctaLabel)}</a>
      </p>
    </div>
    <p style="margin:20px 0 0;text-align:center;color:#9A8E7E;font-size:11px;line-height:1.5;">This message was sent by Balansé Wellness. If you have questions, contact the studio.</p>
  </div>
</body>
</html>`;
}
