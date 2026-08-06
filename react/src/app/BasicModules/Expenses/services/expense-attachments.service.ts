import { apiClient, buildApiUrl } from '../../../lib/apiClient';

export type ExpenseAttachment = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  objectKey: string;
  uploadedByUserId?: string;
  uploadedByName?: string;
  paymentAmount?: number;
  paymentDate?: string;
  paymentAccountId?: string;
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
  paymentAmount?: number;
  payment_amount?: number;
  paymentDate?: string;
  payment_date?: string;
  paymentAccountId?: number | string;
  payment_account_id?: number | string;
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

export type AttachmentService = {
  list(ownerId: string): Promise<ExpenseAttachment[]>;
  upload(ownerId: string, file: File, context?: ExpenseAttachmentContext): Promise<ExpenseAttachment>;
  remove(ownerId: string, attachmentId: string): Promise<void>;
};

export type ExpenseAttachmentContext = {
  paymentAmount: number;
  paymentDate: string;
  paymentAccountId: string;
};

function createAttachmentService(basePath: (ownerId: string) => string): AttachmentService {
  return {
    async list(ownerId: string): Promise<ExpenseAttachment[]> {
      const response = await apiClient<ExpenseAttachmentListResponse>(basePath(ownerId));
      return response.items.map(toExpenseAttachment);
    },

    async upload(ownerId: string, file: File, context?: ExpenseAttachmentContext): Promise<ExpenseAttachment> {
      const presign = await apiClient<PresignUploadResponse>(`${basePath(ownerId)}/presign-upload`, {
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

      const uploadResponse = await fetch(resolveExpenseStorageUrl(uploadUrl), {
        method: 'PUT',
        body: file,
        headers: presign.uploadHeaders ?? presign.upload_headers ?? {},
      });
      if (!uploadResponse.ok) {
        throw new Error(uploadResponse.statusText || 'Attachment upload failed.');
      }

      const registered = await apiClient<ExpenseAttachmentApiDto>(basePath(ownerId), {
        method: 'POST',
        body: JSON.stringify({
          objectKey,
          originalFilename: file.name,
          mimeType: normalizeContentType(file),
          sizeBytes: file.size,
          paymentAmount: context?.paymentAmount,
          paymentDate: context?.paymentDate,
          paymentAccountId: context ? Number(context.paymentAccountId) : undefined,
        }),
      });
      return toExpenseAttachment(registered);
    },

    async remove(ownerId: string, attachmentId: string): Promise<void> {
      await apiClient(`${basePath(ownerId)}/${attachmentId}`, { method: 'DELETE' });
    },
  };
}

export const expenseAttachmentsService = createAttachmentService(
  expenseId => `/api/v1/finance/expenses/${expenseId}/attachments`,
);

export const budgetLineAttachmentsService = createAttachmentService(
  budgetLineId => `/api/v1/finance/budget-lines/${budgetLineId}/attachments`,
);

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
    paymentAmount: dto.paymentAmount ?? dto.payment_amount,
    paymentDate: dto.paymentDate ?? dto.payment_date,
    paymentAccountId: dto.paymentAccountId || dto.payment_account_id
      ? String(dto.paymentAccountId ?? dto.payment_account_id)
      : undefined,
    downloadUrl: resolveOptionalExpenseStorageUrl(dto.downloadUrl ?? dto.download_url),
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

function resolveOptionalExpenseStorageUrl(storageUrl?: string) {
  return storageUrl ? resolveExpenseStorageUrl(storageUrl) : undefined;
}

/**
 * Published environments expose MinIO through Nginx at /storage/. Some older
 * deployments still return a signed URL whose public host is localhost:8080.
 * A browser cannot use that host from an HTTPS page, so preserve the signed
 * path/query and route it through the current public origin instead.
 *
 * HTTP development keeps using the backend-provided URL unchanged.
 */
export function resolveExpenseStorageUrl(storageUrl: string) {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') {
    return buildApiUrl(storageUrl);
  }

  try {
    const parsedUrl = new URL(storageUrl, window.location.origin);
    const storageHosts = new Set(['localhost', '127.0.0.1', 'minio']);
    const isInternalStorageHost = storageHosts.has(parsedUrl.hostname) || parsedUrl.port === '9000';
    const isStorageProxyPath = parsedUrl.pathname.startsWith('/storage/');

    if (parsedUrl.origin === window.location.origin) {
      return parsedUrl.toString();
    }

    if (isInternalStorageHost && isStorageProxyPath) {
      return `${window.location.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (isInternalStorageHost) {
      return `${window.location.origin}/storage${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    if (parsedUrl.hostname === window.location.hostname && parsedUrl.protocol !== window.location.protocol) {
      return `${window.location.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    return parsedUrl.toString();
  } catch {
    return buildApiUrl(storageUrl);
  }
}
