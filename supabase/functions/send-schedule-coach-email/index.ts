import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildClassCancellationMemberEmail,
  buildCoachAssignedEmail,
  buildHoldingPendingMemberEmail,
  buildHoldingRefundedMemberEmail,
  buildSlotRequestDecisionEmail,
} from './email-html.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function assertReviewerRole(
  supabaseUrl: string,
  supabaseAnonKey: string,
  serviceRoleKey: string,
  authHeader: string,
  allowedRoles: string[],
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Unauthorized' }, 401) };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: reviewerAccount, error: reviewerError } = await supabaseAdmin
    .from('accounts')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (reviewerError || !reviewerAccount) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Unauthorized' }, 403) };
  }

  const role = reviewerAccount.role as string;
  if (!allowedRoles.includes(role)) {
    return { ok: false, response: jsonResponse({ ok: false, error: 'Access required' }, 403) };
  }

  return { ok: true };
}

async function sendResendEmail(
  resendApiKey: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  html: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error('Resend error:', errText);
    return { ok: false, error: 'Failed to send email.' };
  }

  return { ok: true };
}

async function disciplineNameById(
  supabaseAdmin: ReturnType<typeof createClient>,
  disciplineId: string | null | undefined,
): Promise<string> {
  if (!disciplineId) return '';
  const { data } = await supabaseAdmin
    .from('disciplines')
    .select('name')
    .eq('id', disciplineId)
    .maybeSingle();
  return (data?.name as string | undefined)?.trim() ?? '';
}

type SlotRequestPayload = {
  name?: string;
  description?: string;
  discipline_id?: string;
  class_limit?: number;
  coach_account_ids?: string[];
};

function parsePortalPayload(raw: unknown): SlotRequestPayload {
  if (raw == null) return {};
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof value !== 'object' || value === null) return {};
  return value as SlotRequestPayload;
}

function disciplineNameFromClassRow(
  classRow: Record<string, unknown> | null,
): string {
  if (!classRow) return '';
  const disciplineJoin = classRow.disciplines as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  if (Array.isArray(disciplineJoin)) {
    return disciplineJoin[0]?.name?.trim() ?? '';
  }
  return disciplineJoin?.name?.trim() ?? '';
}

/** Slot decision emails mirror admin UI: request payload for name/discipline, time block for schedule. */
async function resolveSlotRequestEmailDetails(
  supabaseAdmin: ReturnType<typeof createClient>,
  portalRequest: Record<string, unknown>,
  classRow: Record<string, unknown> | null,
): Promise<{
  className: string;
  disciplineName: string;
  startsAt: string | null;
  endsAt: string | null;
}> {
  const payload = parsePortalPayload(portalRequest.payload);
  const payloadName = payload.name?.trim() ?? '';
  const classRowName = typeof classRow?.name === 'string' ? classRow.name.trim() : '';

  const className = payloadName || classRowName || '—';

  let disciplineName = await disciplineNameById(supabaseAdmin, payload.discipline_id);
  if (!disciplineName) {
    disciplineName = disciplineNameFromClassRow(classRow);
  }
  if (!disciplineName && typeof classRow?.discipline_id === 'string') {
    disciplineName = await disciplineNameById(supabaseAdmin, classRow.discipline_id);
  }

  return {
    className,
    disciplineName: disciplineName || '—',
    startsAt: (classRow?.starts_at as string | null | undefined) ?? null,
    endsAt: (classRow?.ends_at as string | null | undefined) ?? null,
  };
}

async function memberRecipient(
  supabaseAdmin: ReturnType<typeof createClient>,
  accountId: string,
): Promise<{ email: string; name: string } | null> {
  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('email')
    .eq('id', accountId)
    .maybeSingle();

  if (accountError || !account?.email) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles_client')
    .select('name, first_name, last_name, nickname')
    .eq('account_id', accountId)
    .maybeSingle();

  const name =
    profile?.name?.trim()
    || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
    || profile?.nickname?.trim()
    || account.email.split('@')[0]
    || 'Member';

  return { email: account.email as string, name };
}

