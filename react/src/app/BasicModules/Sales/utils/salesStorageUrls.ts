const localStorageHosts = new Set(['localhost', '127.0.0.1', 'minio']);

/**
 * Keeps signed MinIO paths intact while routing local or stale proxy hosts
 * through the origin that is actually serving the Sales UI.
 */
export function resolveSalesStorageUrl(storageUrl?: string | null): string {
  const normalized = storageUrl?.trim() ?? '';
  if (!normalized || typeof window === 'undefined') {
    return normalized;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const parsedUrl = new URL(normalized, currentUrl.origin);
    const isStorageProxyPath = parsedUrl.pathname.startsWith('/storage/');
    const isLocalStorageHost = localStorageHosts.has(parsedUrl.hostname) || parsedUrl.port === '9000';

    if (parsedUrl.origin === currentUrl.origin) {
      return parsedUrl.toString();
    }

    if (isStorageProxyPath && (isLocalStorageHost || parsedUrl.hostname === currentUrl.hostname)) {
      return `${currentUrl.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (isLocalStorageHost && !isStorageProxyPath) {
      return `${currentUrl.origin}/storage${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (parsedUrl.hostname === currentUrl.hostname && parsedUrl.protocol !== currentUrl.protocol) {
      return `${currentUrl.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    return parsedUrl.toString();
  } catch {
    return normalized;
  }
}
