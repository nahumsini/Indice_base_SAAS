import { apiClient, buildApiUrl } from '../../../lib/apiClient';
import {
  completeKioskIdempotentOperation,
  executeKioskMutationWithMismatchRecovery,
} from '../../../components/kiosk-engine/kioskIdempotency';

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
  businessId?: number | null;
  code: string;
  currencyCode: string;
  name: string;
  unitId?: number | null;
};

export type PayableKioskPublicProvider = {
  id: number;
  name: string;
};

export type PayableKioskPublicEmployee = {
  id: number;
  name: string;
};

export type PayableKioskBootstrap = {
  csrfToken?: string;
  inactivity_timeout_seconds?: number;
  kiosk: Omit<PayableKiosk, 'id' | 'pin' | 'publicAccessToken'>;
  identityType?: 'EMPLOYEE' | 'PROVIDER';
  employee?: PayableKioskPublicEmployee;
  provider?: PayableKioskPublicProvider;
  providers?: PayableKioskPublicProvider[];
  authorized?: boolean;
  expires_at?: string;
  identification_token?: string;
};

export type PayableKioskProviderAccess = {
  id: number;
  kioskId: number;
  kioskName: string;
  providerId: number;
  providerName: string;
  publicAccessToken: string;
  status: 'ACTIVE' | 'REVOKED';
  pin?: string;
};