async function coachRecipient(
  supabaseAdmin: ReturnType<typeof createClient>,
  accountId: string,
): Promise<{ email: string; name: string } | null> {
  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .select('email')
    .eq('id', accountId)
    .maybeSingle();

  if (accountError || !account?.email) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles_staff')
    .select('name, display_name')
    .eq('account_id', accountId)
    .maybeSingle();

  const name =
    profile?.name?.trim()
    || profile?.display_name?.trim()
    || account.email.split('@')[0]
    || 'Coach';

  return { email: account.email.trim(), name };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail =
    Deno.env.get('SCHEDULE_FROM_EMAIL')
    ?? Deno.env.get('RECEIPT_FROM_EMAIL')
    ?? 'Balansé Wellness <onboarding@resend.dev>';
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://balanse.kentveloso.com';

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: 'Server configuration incomplete.' }, 500);
  }

  if (!resendApiKey) {
    return jsonResponse({
      ok: false,
      error: 'RESEND_API_KEY is not configured.',
    }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  let kind: string;
  let requestId: string | undefined;
  let classId: string | undefined;
  let variant: string | undefined;
  let replacementCoachAccountId: string | undefined;
  let holdingId: string | undefined;

  try {
    const body = await req.json();
    kind = String(body?.kind ?? '').trim();
    requestId = body?.requestId ? String(body.requestId).trim() : undefined;
    classId = body?.classId ? String(body.classId).trim() : undefined;
    variant = body?.variant ? String(body.variant).trim() : undefined;
    replacementCoachAccountId = body?.replacementCoachAccountId
      ? String(body.replacementCoachAccountId).trim()
      : undefined;
    holdingId = body?.holdingId ? String(body.holdingId).trim() : undefined;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const allowedRoles = kind === 'holding_pending'
    ? ['admin', 'dev', 'frontdesk']
    : ['admin', 'dev'];
  const authCheck = await assertReviewerRole(
    supabaseUrl,
    supabaseAnonKey,
    serviceRoleKey,
    authHeader,
    allowedRoles,
  );
  if (!authCheck.ok) return authCheck.response;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  if (kind === 'portal_slot_decision') {
    if (!requestId) {
      return jsonResponse({ ok: false, error: 'requestId is required' }, 400);
    }

    const { data: portalRequest, error: requestError } = await supabaseAdmin
      .from('portal_requests')
      .select(
        'id, request_type, status, requester_account_id, target_class_id, result_class_id, review_note, payload',
      )
      .eq('id', requestId)
      .maybeSingle();

    if (requestError || !portalRequest) {
      return jsonResponse({ ok: false, error: 'Request not found' }, 404);
    }

    if (portalRequest.request_type !== 'slot_request') {
      return jsonResponse({ ok: false, error: 'Not a slot request' }, 400);
    }

    if (portalRequest.status !== 'approved' && portalRequest.status !== 'rejected') {
      return jsonResponse({ ok: false, error: 'Request is not approved or rejected' }, 400);
    }

    const classKey =
      (portalRequest.target_class_id as string | null)
      ?? (portalRequest.result_class_id as string | null);

    const { data: classRow, error: classError } = classKey
      ? await supabaseAdmin
        .from('classes')
        .select('name, starts_at, ends_at, discipline_id, disciplines ( name )')
        .eq('id', classKey)
        .maybeSingle()
      : { data: null, error: null };

    if (classError) {
      return jsonResponse({ ok: false, error: 'Could not load class' }, 500);
    }

    const slotDetails = await resolveSlotRequestEmailDetails(
      supabaseAdmin,
      portalRequest as Record<string, unknown>,
      (classRow as Record<string, unknown> | null) ?? null,
    );

    const recipient = await coachRecipient(
      supabaseAdmin,
      portalRequest.requester_account_id as string,
    );
    if (!recipient) {
      return jsonResponse({ ok: false, error: 'Coach email not found' }, 404);
    }

    const { subject, html } = buildSlotRequestDecisionEmail({
      coachName: recipient.name,
      approved: portalRequest.status === 'approved',
      className: slotDetails.className,
      disciplineName: slotDetails.disciplineName,
      startsAt: slotDetails.startsAt,
      endsAt: slotDetails.endsAt,
      reviewNote: (portalRequest.review_note as string) ?? '',
      siteUrl,
    });

    const sent = await sendResendEmail(resendApiKey, fromEmail, recipient.email, subject, html);
    if (!sent.ok) {
      return jsonResponse({ ok: false, error: sent.error }, 502);
    }

    return jsonResponse({ ok: true, sentTo: recipient.email });
  }

  if (kind === 'coach_assigned') {
    if (!classId) {
      return jsonResponse({ ok: false, error: 'classId is required' }, 400);
    }

    const { data: classRow, error: classError } = await supabaseAdmin
      .from('classes')
      .select('name, starts_at, ends_at, status_class, disciplines ( name )')
      .eq('id', classId)
      .maybeSingle();

    if (classError || !classRow) {
      return jsonResponse({ ok: false, error: 'Class not found' }, 404);
    }

    const { data: coachRows, error: coachesError } = await supabaseAdmin
      .from('class_coaches')
      .select('account_id')
      .eq('class_id', classId);

    if (coachesError) {
      return jsonResponse({ ok: false, error: 'Could not load coaches' }, 500);
    }

    const coachIds = (coachRows ?? []).map((row) => row.account_id as string);
    if (coachIds.length === 0) {
      return jsonResponse({ ok: false, error: 'No coaches assigned to this class' }, 400);
    }

    const disciplineJoin = classRow.disciplines as { name?: string } | { name?: string }[] | null;
    const disciplineName = Array.isArray(disciplineJoin)
      ? disciplineJoin[0]?.name ?? ''
      : disciplineJoin?.name ?? '';

    const startsAt = (classRow.starts_at as string | null) ?? null;
    const endsAt = (classRow.ends_at as string | null) ?? null;
    const className = (classRow.name as string | undefined)?.trim() || 'Class session';
    const bookingOpen = classRow.status_class === true;

    const sentTo: string[] = [];
    for (const coachId of coachIds) {
      const recipient = await coachRecipient(supabaseAdmin, coachId);
      if (!recipient) continue;

      const { subject, html } = buildCoachAssignedEmail({
        coachName: recipient.name,
        className,
        disciplineName,
        startsAt,
        endsAt,
        bookingOpen,
        siteUrl,
      });

      const sent = await sendResendEmail(
        resendApiKey,
        fromEmail,
        recipient.email,
        subject,
        html,
      );
      if (!sent.ok) {
        return jsonResponse({ ok: false, error: sent.error, partialSentTo: sentTo }, 502);
      }
      sentTo.push(recipient.email);
    }

    if (sentTo.length === 0) {
      return jsonResponse({ ok: false, error: 'No coach emails could be sent' }, 404);
    }

    return jsonResponse({ ok: true, sentTo });
  }

  if (kind === 'class_cancellation_members') {
    if (!classId) {
      return jsonResponse({ ok: false, error: 'classId is required' }, 400);
    }
    if (variant !== 'coach_replaced' && variant !== 'class_cancelled') {
      return jsonResponse({ ok: false, error: 'Invalid variant' }, 400);
    }
    if (variant === 'coach_replaced' && !replacementCoachAccountId) {
      return jsonResponse({ ok: false, error: 'replacementCoachAccountId is required' }, 400);
    }

    const { data: classRow, error: classError } = await supabaseAdmin
      .from('classes')
      .select('name, starts_at, ends_at, disciplines ( name )')
      .eq('id', classId)
      .maybeSingle();

    if (classError || !classRow) {
      return jsonResponse({ ok: false, error: 'Class not found' }, 404);
    }

    const disciplineJoin = classRow.disciplines as { name?: string } | { name?: string }[] | null;
    const disciplineName = Array.isArray(disciplineJoin)
      ? disciplineJoin[0]?.name ?? ''
      : disciplineJoin?.name ?? '';
    const className = (classRow.name as string | undefined)?.trim() || 'Class session';
    const startsAt = (classRow.starts_at as string | null) ?? null;
    const endsAt = (classRow.ends_at as string | null) ?? null;

    let replacementCoachName = '';
    if (variant === 'coach_replaced' && replacementCoachAccountId) {
      const replacement = await coachRecipient(supabaseAdmin, replacementCoachAccountId);
      replacementCoachName = replacement?.name ?? 'Coach';
    }

    const [{ data: enrolledRows }, { data: waitlistRows }] = await Promise.all([
      supabaseAdmin.from('class_students').select('account_id').eq('class_id', classId),
      supabaseAdmin.from('class_waitlist').select('account_id').eq('class_id', classId),
    ]);

    const waitlistIds = new Set(
      (waitlistRows ?? []).map((row) => row.account_id as string),
    );
    const recipientIds = new Set<string>();
    for (const row of enrolledRows ?? []) {
      recipientIds.add(row.account_id as string);
    }
    for (const row of waitlistRows ?? []) {
      recipientIds.add(row.account_id as string);
    }

    const sentTo: string[] = [];
    for (const accountId of recipientIds) {
      const recipient = await memberRecipient(supabaseAdmin, accountId);
      if (!recipient) continue;

      const { subject, html } = buildClassCancellationMemberEmail({
        memberName: recipient.name,
        variant,
        className,
        disciplineName: disciplineName || '—',
        startsAt,
        endsAt,
        replacementCoachName,
        siteUrl,
        waitlisted: waitlistIds.has(accountId),
      });

      const sent = await sendResendEmail(
        resendApiKey,
        fromEmail,
        recipient.email,
        subject,
        html,
      );
      if (!sent.ok) {
        return jsonResponse({ ok: false, error: sent.error, partialSentTo: sentTo }, 502);
      }
      sentTo.push(recipient.email);
    }

    return jsonResponse({ ok: true, sentTo, recipientCount: recipientIds.size });
  }

  if (kind === 'holding_pending' || kind === 'holding_refunded') {
    if (!holdingId) {
      return jsonResponse({ ok: false, error: 'holdingId is required' }, 400);
    }

    const { data: holding, error: holdingError } = await supabaseAdmin
      .from('class_cancel_holdings')
      .select('id, account_id, class_id, refund_kind')
      .eq('id', holdingId)
      .maybeSingle();

    if (holdingError || !holding) {
      return jsonResponse({ ok: false, error: 'Holding row not found' }, 404);
    }

    const { data: classRow, error: classError } = await supabaseAdmin
      .from('classes')
      .select('name, starts_at, ends_at, disciplines ( name )')
      .eq('id', holding.class_id as string)
      .maybeSingle();

    if (classError || !classRow) {
      return jsonResponse({ ok: false, error: 'Class not found' }, 404);
    }

    const recipient = await memberRecipient(supabaseAdmin, holding.account_id as string);
    if (!recipient) {
      return jsonResponse({ ok: false, error: 'Member email not found' }, 404);
    }

    const disciplineJoin = classRow.disciplines as { name?: string } | { name?: string }[] | null;
    const disciplineName = Array.isArray(disciplineJoin)
      ? disciplineJoin[0]?.name ?? ''
      : disciplineJoin?.name ?? '';
    const className = (classRow.name as string | undefined)?.trim() || 'Class session';
    const startsAt = (classRow.starts_at as string | null) ?? null;
    const endsAt = (classRow.ends_at as string | null) ?? null;

    const built = kind === 'holding_pending'
      ? buildHoldingPendingMemberEmail({
        memberName: recipient.name,
        className,
        disciplineName: disciplineName || '—',
        startsAt,
        endsAt,
        siteUrl,
      })
      : buildHoldingRefundedMemberEmail({
        memberName: recipient.name,
        className,
        disciplineName: disciplineName || '—',
        startsAt,
        endsAt,
        refundKind: String(holding.refund_kind ?? 'cash'),
        siteUrl,
      });

    const sent = await sendResendEmail(
      resendApiKey,
      fromEmail,
      recipient.email,
      built.subject,
      built.html,
    );
    if (!sent.ok) {
      return jsonResponse({ ok: false, error: sent.error }, 502);
    }

    return jsonResponse({ ok: true, sentTo: recipient.email });
  }

  return jsonResponse({ ok: false, error: 'Unknown kind' }, 400);
});
