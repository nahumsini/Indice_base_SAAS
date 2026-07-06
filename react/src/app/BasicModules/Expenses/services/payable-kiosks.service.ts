import { apiClient, buildApiUrl } from '../../../lib/apiClient';

const adminPath = '/api/v1/finance/payable-kiosks';
const publicPath = (token: string) => `/api/v1/finance/public-payable-kiosks/${token}`;

export type PayableKioskAccessType = 'MIXED' | 'PROVIDER' | 'EMPLOYEE' | 'PROVIDER_REGISTRATION';

export type PayableKiosk = {
  accessType: PayableKioskAccessType;
  allowProviderRegistration: boolean;
  businessId?: number | null;
  code: string;
  currencyCode: string;
  id: number;
  name: string;
  pin?: string;
  providerId?: number | null;
  publicAccessToken: string;
  status: 'ACTIVE' | 'INACTIVE';
  unitId?: number | null;
};

export type PayableKioskPayload = {
  accessType: PayableKioskAccessType;
  allowProviderRegistration: boolean;
  businessId?: number | null;
  code: string;
  currencyCode: string;
  name: string;
  providerId?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  unitId?: number | null;
};

export type PayableKioskPublicProvider = {
  id: number;
  name: string;
};

export type PayableKioskBootstrap = {
  csrfToken?: string;
  kiosk: Omit<PayableKiosk, 'id' | 'pin' | 'publicAccessToken'>;
  providers: PayableKioskPublicProvider[];
};

export type PublicPayablePayload = {
  concept: string;
  currencyCode: string;
  description?: string;
  dueDate?: string;
  externalReference?: string;
  providerId?: number | null;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type PublicProviderRegistrationPayload = {
  contactName?: string;
  email?: string;
  legalName?: string;
  name: string;
  notes?: string;
  phone?: string;
  taxId?: string;
};

type PresignUploadResponse = {
  objectKey?: string;
  object_key?: string;
  uploadUrl?: string;
  upload_url?: string;
  uploadHeaders?: Record<string, string>;
  upload_headers?: Record<string, string>;
};

export const payableKiosksService = {
  async list(): Promise<PayableKiosk[]> {
    const response = await apiClient<{ items: PayableKiosk[] }>(adminPath);
    return response.items;
  },

  async create(payload: PayableKioskPayload): Promise<PayableKiosk> {
    const response = await apiClient<{ kiosk: PayableKiosk }>(adminPath, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.kiosk;
  },

  async update(kioskId: number, payload: PayableKioskPayload): Promise<PayableKiosk> {
    const response = await apiClient<{ kiosk: PayableKiosk }>(`${adminPath}/${kioskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.kiosk;
  },

  async rotatePin(kioskId: number): Promise<PayableKiosk> {
    const response = await apiClient<{ kiosk: PayableKiosk }>(`${adminPath}/${kioskId}/rotate-pin`, { method: 'POST' });
    return response.kiosk;
  },

  async delete(kioskId: number): Promise<void> {
    await apiClient(`${adminPath}/${kioskId}`, { method: 'DELETE' });
  },
};

export const publicPayableKioskService = {
  bootstrap(token: string) {
    return apiClient<PayableKioskBootstrap>(`${publicPath(token)}/bootstrap`);
  },

  authenticate(token: string, pin: string) {
    return apiClient<PayableKioskBootstrap & { authorized: boolean }>(`${publicPath(token)}/authenticate`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  registerProvider(token: string, payload: PublicProviderRegistrationPayload) {
    return apiClient<{ providerId: number; status: string; message: string }>(`${publicPath(token)}/provider-registrations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createPayable(token: string, payload: PublicPayablePayload) {
    return apiClient<{ expenseId: number; status: string }>(`${publicPath(token)}/payables`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async uploadAttachment(token: string, expenseId: number, file: File) {
    const basePath = `${publicPath(token)}/payables/${expenseId}/attachments`;
    const contentType = normalizeContentType(file);
    const presign = await apiClient<PresignUploadResponse>(`${basePath}/presign-upload`, {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        contentType,
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

    return apiClient(`${basePath}`, {
      method: 'POST',
      body: JSON.stringify({
        objectKey,
        originalFilename: file.name,
        mimeType: contentType,
        sizeBytes: file.size,
      }),
    });
  },
};

function normalizeContentType(file: File) {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.doc')) return 'application/msword';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}
