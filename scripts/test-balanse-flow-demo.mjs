import assert from 'node:assert/strict';
import { DEMO_PASSWORD } from '../src/lib/balanse-flow/demo-accounts.ts';
import { isDemoMode } from '../src/lib/balanse-flow/mode.ts';
import { routeBalanseFlowTraffic } from '../src/lib/balanse-flow/route-demo-traffic.ts';

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error('fetch must not run in Balanse\'s Flow demo');
};

const liveFrom = () => {
  fetchCalls += 1;
  return { then: (resolve) => resolve({ data: null, error: null }) };
};

const client = {
  from: liveFrom,
  rpc: liveFrom,
  functions: { invoke: liveFrom },
  channel: liveFrom,
  storage: {
    from: () => ({ upload: liveFrom, getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
  },
  auth: {
    signInWithPassword: liveFrom,
    signOut: liveFrom,
    getUser: liveFrom,
    getSession: liveFrom,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
};

routeBalanseFlowTraffic(client);
fetchCalls = 0;

const signed = await client.auth.signInWithPassword({
  email: 'demo.admin@balanse.local',
  password: DEMO_PASSWORD,
});
assert.equal(signed.error, null);
assert.equal(isDemoMode(), true);

await client.from('accounts').select('*').eq('auth_user_id', 'demo-auth-admin').maybeSingle();
await client.rpc('anything');
await client.functions.invoke('anything');
client.channel('room');
await client.auth.getUser();
await client.storage.from('payment_proofs').upload('a', new Blob());

assert.equal(fetchCalls, 0, 'demo mode must not call fetch');
console.log('balanse-flow demo traffic: ok');
