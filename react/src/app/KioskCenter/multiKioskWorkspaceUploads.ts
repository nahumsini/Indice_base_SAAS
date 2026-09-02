export interface KioskPresignedUpload {
  object_key: string;
  upload_url: string;
  expires_at?: string;
  upload_headers?: Record<string, string>;
}

/**
 * Sends bytes only to the short-lived storage URL approved by the module action.
 * Kiosk business APIs remain behind the Multikiosco parent and child sessions.
 */
export async function uploadPresignedKioskFile(
  upload: KioskPresignedUpload,
  file: Blob,
  contentType: string,
  options: { timeoutMs?: number } = {},
) {
  const headers = new Headers(upload.upload_headers ?? {});
  if (contentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', contentType);
  }

  const timeoutMs = Number.isFinite(options.timeoutMs) && (options.timeoutMs ?? 0) > 0
    ? options.timeoutMs
    : null;
  const controller = timeoutMs !== null ? new AbortController() : null;
  const timeoutId = controller
    ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetch(upload.upload_url, {
      method: 'PUT',
      headers,
      body: file,
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error('KIOSK_EVIDENCE_UPLOAD_FAILED');
    }
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error('KIOSK_EVIDENCE_UPLOAD_TIMEOUT');
    }
    throw error;
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}
