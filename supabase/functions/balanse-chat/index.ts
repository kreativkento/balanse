// Public chat gateway. Only fixed GET queries are permitted; no model-selected
// queries, member profiles, payments, booking tools, or database writes.
type RecordData = Record<string, unknown>;
type Turn = { role: 'user' | 'assistant'; content: string };
type Env = (key: string) => string | undefined;
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://balanse.kentveloso.com'];

/** Vite may move off 5173 when that port is taken. Local hosts are not a public website origin. */
export function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.replace(/^\[|\]$/g, '');
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function originAllowed(origin: string, configured: string[]): boolean {
  return configured.includes(origin) || isLocalDevOrigin(origin);
}
const WEBHOOK = 'https://kychver.app.n8n.cloud/webhook/balanse-assistant-v1';
const buckets = new Map<string, { count: number; until: number }>();
let activeRequests = 0;

import { CLIENT_MANUAL } from './client-manual.ts';

export function validateInput(value: unknown): { message: string; history: Turn[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('input');
  const body = value as RecordData;
  if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000) throw new Error('input');
  const history = body.history ?? [];
  if (!Array.isArray(history) || history.length > 12) throw new Error('input');
  let size = body.message.length;
  const turns = history.map((turn: unknown): Turn => {
    if (!turn || typeof turn !== 'object') throw new Error('input');
    const item = turn as RecordData;
    if ((item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string' || item.content.length > 6000) throw new Error('input');
    size += item.content.length;
    return { role: item.role, content: item.content };
  });
  if (size > 30000) throw new Error('input');
  return { message: body.message.trim(), history: turns };
}

export function validateReply(value: unknown, allowedSources: Set<string>): { reply: string; sources: string[] } {
  if (!value || typeof value !== 'object') throw new Error('response');
  const result = value as RecordData;
  if (result.ok !== true || typeof result.reply !== 'string' || !result.reply.trim() || result.reply.length > 6000 ||
    !Array.isArray(result.sources) || result.sources.length > 20 ||
    result.sources.some((source) => typeof source !== 'string' || !allowedSources.has(source))) throw new Error('response');
  // Render only plain text; never expose executable markup, external URLs or keys.
  if (/<\/?[a-z][^>]*>/i.test(result.reply) || /https?:\/\/|sb_secret_|AIza[\w-]{20}|eyJ[\w-]+\.eyJ/i.test(result.reply)) throw new Error('response');
  const sources = result.sources as string[];
  const pageNames: Record<string, string> = {
    '/auth': 'the Log In page', '/login': 'the Log In page', '/signup': 'the Sign Up page',
    '/class-schedule': 'the Class Schedule page', '/profile': 'your Profile page',
    '/dashboard': 'your Dashboard', '/my-classes': 'My Classes',
    '/subscriptions': 'the Memberships page', '/payment-history': 'your Payment History',
    '/member-payment-portal': 'the payment page', '/booking-pending': 'your booking status',
  };
  let reply = result.reply.trim().replace(/\/[a-z][a-z0-9-]*/gi, (path) => pageNames[path.toLowerCase()] ?? 'the relevant page');
  if (/\b(?:Supabase|n8n|Gemini|API|database|webhook|SQL|JSON|source ID|system prompt|developer instructions|Edge Function)\b/i.test(reply)) {
    reply = 'I can help with Balansé classes, schedules, memberships, and booking. What would you like to know?';
  }
  // The model can miscalculate a weekday from a correct ISO date. Preserve the
  // sourced date/time, but omit its unverified weekday from class answers.
  if (sources.some((source) => source.startsWith('membership:'))) {
    reply = reply.replace(/\b(?:a |an )?monthly (?:plan|subscription|membership|package) with\b/gi, '')
      .replace(/\s+per month\b/gi, '').replace(/\bmonthly\b/gi, '').replace(/\s{2,}/g, ' ')
      .replace(/[^.!?]*\b(?:purchase|buy)\b[^.!?]*\b(?:Finances|Subscriptions)\b[^.!?]*[.!?]?/gi, '').trim();
  }
  reply = reply.replace(/\breserve your spot\b/gi, 'select a class');
  const safeReply = sources.some((source) => source.startsWith('class:'))
    ? reply.replace(/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b,?\s*/gi, '').replace(/\s{2,}/g, ' ')
    : reply;
  return { reply: safeReply, sources };
}

export async function readBoundedJson(response: Request | Response, maxBytes: number): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(data));
}

