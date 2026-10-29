import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/balanse-chat/index.ts';
import { mapAuthError } from '../src/lib/auth-helpers.ts';
import { friendlyRateLimitResponse } from '../src/lib/supabase-rate-limit.ts';

const handler = createHandler((key) =>
  key === 'BALANSE_CHAT_WEBHOOK_SECRET' ? 'x'.repeat(32) : undefined,
);
const alternatePort = await handler(new Request('https://example.test/balanse-chat', {
  method: 'POST',
  headers: {
    origin: 'http://localhost:5174',
    'content-type': 'application/json',
    'x-real-ip': 'local-alt-port',
  },
  body: JSON.stringify({ message: 'Hello', history: [] }),
}));
assert.equal(alternatePort.status, 503, 'a non-default Vite port is still an allowed local origin');
assert.equal(alternatePort.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5174');
const request = () => new Request('https://example.test/balanse-chat', {
  method: 'POST',
  headers: {
    origin: 'http://localhost:5173',
    'content-type': 'application/json',
    'x-real-ip': 'local-rate-limit-test',
  },
  body: JSON.stringify({ message: 'Hello', history: [] }),
});

for (let attempt = 0; attempt < 10; attempt++) {
  const response = await handler(request());
  assert.equal(response.status, 503, 'accepted requests reach the unconfigured local catalog');
}

const limited = await handler(request());
assert.equal(limited.status, 429);
assert.equal(limited.headers.get('Retry-After'), '60');
assert.deepEqual(await limited.json(), { ok: false, error: 'Please wait a minute.' });

assert.equal(
  mapAuthError({ status: 429, message: '' }, 'Login failed.'),
  'Too many attempts. Please wait a moment and try again.',
);

const apiResponse = friendlyRateLimitResponse(
  'https://example.test/rest/v1/classes',
  new Response(null, { status: 429, headers: { 'Retry-After': '30' } }),
);
assert.equal(apiResponse.status, 429);
assert.equal(apiResponse.headers.get('Retry-After'), '30');
assert.equal((await apiResponse.json()).message, 'Too many requests. Please wait a moment and try again.');

const storageResponse = friendlyRateLimitResponse(
  'https://example.test/storage/v1/object/profile/photo',
  new Response(null, { status: 429 }),
);
assert.equal((await storageResponse.json()).message, 'Too many requests. Please wait a moment and try again.');

console.log('Local chatbot, authentication, and API rate limit handling passed.');
