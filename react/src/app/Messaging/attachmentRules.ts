export const attachmentTypes: Record<string,string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export const attachmentAccept = Object.keys(attachmentTypes).map(extension => `.${extension}`).join(',');
export type AttachmentIssue = 'count' | 'empty' | 'size' | 'format' | 'upload' | 'storage' | 'verification';
export class AttachmentError extends Error {
  constructor(public issue: AttachmentIssue, public fileName = '') { super(`attachment_${issue}`); }
}
export function attachmentType(file: Pick<File,'name'|'type'>) {
  const expected = attachmentTypes[file.name.split('.').pop()?.toLowerCase() ?? ''];
  return expected && (!file.type || file.type === 'application/octet-stream' || file.type === expected) ? expected : '';
}
export function attachmentIssue(files: File[], existing: number): AttachmentError | null {
  if (files.length + existing > 5) return new AttachmentError('count');
  for (const file of files) {
    if (!file.size) return new AttachmentError('empty', file.name);
    if (file.size > 8 * 1024 * 1024) return new AttachmentError('size', file.name);
    if (!attachmentType(file)) return new AttachmentError('format', file.name);
  }
  return null;
}
export function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
