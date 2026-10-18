import { apiClient } from '../../../../lib/apiClient';
import { resolveSalesStorageUrl } from '../../utils/salesStorageUrls';
import type { InventoryMovementAttachment } from '../types/inventoryTypes';
export const movementFileAccept = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';
export const movementFileLimit = 10 * 1024 * 1024;
const mimeByExtension: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export function movementFileType(file: File) { return mimeByExtension[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? ''; }
export function validMovementFile(file: File) { const mime = movementFileType(file); return Boolean(mime) && (!file.type || file.type === mime) && file.size > 0 && file.size <= movementFileLimit; }
type UploadTicket = { objectKey: string; uploadUrl: string; uploadHeaders?: Record<string, string> };
export type MovementFileUploadState = { ticket?: UploadTicket; uploaded?: boolean };
const base = (id: string) => `/api/v1/sales/inventory-movements/${encodeURIComponent(id)}/attachments`;
export const inventoryMovementFiles = {
  list: (id: string) => apiClient<InventoryMovementAttachment[]>(base(id)),
  async upload(id: string, file: File, state: MovementFileUploadState = {}) {
    if (!validMovementFile(file)) throw new Error('PDF, JPG, PNG, WebP · 10 MB');
    const request = { fileName: file.name, contentType: movementFileType(file), sizeBytes: file.size };
    state.ticket ??= await apiClient<UploadTicket>(`${base(id)}/presign-upload`, { method: 'POST', body: JSON.stringify(request) });
    if (!state.uploaded) {
      const response = await fetch(resolveSalesStorageUrl(state.ticket.uploadUrl), { method: 'PUT', headers: state.ticket.uploadHeaders ?? { 'Content-Type': request.contentType }, body: file });
      if (!response.ok) { if (response.status === 403) state.ticket = undefined; throw new Error('No se pudo cargar el archivo. Intenta nuevamente.'); }
      state.uploaded = true;
    }
    return apiClient<InventoryMovementAttachment>(base(id), { method: 'POST', body: JSON.stringify({ ...request, objectKey: state.ticket.objectKey }) });
  },
  async download(id: string, fileId: string) {
    const result = await apiClient<{ url: string }>(`${base(id)}/${encodeURIComponent(fileId)}/download`);
    return resolveSalesStorageUrl(result.url);
  },
};

/** Only intentional API failures are exposed; network/runtime details use the product message. */
export function movementFileError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
    const status = Number(error.status);
    if (((status >= 400 && status < 500) || status === 503) && typeof error.message === 'string' && error.message.trim()) return error.message.slice(0, 400);
  }
  return fallback;
}
