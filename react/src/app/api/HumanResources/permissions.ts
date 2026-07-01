import { apiClient } from '../../lib/apiClient';
import { endpoints } from '../endpoints';

export type BackendPermissionType =
  | 'vacation'
  | 'sick_leave'
  | 'personal'
  | 'maternity'
  | 'bereavement'
  | 'unpaid'
  | 'other';

export type BackendPermissionStatus = 'pending' | 'approved' | 'rejected';

export type BackendPermissionPayrollTreatment = 'paid' | 'unpaid';

export interface BackendPermissionAttachment {
  id: number;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedByUserId?: number;
  createdAt?: string;
  updatedAt?: string;
  downloadUrl?: string | null;
}

export interface BackendPermissionItem {
  id: number;
  folio: string;
  employee: {
    id?: number;
    name: string;
    avatar?: string;
    initials?: string;
    position?: string;
    department?: string;
  };
  type: BackendPermissionType;
  payrollTreatment?: BackendPermissionPayrollTreatment;
  startDate: string;
  endDate: string;
  days: number;
  halfDay?: boolean;
  status: BackendPermissionStatus;
  reason?: string;
  attachmentName?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: {
    id?: number | null;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
  attachments?: BackendPermissionAttachment[];
}

export interface PermissionsSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface PermissionsListResponse {
  items: BackendPermissionItem[];
  count: number;
  total_count: number;
  summary: PermissionsSummary;
}

export interface PermissionDetailsResponse {
  permissionId: number;
  permission: BackendPermissionItem;
}

export interface DeletePermissionResponse {
  deleted: boolean;
  permissionId: number;
}

export interface CreatePermissionPayload {
  type: BackendPermissionType;
  payrollTreatment?: BackendPermissionPayrollTreatment;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  reason: string;
}

export interface PermissionAttachmentPresignPayload {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface PermissionAttachmentPresignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers: Record<string, string>;
}

export interface RegisterPermissionAttachmentPayload {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
}

export interface ReviewPermissionPayload {
  reviewNotes?: string;
}

const permissionsBase = endpoints.humanResources.permissionsList;
const permissionsMeBase = endpoints.humanResources.permissionsMeList;

export const permissionsApi = {
  listPermissions(filters: Record<string, string | number | undefined> = {}) {
    return apiClient<PermissionsListResponse>(`${permissionsBase}${toQueryString(filters)}`);
  },

  getPermission(permissionId: string | number) {
    return apiClient<PermissionDetailsResponse>(`${endpoints.humanResources.permissionsDetails}/${permissionId}`);
  },

  approvePermission(permissionId: string | number, payload: ReviewPermissionPayload = {}) {
    return apiClient<PermissionDetailsResponse>(`${endpoints.humanResources.permissionsApprove}/${permissionId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  rejectPermission(permissionId: string | number, payload: ReviewPermissionPayload = {}) {
    return apiClient<PermissionDetailsResponse>(`${endpoints.humanResources.permissionsReject}/${permissionId}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listMyPermissions(filters: Record<string, string | number | undefined> = {}) {
    return apiClient<PermissionsListResponse>(`${permissionsMeBase}${toQueryString(filters)}`);
  },

  getMyPermission(permissionId: string | number) {
    return apiClient<PermissionDetailsResponse>(`${endpoints.humanResources.permissionsMeDetails}/${permissionId}`);
  },

  createMyPermission(payload: CreatePermissionPayload) {
    return apiClient<PermissionDetailsResponse>(endpoints.humanResources.permissionsMeCreate, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteMyPermission(permissionId: string | number) {
    return apiClient<DeletePermissionResponse>(`${endpoints.humanResources.permissionsMeDelete}/${permissionId}`, {
      method: 'DELETE',
    });
  },

  presignMyPermissionAttachmentUpload(
    permissionId: string | number,
    payload: PermissionAttachmentPresignPayload,
  ) {
    return apiClient<PermissionAttachmentPresignResponse>(
      `${endpoints.humanResources.permissionsMeAttachments}/${permissionId}/attachments/presign-upload`,
      {
        method: 'POST',
        body: JSON.stringify({
          file_name: payload.fileName,
          content_type: payload.contentType,
          size_bytes: payload.sizeBytes,
        }),
      },
    );
  },

  async uploadMyPermissionAttachment(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('Permission attachment upload failed.');
    }
  },

  registerMyPermissionAttachment(
    permissionId: string | number,
    payload: RegisterPermissionAttachmentPayload,
  ) {
    return apiClient<PermissionDetailsResponse>(
      `${endpoints.humanResources.permissionsMeAttachments}/${permissionId}/attachments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};

const toQueryString = (filters: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};
