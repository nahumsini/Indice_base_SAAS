export function readMercadoPagoOAuthReturn(url: URL) {
  const code = url.searchParams.get('mp_oauth_code');
  const state = url.searchParams.get('mp_oauth_state');
  const error = url.searchParams.get('mp_oauth_error');
  if (!code && !state && !error) return null;
  for (const key of ['mp_oauth_code', 'mp_oauth_state', 'mp_oauth_error']) url.searchParams.delete(key);
  return { code, state, error, cleanUrl: `${url.pathname}${url.search}${url.hash}` };
}
