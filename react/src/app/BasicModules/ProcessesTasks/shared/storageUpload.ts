const localStorageHosts = new Set(['localhost', '127.0.0.1']);

function currentOriginCanProxyStorage(currentUrl: URL) {
  if (!localStorageHosts.has(currentUrl.hostname)) {
    return true;
  }

  return currentUrl.port === '8080';
}

function shouldUseCurrentOrigin(uploadUrl: URL, currentUrl: URL) {
  if (!uploadUrl.pathname.startsWith('/storage/')) {
    return false;
  }

  if (uploadUrl.origin === currentUrl.origin) {
    return false;
  }

  return localStorageHosts.has(uploadUrl.hostname) && currentOriginCanProxyStorage(currentUrl);
}

export function normalizeStorageUploadUrl(uploadUrl: string) {
  if (typeof window === 'undefined') {
    return uploadUrl;
  }

  try {
    const parsedUploadUrl = new URL(uploadUrl);
    const currentUrl = new URL(window.location.href);

    if (!shouldUseCurrentOrigin(parsedUploadUrl, currentUrl)) {
      return uploadUrl;
    }

    parsedUploadUrl.protocol = currentUrl.protocol;
    parsedUploadUrl.host = currentUrl.host;
    return parsedUploadUrl.toString();
  } catch {
    return uploadUrl;
  }
}

export async function uploadToPresignedStorage(
  uploadUrl: string,
  file: Blob,
  contentType: string,
  uploadHeaders: Record<string, string> = {},
) {
  const headers = new Headers(uploadHeaders);

  if (contentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', contentType);
  }

  const response = await fetch(normalizeStorageUploadUrl(uploadUrl), {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Storage upload failed with status ${response.status}.`);
  }
}