export type PublicPayablePayload = {
  concept: string;
  currencyCode: string;
  description?: string;
  dueDate?: string;
  externalReference?: string;
  providerId?: number;
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

export type PayableKioskFaceStatus = {
  available: boolean;
  consentVersion: string;
  enrolled: boolean;
  enrolledAt?: string | null;
  enrollmentId?: string;
  requiredSteps: string[];
};

export type PayableKioskFaceCapture = {
  step: string;
  photo: { contentType: string; file: Blob };
};

export type PayableKioskBiometricPolicy = {
  enabled: boolean;
  environmentAvailable: boolean;
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
  biometricPolicy() {
    return apiClient<PayableKioskBiometricPolicy>(`${adminPath}/biometric-policy`);
  },

  updateBiometricPolicy(enabled: boolean) {
    return apiClient<PayableKioskBiometricPolicy>(`${adminPath}/biometric-policy`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  },

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

  async delete(kioskId: number): Promise<void> {
    await apiClient(`${adminPath}/${kioskId}`, { method: 'DELETE' });
  },

  async rotatePublicAccessToken(kioskId: number): Promise<PayableKiosk> {
    const response = await apiClient<{ kiosk: PayableKiosk }>(`${adminPath}/${kioskId}/rotate-public-access-token`, { method: 'POST' });
    return response.kiosk;
  },

  async setEnabled(kioskId: number, enabled: boolean): Promise<PayableKiosk> {
    const response = await apiClient<{ kiosk: PayableKiosk }>(`${adminPath}/${kioskId}/${enabled ? 'enable' : 'disable'}`, {
      method: 'POST',
      body: JSON.stringify({ reason: enabled ? 'Enabled from Expenses administration' : 'Disabled from Expenses administration' }),
    });
    return response.kiosk;
  },

  async listProviderAccesses(): Promise<PayableKioskProviderAccess[]> {
    const response = await apiClient<{ items: PayableKioskProviderAccess[] }>(`${adminPath}/provider-accesses`);
    return response.items;
  },

  async issueProviderAccess(kioskId: number, providerId: number): Promise<PayableKioskProviderAccess> {
    const response = await apiClient<{ access: PayableKioskProviderAccess }>(`${adminPath}/provider-accesses`, {
      method: 'POST',
      body: JSON.stringify({ kioskId, providerId }),
    });
    return response.access;
  },

  async rotateProviderPin(accessId: number): Promise<PayableKioskProviderAccess> {
    const response = await apiClient<{ access: PayableKioskProviderAccess }>(`${adminPath}/provider-accesses/${accessId}/rotate-pin`, { method: 'POST' });
    return response.access;
  },

  async revokeProviderAccess(accessId: number): Promise<void> {
    await apiClient(`${adminPath}/provider-accesses/${accessId}`, { method: 'DELETE' });
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
    return kioskMutation<{ providerId: number; status: string; message: string }>(
      `payables:${token}:provider-registration`, `${publicPath(token)}/provider-registrations`, payload);
  },

  createPayable(token: string, payload: PublicPayablePayload) {
    return kioskMutation<{ expenseId: number; status: string }>(
      `payables:${token}:submission`, `${publicPath(token)}/payables`, payload);
  },

  async uploadAttachment(token: string, expenseId: number, file: File) {
    const basePath = `${publicPath(token)}/payables/${expenseId}/attachments`;
    const contentType = normalizeContentType(file);
    const presignPayload = {
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    };
    const presign = await kioskMutation<PresignUploadResponse>(
      `payables:${token}:expense:${expenseId}:attachment:presign:${file.name}:${file.size}`,
      `${basePath}/presign-upload`,
      presignPayload,
    );
    const uploadUrl = presign.uploadUrl ?? presign.upload_url;
    const objectKey = presign.objectKey ?? presign.object_key;
    if (!uploadUrl || !objectKey) {
      throw new Error('Upload URL was not returned.');
    }

    const uploadHeaders = new Headers(presign.uploadHeaders ?? presign.upload_headers ?? {});
    if (!uploadHeaders.has('Content-Type')) uploadHeaders.set('Content-Type', contentType);
    const uploadResponse = await fetch(buildApiUrl(uploadUrl), {
      method: 'PUT',
      body: file,
      headers: uploadHeaders,
    });
    if (!uploadResponse.ok) {
      throw new Error(uploadResponse.statusText || 'Attachment upload failed.');
    }

    const registrationPayload = {
        objectKey,
        originalFilename: file.name,
        mimeType: contentType,
        sizeBytes: file.size,
    };
    return kioskMutation(
      `payables:${token}:expense:${expenseId}:attachment:${file.name}:${file.size}:${objectKey}`,
      basePath,
      registrationPayload,
    );
  },

  faceStatus(token: string) {
    return apiClient<PayableKioskFaceStatus>(`${publicPath(token)}/face`);
  },

  async enrollFace(token: string, captures: PayableKioskFaceCapture[]) {
    const enrollment = await kioskMutation<{ enrollmentId: string }>(
      `payables:${token}:face-enrollment-begin`,
      `${publicPath(token)}/face/enrollments`,
      { consent: true },
    );
    for (const capture of captures) {
      const capturePayload = { step: capture.step, contentType: capture.photo.contentType };
      const presigned = await kioskMutation<PresignUploadResponse>(
        `payables:${token}:face-enrollment:${enrollment.enrollmentId}:presign:${capture.step}`,
        `${publicPath(token)}/face/enrollments/${enrollment.enrollmentId}/captures/presign-upload`,
        capturePayload,
      );
      await uploadBiometricCapture(presigned, capture.photo.file, capture.photo.contentType);
    }
    return kioskMutation<{ enrollmentId: string; enrolled: boolean; status: string }>(
      `payables:${token}:face-enrollment:${enrollment.enrollmentId}:complete`,
      `${publicPath(token)}/face/enrollments/${enrollment.enrollmentId}/complete`,
      {},
    );
  },

  async verifyFace(token: string, captures: PayableKioskFaceCapture[]) {
    const verification = await kioskMutation<{ verificationId: string }>(
      `payables:${token}:face-verification-begin`,
      `${publicPath(token)}/face/verifications`,
      {},
    );
    for (const capture of captures) {
      const capturePayload = { step: capture.step, contentType: capture.photo.contentType };
      const presigned = await kioskMutation<PresignUploadResponse>(
        `payables:${token}:face-verification:${verification.verificationId}:presign:${capture.step}`,
        `${publicPath(token)}/face/verifications/${verification.verificationId}/captures/presign-upload`,
        capturePayload,
      );
      await uploadBiometricCapture(presigned, capture.photo.file, capture.photo.contentType);
    }
    return kioskMutation<{ livenessPassed: boolean; matched: boolean; status: string; verificationId: string }>(
      `payables:${token}:face-verification:${verification.verificationId}:complete`,
      `${publicPath(token)}/face/verifications/${verification.verificationId}/complete`,
      {},
    );
  },

  withdrawFaceConsent(token: string) {
    return kioskMutation<{ enrolled: boolean; success: boolean }>(
      `payables:${token}:face-consent-withdraw`,
      `${publicPath(token)}/face/consent/withdraw`,
      {},
    );
  },
};

async function uploadBiometricCapture(
  presigned: PresignUploadResponse,
  file: Blob,
  contentType: string,
) {
  const uploadUrl = presigned.uploadUrl ?? presigned.upload_url;
  if (!uploadUrl) throw new Error('Biometric upload URL was not returned.');
  const headers = new Headers(presigned.uploadHeaders ?? presigned.upload_headers ?? {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', contentType);
  const response = await fetch(uploadUrl, { method: 'PUT', headers, body: file });
  if (!response.ok) throw new Error(response.statusText || 'Biometric capture upload failed.');
}

async function kioskMutation<T>(operation: string, path: string, payload: unknown) {
  const response = await executeKioskMutationWithMismatchRecovery({
    operation,
    payload,
    request: (idempotencyKey) => apiClient<T>(path, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    }),
  });
  completeKioskIdempotentOperation(operation);
  return response;
}

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
