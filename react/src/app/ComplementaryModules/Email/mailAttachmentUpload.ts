import { ApiClientError } from '../../lib/apiClient';

export const MAIL_OFFICE_TYPES: Record<string, string> = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
export const MAIL_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const MAIL_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;
export type AttachmentErrorKey = 'fileSize' | 'fileFormat' | 'fileContent' | 'fileLimit' | 'fileQuota' | 'fileStorage' | 'fileConflict' | 'fileAccess' | 'fileTransfer' | 'fileExpired' | 'fileUnknown';
export class AttachmentUploadError extends Error {
  constructor(public readonly key: AttachmentErrorKey) { super(key); }
}

/** Correct common mislabeled images without trusting the browser MIME or changing disk files.
 * The server still verifies the complete file before registering it. */
export async function prepareMailAttachment(original: File): Promise<File> {
  if (original.size < 1 || original.size > MAIL_ATTACHMENT_MAX_BYTES) throw new AttachmentUploadError('fileSize');
  const extension = original.name.match(/\.([^.]+)$/)?.[1].toLowerCase();
  if (!extension || !['pdf', 'png', 'jpg', 'jpeg', 'txt', ...Object.keys(MAIL_OFFICE_TYPES)].includes(extension)
    || original.name.length > 180 || /[\r\n\0/\\]/.test(original.name)) throw new AttachmentUploadError('fileFormat');
  let type = MAIL_OFFICE_TYPES[extension] ?? (extension === 'pdf' ? 'application/pdf' : 'text/plain');
  if (MAIL_OFFICE_TYPES[extension]) {
    const header = new Uint8Array(await original.slice(0, 4).arrayBuffer());
    if (header[0] !== 80 || header[1] !== 75 || header[2] !== 3 || header[3] !== 4) throw new AttachmentUploadError('fileContent');
  }
  let name = original.name;
  if (['png', 'jpg', 'jpeg'].includes(extension)) {
    const header = new Uint8Array(await original.slice(0, 8).arrayBuffer());
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => header[i] === value);
    const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
    if (!png && !jpeg) throw new AttachmentUploadError('fileContent');
    type = png ? 'image/png' : 'image/jpeg';
    if ((png && extension !== 'png') || (jpeg && extension === 'png')) name = name.replace(/\.[^.]+$/, png ? '.png' : '.jpg');
  }
  return original.type === type && original.name === name ? original : new File([original], name, { type, lastModified: original.lastModified });
}

export function attachmentErrorKey(error: unknown): AttachmentErrorKey {
  if (error instanceof AttachmentUploadError) return error.key;
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 'email_attachment_blocked': case 'email_attachment_mismatch': return 'fileContent';
      case 'email_attachment_limit': return 'fileLimit';
      case 'STORAGE_QUOTA_EXCEEDED': return 'fileQuota';
      case 'email_storage_unavailable': return 'fileStorage';
      case 'email_attachment_missing': return 'fileTransfer';
    }
    if (error.status === 409) return 'fileConflict';
    if (error.status === 401 || error.status === 403) return 'fileAccess';
    if (error.status === 503) return 'fileStorage';
  }
  return 'fileUnknown';
}
