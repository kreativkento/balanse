// Run with: node --env-file=.env --env-file=.env.chatbot.local scripts/test-balanse-chat.mjs [test|production|gateway]
const mode = process.argv[2] ?? 'gateway';
const publicKey = process.env.VITE_SUPABASE_ANON_KEY;
const base = process.env.VITE_SUPABASE_URL;
const secret = process.env.BALANSE_CHAT_WEBHOOK_SECRET;
if (!publicKey || !base || !secret) throw new Error('Missing local test configuration');

const query = async (path) => {
  const response = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: publicKey } });
  if (!response.ok) throw new Error(`Public catalog unavailable: ${response.status}`);
  return await response.json();
};
const [classes, disciplines, coaches] = await Promise.all([
  query('classes?select=id,name,starts_at,ends_at,class_limit,status_class,discipline_id&status_block=eq.active&limit=10'),
  query('disciplines?select=id,name,description&status=eq.active&limit=40'),
  query('rpc/coach_directory?select=display_name,discipline_names&limit=20'),
]);
const knowledge = {
  retrievedAt: new Date().toISOString(), timezone: 'Asia/Manila', unavailable: [],
  scheduleWindow: { limit: 100, possiblyTruncated: false },
  classes: classes.map((row) => ({ source: `class:${row.id}`, name: row.name, startsAt: row.starts_at, endsAt: row.ends_at, capacity: row.class_limit, bookingOpen: row.status_class, availableSeats: null, discipline: disciplines.find((item) => item.id === row.discipline_id)?.name })),
  disciplines: disciplines.map((row) => ({ source: `discipline:${row.id}`, name: row.name, description: row.description })),
  coaches: coaches.map((row, index) => ({ source: `coach:${index}`, name: row.display_name, disciplines: row.discipline_names })),
  // Independently verified from the live Supabase SQL catalog during setup.
  memberships: [
    { source: 'membership:live-silver', name: 'Silver Membership', credits: 12, creditValidityDays: 30, price: 3600, currency: 'PHP' },
    { source: 'membership:live-gold', name: 'Gold Membership', credits: 20, creditValidityDays: 30, price: 4800, currency: 'PHP' },
  ],
  policies: [], booking: { source: 'booking:website', steps: ['Sign in at /auth; choose an available session at /class-schedule and follow checkout.'] },
};
const endpoint = mode === 'test'
  ? 'https://kychver.app.n8n.cloud/webhook-test/balanse-assistant-v1'
  : mode === 'production' ? 'https://kychver.app.n8n.cloud/webhook/balanse-assistant-v1'
    : `${base}/functions/v1/balanse-chat`;
const headers = mode === 'gateway'
  ? { apikey: publicKey, Authorization: `Bearer ${publicKey}`, Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }
  : { 'X-Balanse-Token': secret, 'Content-Type': 'application/json' };
const body = mode === 'gateway'
  ? { message: process.argv[3] ?? 'How much is Gold Membership, and is it unlimited?', history: [] }
  : { message: process.argv[3] ?? 'How much is Gold Membership, and is it unlimited?', history: [], knowledge };
const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
console.log(JSON.stringify({ status: response.status, body: await response.text() }));
