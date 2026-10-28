/** Keep Supabase data and storage throttling errors readable in existing service messages. */
export function friendlyRateLimitResponse(input: RequestInfo | URL, response: Response): Response {
  if (response.status !== 429) return response;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes('/rest/v1/') && !url.includes('/storage/v1/')) return response;

  const headers = new Headers({ 'Content-Type': 'application/json' });
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) headers.set('Retry-After', retryAfter);

  return new Response(JSON.stringify({
    code: 'RATE_LIMITED',
    statusCode: '429',
    error: 'Too Many Requests',
    message: 'Too many requests. Please wait a moment and try again.',
  }), { status: 429, statusText: 'Too Many Requests', headers });
}