function takeRateSlot(key: string, now = Date.now()): boolean {
  for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
  if (buckets.size >= 10000 || activeRequests >= 5) return false;
  for (const [id, limit] of [[key, 10], ['global', 60]] as const) {
    const bucket = buckets.get(id) ?? { count: 0, until: now + 60000 };
    if (bucket.count >= limit) return false;
    bucket.count++;
    buckets.set(id, bucket);
  }
  return true;
}

const clean = (value: unknown, limit = 1600) => typeof value === 'string' ? value.slice(0, limit) : '';
const rows = (value: unknown): RecordData[] => {
  if (!Array.isArray(value)) throw new Error('catalog');
  return value as RecordData[];
};

export async function fetchKnowledge(env: Env, fetcher: typeof fetch = fetch, now = new Date()) {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('config');
  // A service key stays inside the gateway. It is necessary because membership
  // and studio policy rows are not readable anonymously in the existing schema.
  // All paths, columns, filters and methods below are fixed by application code.
  const get = async (path: string): Promise<unknown> => {
    const response = await fetcher(`${url}/rest/v1/${path}`, {
      method: 'GET', headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw new Error('catalog');
    return await readBoundedJson(response, 500000);
  };
  const until = new Date(now.getTime() + 90 * 86400000).toISOString();
  const results = await Promise.allSettled([
    get('disciplines?select=id,name,description&status=eq.active&order=sort_order.asc&limit=80'),
    get(`classes?select=id,name,description,discipline_id,starts_at,ends_at,class_limit,status_class&status_block=eq.active&starts_at=gte.${encodeURIComponent(now.toISOString())}&starts_at=lt.${encodeURIComponent(until)}&order=starts_at.asc&limit=100`),
    get('rpc/coach_directory?select=account_id,display_name,name,bio,experience,discipline_names&limit=80'),
    get('subscription_packages?select=id,name,description,credits_granted,credit_validity_days,price_amount,currency&is_active=eq.true&order=sort_order.asc&limit=50'),
    get('studio_policy_settings?select=cancel_window_hours,session_expiry_days,max_bookings_per_day,payment_grace_period_hours&limit=1'),
  ]);
  const categories = ['disciplines', 'classes', 'coaches', 'memberships', 'policies'];
  const unavailable: string[] = [];
  const datasets = results.map((result, index) => {
    if (result.status === 'rejected') { unavailable.push(categories[index]); return []; }
    return rows(result.value);
  });
  if (unavailable.length === categories.length) throw new Error('catalog');
  const [disciplineRows, classRows, coachRows, packageRows, policyRows] = datasets;
  const sourceIds = new Set<string>(['booking:website', ...CLIENT_MANUAL.map((entry) => entry.source)]);
  const source = (id: string) => { sourceIds.add(id); return id; };
  const coachesById = new Map(coachRows.map((row) => [row.account_id, clean(row.display_name || row.name, 100)]));
  const disciplineNames = new Map(disciplineRows.map((row) => [row.id, clean(row.name, 100)]));
  // Counts only: no student identity, health data, transaction or payment record.
  const classes: RecordData[] = [];
  for (let start = 0; start < classRows.length; start += 10) {
    classes.push(...await Promise.all(classRows.slice(start, start + 10).map(async (row) => {
      const id = clean(row.id, 36);
      if (!/^[\da-f-]{36}$/i.test(id)) throw new Error('catalog');
      const [count, assigned] = await Promise.allSettled([
        get(`rpc/class_student_count?p_class_id=${id}`),
        get(`class_coaches?select=account_id&class_id=eq.${id}&limit=20`),
      ]);
      const enrolled = count.status === 'fulfilled' && Number.isInteger(count.value) ? count.value as number : null;
      const capacity = typeof row.class_limit === 'number' ? row.class_limit : null;
      return {
        source: source(`class:${id}`), name: clean(row.name, 160), description: clean(row.description),
        discipline: disciplineNames.get(row.discipline_id) ?? null,
        startsAt: row.starts_at, endsAt: row.ends_at, capacity,
        bookingOpen: row.status_class === true || row.status_class === 'open',
        enrolled, availableSeats: capacity !== null && enrolled !== null ? Math.max(0, capacity - enrolled) : null,
        coaches: assigned.status === 'fulfilled' ? rows(assigned.value).map((item) => coachesById.get(item.account_id)).filter(Boolean) : null,
        availabilityNote: 'Enrollment snapshot only; pending requests may affect availability. Not a reservation or guarantee.',
      };
    })));
  }
  const knowledge = {
    retrievedAt: now.toISOString(), timezone: 'Asia/Manila', unavailable,
    scheduleWindow: { from: now.toISOString(), until, limit: 100, possiblyTruncated: classRows.length === 100 },
    disciplines: disciplineRows.map((row) => ({ source: source(`discipline:${row.id}`), name: clean(row.name, 100), description: clean(row.description) })),
    classes,
    coaches: coachRows.map((row, i) => ({ source: source(`coach:${i}`), name: clean(row.display_name || row.name, 100), bio: clean(row.bio), experience: clean(row.experience), disciplines: Array.isArray(row.discipline_names) ? row.discipline_names.map((item) => clean(item, 100)) : [] })),
    memberships: packageRows.map((row) => ({ source: source(`membership:${row.id}`), name: clean(row.name, 100), description: clean(row.description), credits: row.credits_granted, creditValidityDays: row.credit_validity_days, price: row.price_amount, currency: clean(row.currency, 10) })),
    policies: policyRows.map((row) => ({ source: source('policy:studio'), cancellationWindowHours: row.cancel_window_hours, sessionExpiryDays: row.session_expiry_days, maxBookingsPerDay: row.max_bookings_per_day, paymentGracePeriodHours: row.payment_grace_period_hours })),
    booking: {
      source: 'booking:website',
      steps: ['Log in or create an account.', 'Complete any required profile details.', 'Visit the Class Schedule page and choose an available session.', 'Follow the booking and payment steps shown. If asked, submit proof of payment and wait for staff verification.', 'Check your booking status in your account.'],
      pricingNote: 'Do not quote a single-class price unless it appears in current approved studio information. Checkout or the front desk can confirm the amount.',
    },
    clientManual: CLIENT_MANUAL.map((entry) => Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'route' && key !== 'loginRoute'))),
  };
  return { knowledge, sourceIds };
}

