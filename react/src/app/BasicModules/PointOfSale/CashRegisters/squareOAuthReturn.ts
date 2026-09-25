export function readSquareOAuthReturn(url: URL) {
  const keys = ['square_oauth_code', 'square_oauth_state', 'square_oauth_error'];
  if (!keys.some((key) => url.searchParams.has(key))) return null;
  const code = url.searchParams.get(keys[0]);
  const state = url.searchParams.get(keys[1]);
  const error = url.searchParams.get(keys[2]);
  for (const key of keys) url.searchParams.delete(key);
  const valid = Boolean(code && code.length <= 191 && state && /^[a-f0-9]{64}$/.test(state));
  return { code: valid ? code : null, state: valid ? state : null, error: error || (valid ? null : 'invalid_response'), cleanUrl: `${url.pathname}${url.search}${url.hash}` };
}
