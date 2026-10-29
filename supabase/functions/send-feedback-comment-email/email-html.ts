function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildFeedbackCommentEmail(input: {
  recipientName: string;
  authorName: string;
  ticketTitle: string;
  ticketUid: string;
  commentBody: string;
  href: string;
  siteUrl: string;
}): { subject: string; html: string } {
  const base = input.siteUrl.replace(/\/$/, '');
  const logoUrl = `${base}/logo_main.svg`;
  const ctaHref = input.href.startsWith('http') ? input.href : `${base}${input.href}`;
  const preview = input.commentBody.length > 280
    ? `${input.commentBody.slice(0, 277)}…`
    : input.commentBody;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1E8;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="margin:0 0 24px;text-align:center;">
      <a href="${escapeHtml(base)}" style="display:inline-block;text-decoration:none;">
        <img src="${escapeHtml(logoUrl)}" alt="Balansé Wellness" width="224" style="display:block;margin:0 auto;max-width:224px;width:224px;height:auto;border:0;outline:none;" />
      </a>
    </div>
    <div style="background:#FFFFFF;border:1px solid #D4CDB5;border-radius:16px;padding:28px 24px;box-shadow:0 4px 24px rgba(30,42,53,0.06);">
      <h1 style="margin:0 0 16px;color:#1E2A35;font-size:22px;font-weight:700;line-height:1.3;">New comment on your ticket</h1>
      <p style="margin:0 0 12px;color:#5A5048;font-size:14px;line-height:1.6;">Hi ${escapeHtml(input.recipientName)},</p>
      <p style="margin:0 0 16px;color:#5A5048;font-size:14px;line-height:1.6;">
        <strong>${escapeHtml(input.authorName)}</strong> commented on ticket
        <strong>${escapeHtml(input.ticketUid)}</strong> — ${escapeHtml(input.ticketTitle)}.
      </p>
      <div style="background:#F8F3E8;border:1px solid #D4CDB5;border-radius:12px;padding:14px 16px;color:#1E2A35;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeHtml(preview)}</div>
      <p style="margin:24px 0 0;text-align:center;">
        <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:#c49a3c;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px;">Open ticket</a>
      </p>
    </div>
    <p style="margin:20px 0 0;text-align:center;color:#9A8E7E;font-size:11px;line-height:1.5;">This message was sent by Balansé Wellness because you are part of this ticket loop.</p>
  </div>
</body>
</html>`;

  return {
    subject: `New comment on ticket ${input.ticketUid}`,
    html,
  };
}