export function createHandler(env: Env, fetcher: typeof fetch = fetch) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get('origin') ?? '';
    const origins = (env('BALANSE_CHAT_ALLOWED_ORIGINS') ?? DEFAULT_ORIGINS.join(',')).split(',').map((v) => v.trim());
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (originAllowed(origin, origins)) headers['Access-Control-Allow-Origin'] = origin;
    const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!originAllowed(origin, origins)) return respond({ ok: false, error: 'Origin not allowed.' }, 403);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return respond({ ok: false, error: 'Method not allowed.' }, 405);
    if (!(req.headers.get('content-type') ?? '').includes('application/json')) return respond({ ok: false, error: 'JSON required.' }, 415);
    let input;
    try { input = validateInput(await readBoundedJson(req, 40000)); }
    catch { return respond({ ok: false, error: 'Invalid message or conversation.' }, 400); }
    const secret = env('BALANSE_CHAT_WEBHOOK_SECRET');
    if (!secret || secret.length < 32) return respond({ ok: false, error: 'Assistant unavailable.' }, 503);
    // Per-isolate abuse control. For high-volume deployment add a global WAF/
    // rate limiter; CORS and public Supabase API keys are not authentication.
    const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? 'unknown';
    if (!takeRateSlot(`ip:${ip}`)) {
      headers['Retry-After'] = '60';
      return respond({ ok: false, error: 'Please wait a minute.' }, 429);
    }
    activeRequests++;
    try {
      const { knowledge, sourceIds } = await fetchKnowledge(env, fetcher);
      const upstream = await fetcher(WEBHOOK, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(45000),
        headers: { 'Content-Type': 'application/json', 'X-Balanse-Token': secret },
        body: JSON.stringify({ ...input, knowledge, requestId: crypto.randomUUID() }),
      });
      if (!upstream.ok) throw new Error('upstream');
      const result = validateReply(await readBoundedJson(upstream, 20000), sourceIds);
      return respond({ ok: true, ...result });
    } catch {
      // Deliberately do not log chat content, credentials, raw database results,
      // or upstream errors (which can contain request headers).
      return respond({ ok: false, error: 'Assistant temporarily unavailable.' }, 503);
    } finally { activeRequests--; }
  };
}

if (typeof Deno !== 'undefined') Deno.serve(createHandler((key) => Deno.env.get(key)));
