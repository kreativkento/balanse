import type { SupabaseClient, User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { findDemoAccount } from './demo-accounts.ts';
import { createDemoQuery, demoRpc } from './demo-query.ts';
import { resetDemoStore } from './demo-store.ts';
import { enterDemoMode, exitDemoMode, getDemoUser, isDemoMode, type DemoSessionUser } from './mode.ts';

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

const authListeners = new Set<AuthListener>();

function demoUser(account: DemoSessionUser): User {
  return {
    id: account.id,
    email: account.email,
    app_metadata: {},
    user_metadata: { name: account.name, role: account.role },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;
}

function demoSession(account: DemoSessionUser): Session {
  const user = demoUser(account);
  return {
    access_token: 'demo-access',
    refresh_token: 'demo-refresh',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

function notify(event: AuthChangeEvent, session: Session | null) {
  authListeners.forEach((listener) => listener(event, session));
}

export function routeBalanseFlowTraffic<T extends SupabaseClient>(client: T): T {
  const from = client.from.bind(client);
  client.from = ((table: string) =>
    isDemoMode() ? (createDemoQuery(table) as ReturnType<T['from']>) : from(table)) as T['from'];

  const rpc = client.rpc.bind(client);
  client.rpc = ((...args: Parameters<T['rpc']>) =>
    isDemoMode() ? demoRpc() : rpc(...args)) as T['rpc'];

  const invoke = client.functions.invoke.bind(client.functions);
  client.functions.invoke = ((...args: Parameters<typeof invoke>) =>
    isDemoMode()
      ? Promise.resolve({ data: null, error: null })
      : invoke(...args)) as typeof invoke;

  const channel = client.channel.bind(client);
  client.channel = ((name: string, opts?: Parameters<typeof channel>[1]) => {
    if (!isDemoMode()) return channel(name, opts);
    return {
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
      unsubscribe() {
        return Promise.resolve('ok');
      },
    } as ReturnType<T['channel']>;
  }) as T['channel'];

  const storageFrom = client.storage.from.bind(client.storage);
  client.storage.from = ((bucket: string) => {
    if (!isDemoMode()) return storageFrom(bucket);
    return {
      upload: async () => ({ data: { path: `demo/${bucket}/file` }, error: null }),
      download: async () => ({ data: new Blob(), error: null }),
      remove: async () => ({ data: [], error: null }),
      list: async () => ({ data: [], error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://demo.local/${bucket}/${path}` } }),
      createSignedUrl: async (path: string) => ({
        data: { signedUrl: `https://demo.local/${bucket}/${path}` },
        error: null,
      }),
    } as ReturnType<T['storage']['from']>;
  }) as T['storage']['from'];

  const signIn = client.auth.signInWithPassword.bind(client.auth);
  client.auth.signInWithPassword = (async (credentials) => {
    const email = 'email' in credentials ? String(credentials.email ?? '') : '';
    const password = 'password' in credentials ? String(credentials.password ?? '') : '';
    const demo = findDemoAccount(email, password);
    if (demo) {
      resetDemoStore();
      enterDemoMode(demo);
      const session = demoSession(demo);
      queueMicrotask(() => notify('SIGNED_IN', session));
      return { data: { user: session.user, session }, error: null };
    }
    if (isDemoMode()) {
      return { data: { user: null, session: null }, error: { message: 'Use a demo password in Balanse\'s Flow.', name: 'AuthError', status: 400 } };
    }
    return signIn(credentials);
  }) as typeof client.auth.signInWithPassword;

  const signOut = client.auth.signOut.bind(client.auth);
  client.auth.signOut = (async (options) => {
    if (isDemoMode()) {
      exitDemoMode();
      queueMicrotask(() => notify('SIGNED_OUT', null));
      return { error: null };
    }
    return signOut(options);
  }) as typeof client.auth.signOut;

  const getUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (async () => {
    if (!isDemoMode()) return getUser();
    const account = getDemoUser();
    if (!account) return { data: { user: null }, error: null };
    return { data: { user: demoUser(account) }, error: null };
  }) as typeof client.auth.getUser;

  const getSession = client.auth.getSession.bind(client.auth);
  client.auth.getSession = (async () => {
    if (!isDemoMode()) return getSession();
    const account = getDemoUser();
    return { data: { session: account ? demoSession(account) : null }, error: null };
  }) as typeof client.auth.getSession;

  const onAuthStateChange = client.auth.onAuthStateChange.bind(client.auth);
  client.auth.onAuthStateChange = ((callback: AuthListener) => {
    if (isDemoMode() || authListeners.size >= 0) {
      authListeners.add(callback);
      const live = onAuthStateChange((event, session) => {
        if (!isDemoMode()) callback(event, session);
      });
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
              live.data.subscription.unsubscribe();
            },
          },
        },
      };
    }
    return onAuthStateChange(callback);
  }) as typeof client.auth.onAuthStateChange;

  return client;
}
