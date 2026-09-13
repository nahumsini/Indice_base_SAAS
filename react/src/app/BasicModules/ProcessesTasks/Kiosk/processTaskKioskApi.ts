import { apiClient } from '../../../lib/apiClient';
import { uploadToPresignedStorage } from '../shared/storageUpload';
import {
  completeKioskIdempotentOperation,
  kioskIdempotencyKeyFor,
} from './kioskIdempotency';

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
  engine_status: 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'REVOKED' | 'DELETED';
  expires_at: string | null;
  public_access_token: string;
  issued_public_token?: string;
  public_token_hint: string;
  token_display_once: boolean;
  metadata: Record<string, unknown>;
  scope_label: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProcessTaskKioskPayload {
  name: string;
  code: string;
  status: 'active' | 'inactive';
  expires_at?: string | null;
  unit_id?: number | null;
  business_id?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ProcessTaskKioskGrant {
  id: number;
  identity_type: 'USER' | 'EMPLOYEE' | 'PROVIDER' | 'CUSTOMER' | 'EXTERNAL_VERIFIED' | 'PUBLIC';
  identity_id: number;
  capability_key: string;
  status: 'ACTIVE' | 'REVOKED';
  source: 'ADMIN' | 'AUTO_SCOPE' | 'INTERNAL_POLICY' | string;
  created_at: string;
}

export interface ProcessTaskKioskAuditEvent {
  event_id: string;
  request_id?: string;
  action_id?: string;
  session_id?: string;
  event_type: string;
  outcome: string;
  actor_type?: string;
  actor_id?: number;
  capability?: string;
  module_reference?: string;
  created_at: string;
}

interface KioskV2Envelope<T> {
  data: T;
  meta: { requestId: string };
}

export interface PublicTaskKioskBootstrapResponse {
  kiosk: {
    id: number;
    code: string;
    name: string;
    status: 'active' | 'inactive';
    expires_at: string | null;
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
  agenda_date?: string | null;
  agenda_start_time?: string | null;
  agenda_end_time?: string | null;
  agenda_time_zone?: string | null;
  completed_at: string | null;
  completion_percent: number;
  notes: string | null;
  assigned_user_company_id: number | null;
  assigned_name: string | null;
  unit_id: number | null;
  unit_name: string | null;
  business_id: number | null;
  business_name: string | null;
  process_id: number | null;
  process_title: string | null;
  process_run_id: number | null;
  process_run_folio: string | null;
  process_reference: string | null;
  process_run_status: string | null;
  process_step: number | null;
  process_stage: number | null;
  process_total_steps: number | null;
  evidence_required: boolean;
  project_id: number | null;
  project_name: string | null;
  created_by: number | null;
  created_by_name: string | null;
  completed_by_user_company_id: number | null;
  created_at: string | null;
  attachments: number;
  evidence_satisfied: boolean;
  is_overdue: boolean;
  can_complete: boolean;
  can_add_evidence: boolean;
  can_reschedule: boolean;
  current_assignment_role?: 'lead' | 'collaborator' | null;
  current_contribution_status?: 'pending' | 'working' | 'ready' | null;
  assignment_mode?: 'individual' | 'team' | null;
  team_size?: number;
  completion_action?: 'TASK_COMPLETE' | 'CONTRIBUTION_READY';
  is_assigned_to_current_user: boolean;
  is_created_by_current_user: boolean;
  is_completed_by_current_user: boolean;
}

export interface PublicTaskKioskCompleteResponse {
  action_outcome?: 'TASK_COMPLETED' | 'CONTRIBUTION_READY';
  current_contribution_status?: 'pending' | 'working' | 'ready' | null;
  task: PublicTaskKioskTask;
  items: PublicTaskKioskTask[];
}

export interface PublicTaskKioskAssignmentOption {
  default_unit_id: number | null;
  default_business_id: number | null;
  units: Array<{
    id: number;
    name: string;
  }>;
  businesses: Array<{
    id: number;
    name: string;
    unit_id: number | null;
    unit_name: string | null;
  }>;
  collaborators: Array<{
    user_company_id: number;
    user_id: number;
    full_name: string;
    position_title?: string;
    department?: string;
    unit_id: number | null;
    unit_name: string | null;
    business_id: number | null;
    business_name: string | null;
  }>;
}

export interface PublicTaskKioskCreateTaskPayload {
  identification_token: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high';
  startDate?: string | null;
  dueDate?: string | null;
  unitId?: number | null;
  businessId?: number | null;
  assignedUserCompanyId?: number | null;
  assignedName?: string | null;
  notes?: string | null;
}

export interface PublicTaskKioskAssignResponsiblePayload {
  identification_token: string;
  assignedUserCompanyId: number;
  assignedName?: string | null;
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
  assignment_options: PublicTaskKioskAssignmentOption;
}

const basePath = '/api/v1/process-tasks/kiosks';
const adminV2BasePath = '/api/v2/process-tasks/kiosks';
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

  transitionKiosk(kioskId: number, transition: 'disable' | 'enable' | 'revoke', reason?: string) {
    return apiClient<{ kiosk: ProcessTaskKiosk }>(`${basePath}/${kioskId}/${transition}`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? '' }),
    });
  },

  async listGrants(kioskId: number) {
    const response = await apiClient<KioskV2Envelope<{ items: ProcessTaskKioskGrant[] }>>(
      `${adminV2BasePath}/${kioskId}/grants`,
    );
    return response.data.items;
  },

  async grantEmployee(kioskId: number, identityId: number) {
    const response = await apiClient<KioskV2Envelope<ProcessTaskKioskGrant>>(
      `${adminV2BasePath}/${kioskId}/grants`,
      {
        method: 'POST',
        body: JSON.stringify({
          identity_type: 'EMPLOYEE',
          identity_id: identityId,
          capability_key: '*',
        }),
      },
    );
    return response.data;
  },

  async revokeGrant(kioskId: number, grantId: number) {
    await apiClient<KioskV2Envelope<{ revoked: boolean }>>(
      `${adminV2BasePath}/${kioskId}/grants/${grantId}`,
      { method: 'DELETE' },
    );
  },

  async listAudit(kioskId: number) {
    const response = await apiClient<KioskV2Envelope<{ items: ProcessTaskKioskAuditEvent[] }>>(
      `${adminV2BasePath}/${kioskId}/audit`,
    );
    return response.data.items;
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

  createPublicTask(
    deviceToken: string,
    payload: PublicTaskKioskCreateTaskPayload,
    idempotencyKey: string,
  ) {
    return apiClient<{ task: PublicTaskKioskTask; items: PublicTaskKioskTask[] }>(
      `${publicBasePath}/${deviceToken}/tasks/create`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      },
    );
  },

  assignPublicTaskResponsible(
    deviceToken: string,
    taskId: number,
    payload: PublicTaskKioskAssignResponsiblePayload,
    idempotencyKey: string,
    init: Pick<RequestInit, 'signal'> = {},
  ) {
    return apiClient<{ task: PublicTaskKioskTask; items: PublicTaskKioskTask[] }>(
      `${publicBasePath}/${deviceToken}/tasks/${taskId}/responsible`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
        signal: init.signal,
      },
    );
  },

  completePublicTask(
    deviceToken: string,
    taskId: number,
    payload: {
      identification_token: string;
      completion_notes?: string;
      completion_percent?: number;
    },
    idempotencyKey: string,
  ) {
    return apiClient<PublicTaskKioskCompleteResponse>(
      `${publicBasePath}/${deviceToken}/tasks/${taskId}/complete`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(payload),
      },
    );
  },

  async presignPublicTaskAttachmentUpload(
    deviceToken: string,
    taskId: number,
    payload: {
      identification_token: string;
      file_name: string;
      content_type: string;
      size_bytes: number;
    },
  ) {
    const operation = `process-tasks:${deviceToken}:task:${taskId}:attachment:presign:${payload.file_name}`;
    const result = await apiClient<{
      object_key: string;
      upload_url: string;
      expires_at: string;
      upload_headers?: Record<string, string>;
    }>(`${publicBasePath}/${deviceToken}/tasks/${taskId}/attachments/presign-upload`, {
      method: 'POST',
      headers: { 'Idempotency-Key': kioskIdempotencyKeyFor(operation, payload) },
      body: JSON.stringify(payload),
    });
    completeKioskIdempotentOperation(operation);
    return result;
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
      logical_file_id: string;
    },
    idempotencyKey: string,
  ) {
    return apiClient<Record<string, unknown>>(`${publicBasePath}/${deviceToken}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
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
  return uploadToPresignedStorage(uploadUrl, file, contentType, uploadHeaders);
}
