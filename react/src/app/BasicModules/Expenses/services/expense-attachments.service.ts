import { apiClient, buildApiUrl } from '../../../lib/apiClient';

export type ExpenseAttachment = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  uploadedByUserId?: string;
  uploadedByName?: string;
  downloadUrl?: string;
  createdAt?: string;
};

type ExpenseAttachmentApiDto = {
  id: number | string;
  originalFilename?: string;
  original_filename?: string;
  mimeType?: string;
  mime_type?: string;
  sizeBytes?: number;
  size_bytes?: number;
  objectKey?: string;
  object_key?: string;
  uploadedByUserId?: number | string;
  uploaded_by_user_id?: number | string;
  uploadedByName?: string;
  uploaded_by_name?: string;
  downloadUrl?: string;
  download_url?: string;
  createdAt?: string;
  created_at?: string;
};

type ExpenseAttachmentListResponse = {
  items: ExpenseAttachmentApiDto[];
  count: number;
};

type PresignUploadResponse = {
  objectKey?: string;
  object_key?: string;
  uploadUrl?: string;
  upload_url?: string;
  uploadHeaders?: Record<string, string>;
  upload_headers?: Record<string, string>;
};

const basePath = (expenseId: string) => `/api/v1/finance/expenses/${expenseId}/attachments`;

export const expenseAttachmentsService = {
  async list(expenseId: string): Promise<ExpenseAttachment[]> {
    const response = await apiClient<ExpenseAttachmentListResponse>(basePath(expenseId));
    return response.items.map(toExpenseAttachment);
  },

  async upload(expenseId: string, file: File): Promise<ExpenseAttachment> {
    const presign = await apiClient<PresignUploadResponse>(`${basePath(expenseId)}/presign-upload`, {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        contentType: normalizeContentType(file),
        sizeBytes: file.size,
      }),
    });
    const uploadUrl = presign.uploadUrl ?? presign.upload_url;
    const objectKey = presign.objectKey ?? presign.object_key;
    if (!uploadUrl || !objectKey) {
      throw new Error('Upload URL was not returned.');
    }

    const uploadResponse = await fetch(buildApiUrl(uploadUrl), {
      method: 'PUT',
      body: file,
      headers: presign.uploadHeaders ?? presign.upload_headers ?? {},
    });
    if (!uploadResponse.ok) {
      throw new Error(uploadResponse.statusText || 'Attachment upload failed.');
    }

    const registered = await apiClient<ExpenseAttachmentApiDto>(basePath(expenseId), {
      method: 'POST',
      body: JSON.stringify({
        objectKey,
        originalFilename: file.name,
        mimeType: normalizeContentType(file),
        sizeBytes: file.size,
      }),
    });
    return toExpenseAttachment(registered);
  },

  async remove(expenseId: string, attachmentId: string): Promise<void> {
    await apiClient(`${basePath(expenseId)}/${attachmentId}`, { method: 'DELETE' });
  },
};

function toExpenseAttachment(dto: ExpenseAttachmentApiDto): ExpenseAttachment {
  return {
    id: String(dto.id),
    originalFilename: dto.originalFilename ?? dto.original_filename ?? 'Attachment',
    mimeType: dto.mimeType ?? dto.mime_type ?? 'application/octet-stream',
    sizeBytes: Number(dto.sizeBytes ?? dto.size_bytes ?? 0),
    objectKey: dto.objectKey ?? dto.object_key ?? '',
    uploadedByUserId: dto.uploadedByUserId || dto.uploaded_by_user_id
      ? String(dto.uploadedByUserId ?? dto.uploaded_by_user_id)
      : undefined,
    uploadedByName: dto.uploadedByName ?? dto.uploaded_by_name,
    downloadUrl: dto.downloadUrl ?? dto.download_url,
    createdAt: dto.createdAt ?? dto.created_at,
  };
}

function normalizeContentType(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}
