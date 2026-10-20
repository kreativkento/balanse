export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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

function packageBlock(input: {
  packageName: string;
  creditsGranted: number;
  creditValidityDays: number;
  extraRows?: string;
}): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#FBF9F3;border:1px solid #E8E2D4;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:12px 18px;border-bottom:1px solid #F0EBE0;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9A8E7E;">Package</td></tr>
      <tr><td style="padding:18px 18px 16px;">
        <p style="margin:0 0 14px;color:#1E2A35;font-size:22px;font-weight:700;line-height:1.25;">${escapeHtml(input.packageName)}</p>
        <p style="margin:0 0 8px;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Credits:</strong> ${input.creditsGranted}</p>
        <p style="margin:0;color:#5A5048;font-size:15px;line-height:1.5;"><strong style="color:#1E2A35;">Valid for:</strong> ${input.creditValidityDays} days after approval</p>
        ${input.extraRows ?? ''}
      </td></tr>
    </table>`;
}

export function buildSubscriptionPaymentApprovedEmail(input: {
  memberName: string;
  packageName: string;
  creditsGranted: number;
  creditValidityDays: number;
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
    title: 'Congratulations — payment approved',
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.memberName)},</p>
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;"><strong style="color:#1E2A35;">Congratulations!</strong> We verified your credit pack payment and approved your request.</p>
      <p style="margin:0 0 18px;color:#5A5048;font-size:15px;line-height:1.55;">Your credits have been awarded to your wallet. We recorded the purchase in your account ledger and final transaction records. Your credit validity period <strong>starts now</strong> and runs for <strong>${input.creditValidityDays} days</strong> from today.</p>
      ${packageBlock({
        packageName: input.packageName,
        creditsGranted: input.creditsGranted,
        creditValidityDays: input.creditValidityDays,
        extraRows,
      })}
      <p style="margin:20px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">Use your credits when enrolling in open classes. Your official e-receipt may arrive in a separate email.</p>
    `,
    ctaLabel: 'View Credits',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/credits`,
  });

  return { subject: `Balansé — Congratulations! Credits approved (${input.paymentUid})`, html };
}

export function buildSubscriptionPaymentRejectedEmail(input: {
  memberName: string;
  packageName: string;
  creditsGranted: number;
  creditValidityDays: number;
  paymentUid: string;
  reviewNote: string;
  siteUrl: string;
}): { subject: string; html: string } {
  const noteBlock = input.reviewNote.trim()
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#FFF5F5;border:1px solid #FECACA;border-radius:10px;color:#5A5048;font-size:14px;line-height:1.5;"><strong style="color:#991B1B;">Note from our team:</strong> ${escapeHtml(input.reviewNote.trim())}</p>`
    : '';

  const html = wrapEmail({
    siteUrl: input.siteUrl,
    title: 'Payment not approved',
    body: `
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">Hi ${escapeHtml(input.memberName)},</p>
      <p style="margin:0 0 12px;color:#5A5048;font-size:15px;line-height:1.55;">We reviewed your credit pack payment (reference <strong>${escapeHtml(input.paymentUid)}</strong>) and could not approve it at this time. No credits were added to your wallet.</p>
      <p style="margin:0 0 18px;padding:12px 14px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;color:#5A5048;font-size:14px;line-height:1.55;">For a better chance of approval on your next submission, try updating the submitted image proof so it clearly matches your payment transaction (amount, date, and reference).</p>
      ${packageBlock({
        packageName: input.packageName,
        creditsGranted: input.creditsGranted,
        creditValidityDays: input.creditValidityDays,
      })}
      ${noteBlock}
      <p style="margin:20px 0 0;color:#5A5048;font-size:14px;line-height:1.55;">Open Credits, select the same package, and resubmit with updated proof.</p>
    `,
    ctaLabel: 'Resubmit payment',
    ctaHref: `${input.siteUrl.replace(/\/$/, '')}/credits`,
  });

  return { subject: `Balansé — Credit payment not approved (${input.paymentUid})`, html };
}
