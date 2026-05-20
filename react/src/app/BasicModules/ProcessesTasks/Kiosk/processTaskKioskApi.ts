import { apiClient } from '../../../lib/apiClient';

export interface ProcessTaskKiosk {
  id: number;
  company_id: number;
  unit_id: number | null;
  unit_name: string;
  business_id: number | null;
  business_name: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  public_access_token: string;
  metadata: Record<string, unknown>;
  scope_label: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProcessTaskKioskPayload {
  name: string;
  code: string;
  status: 'active' | 'inactive';
  unit_id?: number | null;
  business_id?: number | null;
  metadata?: Record<string, unknown>;
}

export interface PublicTaskKioskBootstrapResponse {
  kiosk: {
    id: number;
    code: string;
    name: string;
    status: 'active' | 'inactive';
  };
  scope_label: string;
  auth_methods: Array<'pin'>;
  inactivity_timeout_seconds: number;
}

export interface PublicTaskKioskTask {
  id: number;
  task_id: number;
  task_type: 'task' | 'project-task' | 'process';
  folio: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'paused' | 'completed';
  priority: 'low' | 'medium' | 'high';
  start_date: string | null;
  due_date: string | null;
  completion_percent: number;
  notes: string | null;
  unit_id: number | null;
  unit_name: string | null;
  business_id: number | null;
  business_name: string | null;
  process_id: number | null;
  process_title: string | null;
  project_id: number | null;
  project_name: string | null;
  created_at: string | null;
  attachments: number;
  is_overdue: boolean;
}

export interface PublicTaskKioskIdentifyResponse {
  auth_method: 'pin';
  user: {
    id: number;
    user_id: number;
    user_code?: string;
    full_name: string;
    position_title?: string;
    department?: string;
  };
  identification_token: string;
  expires_at: string;
  tasks: PublicTaskKioskTask[];
}

const basePath = '/api/v1/process-tasks/kiosks';
const publicBasePath = '/api/v1/process-tasks/public-kiosk';

export const processTaskKioskApi = {
  listKiosks() {
    return apiClient<{ items: ProcessTaskKiosk[] }>(basePath);
  },

  createKiosk(payload: ProcessTaskKioskPayload) {
    return apiClient<{ kiosk: ProcessTaskKiosk }>(basePath, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateKiosk(kioskId: number, payload: ProcessTaskKioskPayload) {
    return apiClient<{ kiosk: ProcessTaskKiosk }>(`${basePath}/${kioskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteKiosk(kioskId: number) {
    return apiClient<{ success: boolean }>(`${basePath}/${kioskId}`, {
      method: 'DELETE',
    });
  },

  rotateToken(kioskId: number) {
    return apiClient<{ kiosk: ProcessTaskKiosk }>(`${basePath}/${kioskId}/rotate-public-access-token`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getPublicBootstrap(deviceToken: string) {
    return apiClient<PublicTaskKioskBootstrapResponse>(`${publicBasePath}/${deviceToken}/bootstrap`);
  },

  identifyPublicUser(deviceToken: string, pin: string) {
    return apiClient<PublicTaskKioskIdentifyResponse>(`${publicBasePath}/${deviceToken}/identify`, {
      method: 'POST',
      body: JSON.stringify({
        auth_method: 'pin',
        credential_payload: pin,
      }),
    });
  },

  listPublicTasks(deviceToken: string, identificationToken: string) {
    return apiClient<{ items: PublicTaskKioskTask[] }>(`${publicBasePath}/${deviceToken}/tasks`, {
      method: 'POST',
      body: JSON.stringify({
        identification_token: identificationToken,
      }),
    });
  },

  completePublicTask(
    deviceToken: string,
    taskId: number,
    payload: {
      identification_token: string;
      completion_notes?: string;
      completion_percent?: number;
    },
  ) {
    return apiClient<{ task: PublicTaskKioskTask; items: PublicTaskKioskTask[] }>(
      `${publicBasePath}/${deviceToken}/tasks/${taskId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  presignPublicTaskAttachmentUpload(
    deviceToken: string,
    taskId: number,
    payload: {
      identification_token: string;
      file_name: string;
      content_type: string;
      size_bytes: number;
    },
  ) {
    return apiClient<{
      object_key: string;
      upload_url: string;
      expires_at: string;
      upload_headers?: Record<string, string>;
    }>(`${publicBasePath}/${deviceToken}/tasks/${taskId}/attachments/presign-upload`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  registerPublicTaskAttachment(
    deviceToken: string,
    taskId: number,
    payload: {
      identification_token: string;
      object_key: string;
      original_filename: string;
      mime_type: string;
      size_bytes: number;
    },
  ) {
    return apiClient<Record<string, unknown>>(`${publicBasePath}/${deviceToken}/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export async function uploadPublicTaskAttachment(
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
    throw new Error('TASK_EVIDENCE_UPLOAD_FAILED');
  }
}
