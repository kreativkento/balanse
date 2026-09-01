import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const out = {};
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function summarizeError(error) {
  if (!error) return 'ok';
  const message = String(error.message || error).slice(0, 160);
  if (/cover_image/i.test(message)) return 'missing_cover_image';
  if (/\bphoto\b/i.test(message) && /column/i.test(message)) return 'missing_photo';
  if (/bucket/i.test(message) && /not found|does not exist/i.test(message)) return 'missing_bucket';
  return `error:${message}`;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log('vite_env=missing');
  process.exit(1);
}

const supabase = createClient(url, key);
const [bucket, client, staff] = await Promise.all([
  supabase.storage.from('profile_images').list('', { limit: 1 }),
  supabase.from('profiles_client').select('photo, cover_image').limit(1),
  supabase.from('profiles_staff').select('photo, cover_image').limit(1),
]);

console.log(`bucket=${summarizeError(bucket.error)}`);
console.log(`profiles_client=${summarizeError(client.error)}`);
console.log(`profiles_staff=${summarizeError(staff.error)}`);

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64',
);
const probePath = `_probe/${Date.now()}.png`;
const { error: uploadError } = await supabase.storage
  .from('profile_images')
  .upload(probePath, png, { contentType: 'image/png', upsert: false });

if (!uploadError) {
  await supabase.storage.from('profile_images').remove([probePath]);
  console.log('anon_upload=open');
} else {
  const message = String(uploadError.message || '').toLowerCase();
  if (
    message.includes('row-level security')
    || message.includes('not allowed')
    || message.includes('unauthorized')
    || message.includes('jwt')
    || message.includes('security policy')
  ) {
    console.log('anon_upload=denied_by_policy');
  } else {
    console.log(`anon_upload=${summarizeError(uploadError)}`);
  }
}

const root = await supabase.storage.from('profile_images').list('', { limit: 100 });
const folders = (root.data ?? []).filter((entry) => entry.name && !entry.name.startsWith('_probe'));
let photos = 0;
let covers = 0;
for (const folder of folders) {
  const inner = await supabase.storage.from('profile_images').list(folder.name, { limit: 20 });
  const names = (inner.data ?? []).map((entry) => entry.name);
  if (names.some((name) => name === 'photo' || name.startsWith('photo.'))) photos += 1;
  if (names.some((name) => name === 'cover' || name.startsWith('cover.'))) covers += 1;
}
console.log(`user_folders=${folders.length}`);
console.log(`stored_photos=${photos}`);
console.log(`stored_covers=${covers}`);

if (process.env.AUTH_PROBE !== '1') {
  process.exit(0);
}

const email = `buckets.probe.${Date.now()}@balanse.com`;
const password = `Probe${Date.now()}Aa!`;
const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { first_name: 'Buckets', last_name: 'Probe' } },
});

if (signUpError) {
  console.log(`auth_signup=${summarizeError(signUpError)}`);
  process.exit(0);
}

if (!signedUp.session || !signedUp.user) {
  console.log('auth_signup=needs_confirmation');
  process.exit(0);
}

console.log('auth_signup=session');

async function uploadKind(kind) {
  const path = `${signedUp.user.id}/${kind}`;
  const { error } = await supabase.storage
    .from('profile_images')
    .upload(path, png, { contentType: 'image/png', upsert: true });
  if (error) return summarizeError(error);
  return 'ok';
}

const photoResult = await uploadKind('photo');
const coverResult = await uploadKind('cover');
console.log(`auth_photo=${photoResult}`);
console.log(`auth_cover=${coverResult}`);

const listed = await supabase.storage.from('profile_images').list(signedUp.user.id, { limit: 20 });
const names = (listed.data ?? []).map((entry) => entry.name);
console.log(`auth_listed_photo=${names.includes('photo') ? 'ok' : 'missing'}`);
console.log(`auth_listed_cover=${names.includes('cover') ? 'ok' : 'missing'}`);

const { data: photoPub } = supabase.storage.from('profile_images').getPublicUrl(`${signedUp.user.id}/photo`);
const { data: coverPub } = supabase.storage.from('profile_images').getPublicUrl(`${signedUp.user.id}/cover`);
const photoGet = await fetch(photoPub.publicUrl, { method: 'GET' });
const coverGet = await fetch(coverPub.publicUrl, { method: 'GET' });
console.log(`auth_public_photo=${photoGet.ok ? 'ok' : photoGet.status}`);
console.log(`auth_public_cover=${coverGet.ok ? 'ok' : coverGet.status}`);

await supabase.storage
  .from('profile_images')
  .remove([`${signedUp.user.id}/photo`, `${signedUp.user.id}/cover`]);
await supabase.auth.signOut();
console.log('auth_cleanup=removed_objects');
