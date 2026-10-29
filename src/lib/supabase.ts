import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { routeBalanseFlowTraffic } from './balanse-flow/route-demo-traffic.ts';
import { friendlyRateLimitResponse } from './supabase-rate-limit';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = routeBalanseFlowTraffic(createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (input, init) => friendlyRateLimitResponse(input, await fetch(input, init)),
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
}));
