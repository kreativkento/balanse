import type { FunctionsError } from '@supabase/supabase-js';

type EdgePayload = { ok?: boolean; error?: string } | null;

/** Read `{ ok, error }` from a functions.invoke result (including non-2xx bodies). */
export async function readEdgeFunctionPayload(
  data: unknown,
  error: FunctionsError | null,
): Promise<{ payload: EdgePayload; invokeError: string | null }> {
  if (!error) {
    return { payload: data as EdgePayload, invokeError: null };
  }

  let message = error.message;
  const ctx = (error as FunctionsError & { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as { error?: string; ok?: boolean } | null;
      if (body?.error) message = body.error;
      if (body && typeof body === 'object') {
        return { payload: body as EdgePayload, invokeError: message };
      }
    } catch {
      // ignore JSON parse failure
    }
  }

  return { payload: data as EdgePayload, invokeError: message };
}
