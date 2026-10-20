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

export function formatClassTimeRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return '—';
  const startTime = new Date(startsAt).toLocaleTimeString('en-PH', {
    timeZone: EMAIL_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!endsAt) return startTime;
  const endTime = new Date(endsAt).toLocaleTimeString('en-PH', {
    timeZone: EMAIL_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${startTime} – ${endTime}`;
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

function classBlock(input: {
  className: string;
  startsAt: string | null;
  endsAt: string | null;
  extraRows?: string;
}): string {
  const dateLabel = formatClassDate(input.startsAt);
  const timeLabel = formatClassTimeRange(input.startsAt, input.endsAt);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#FBF9F3;border:1px solid #E8E2D4;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:12px 18px;border-bottom:1px solid #F0EBE0;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9A8E7E;">Class</td></tr>
      <tr><td style="padding:18px 18px 16px;">
        <p style="margin:0 0 14px;color:#1E2A35;font-size:22px;font-weight:700;line-height:1.25;">${escapeHtml(input.className)}</p>
        <p style="margin:0 0 8px;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Date:</strong> ${escapeHtml(dateLabel)}</p>
        <p style="margin:0;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Time:</strong> ${escapeHtml(timeLabel)}</p>
        ${input.extraRows ?? ''}
      </td></tr>
    </table>`;
}

export function buildPaymentApprovedMemberEmail(input: {
  memberName: string;
  className: string;
  startsAt: string | null;
  endsAt: string | null;
  paymentUid: string;
  amountPaid: number;
  siteUrl: string;
}): { subject: string; html: string } {
  const amount = `₱${Number(input.amountPaid).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const extraRows = `
    <p style="margin:10px 0 0;padding-top:10px;border-top:1px solid #E8E2D4;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Reference:</strong> ${escapeHtml(input.paymentUid)}</p>
    <p style="margin:8px 0 0;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Amount:</strong> ${escapeHtml(amount)}</p>`;

  const html = wrapEmail({
    siteUrl: input.siteUrl,
    title: 'Payment approved — you\'re enrolled',
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.memberName)},</p>
      <p style="margin:0 0 18px;color:#5A5048;font-size:15px;line-height:1.55;">Good news — we verified your payment and added you to the class roster. Your official e-receipt is included in a separate email.</p>
      ${classBlock({
        className: input.className,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        extraRows,
      })}
      <p style="margin:20px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">See you at the studio. You can also view this class under My Classes.</p>
    `,
    ctaLabel: 'Open My Classes',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/my-classes`,
  });

  return { subject: `Balansé — Payment approved (${input.paymentUid})`, html };
}

export function buildPaymentRejectedMemberEmail(input: {
  memberName: string;
  className: string;
  startsAt: string | null;
  endsAt: string | null;
  paymentUid: string;
  reviewNote: string;
  siteUrl: string;
}): { subject: string; html: string } {
  const noteBlock = input.reviewNote.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#FFF5F5;border:1px solid #FECACA;border-radius:10px;color:#5A5048;font-size:14px;line-height:1.5;"><strong style="color:#991B1B;">Note from our team:</strong> ${escapeHtml(input.reviewNote.trim())}</p>`
    : '';

  const html = wrapEmail({
    siteUrl: input.siteUrl,
    title: 'Payment could not be verified',
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.memberName)},</p>
      <p style="margin:0 0 18px;color:#5A5048;font-size:15px;line-height:1.55;">We reviewed your payment submission (reference <strong>${escapeHtml(input.paymentUid)}</strong>) but could not approve it at this time. You are not enrolled for this session yet.</p>
      ${classBlock({
        className: input.className,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      })}
      ${noteBlock}
      <p style="margin:20px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">You may submit a new payment with corrected proof from the class schedule if the session is still open.</p>
    `,
    ctaLabel: 'Browse Class Schedule',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/class-schedule`,
  });

  return { subject: `Balansé — Payment not approved (${input.paymentUid})`, html };
}

export function buildPaymentSubmittedMemberEmail(input: {
  memberName: string;
  className: string;
  startsAt: string | null;
  endsAt: string | null;
  paymentUid: string;
  requestPhysicalReceipt: boolean;
  siteUrl: string;
}): { subject: string; html: string } {
  const printedNote = input.requestPhysicalReceipt
    ? `<p style="margin:12px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">You asked for a <strong style="color:#1E2A35;">printed receipt</strong>. Our front desk team will have it ready for pickup once your payment is approved.</p>`
    : `<p style="margin:12px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">If you need a <strong style="color:#1E2A35;">printed receipt</strong>, please speak with our front desk staff at the studio.</p>`;

  const html = wrapEmail({
    siteUrl: input.siteUrl,
    title: 'Payment proof received',
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.memberName)},</p>
      <p style="margin:0 0 18px;color:#5A5048;font-size:15px;line-height:1.55;">Thank you for submitting your proof of payment. Our team will review it shortly and will email you again once a decision is made.</p>
      ${classBlock({
        className: input.className,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        extraRows: `
    <p style="margin:10px 0 0;padding-top:10px;border-top:1px solid #E8E2D4;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Reference:</strong> ${escapeHtml(input.paymentUid)}</p>`,
      })}
      <div style="margin:20px 0 0;padding:16px 18px;background:#FBF9F3;border:1px solid #E8E2D4;border-radius:14px;">
        <p style="margin:0 0 10px;color:#1E2A35;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">What to expect</p>
        <ul style="margin:0;padding:0 0 0 18px;color:#5A5048;font-size:14px;line-height:1.6;">
          <li style="margin:0 0 8px;">You are currently <strong style="color:#1E2A35;">waitlisted</strong>. After we verify your payment, you will be placed on the official class roster.</li>
          <li style="margin:0 0 8px;">While your payment is under review, you may still <strong style="color:#1E2A35;">cancel and request a full refund</strong> within the studio's allowable cancellation period.</li>
          <li style="margin:0 0 8px;">Your <strong style="color:#1E2A35;">official e-receipt</strong> will be sent to this email address on the day of class, once the cancellation window has closed.</li>
        </ul>
        ${printedNote}
      </div>
      <p style="margin:18px 0 0;color:#8A7E6E;font-size:13px;line-height:1.55;">Typical review time is within 24 hours. If anything else is needed, we will contact you using your registered details.</p>
    `,
    ctaLabel: 'View My Classes',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/my-classes`,
  });

  return { subject: `Balansé — Payment proof received (${input.paymentUid})`, html };
}
