/** Notifications may navigate only within the current ERP origin; retain owner query parameters. */
export function notificationDestination(value: string | null | undefined, origin: string): string | null {
  if (!value?.trim() || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== new URL(origin).origin || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}
