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
) {
  const headers = new Headers(upload.upload_headers ?? {});
  if (contentType && !headers.has('Content-Type')) {
    headers.set('Content-Type', contentType);
  }

  const response = await fetch(upload.upload_url, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error('KIOSK_EVIDENCE_UPLOAD_FAILED');
  }
}
