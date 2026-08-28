import { endpoints } from '../api/endpoints';
import { apiClient } from '../lib/apiClient';
import type {
  SystemTicket,
  SystemTicketAttachment,
  SystemTicketAttachmentPresign,
  SystemTicketCreatePayload,
  SystemTicketDetail,
  SystemTicketFilters,
  SystemTicketUpdatePayload,
  SystemTicketWorkspaceData,
} from './types';

export type SystemTicketPortal = 'distributor' | 'root';

const basePath = (portal: SystemTicketPortal) => (
  portal === 'root'
    ? endpoints.platformAdmin.systemTickets
    : endpoints.distributorPortal.systemTickets
);

const operationsPath = (portal: SystemTicketPortal) => (
  portal === 'root'
    ? '/api/v1/platform-admin/system-ticket-operations'
    : '/api/v1/distributor-portal/system-ticket-operations'
);

const uploadMimeType = (file: File) => {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ({
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
    pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as Record<string, string>)[extension ?? ''] ?? '';
};

export const systemTicketsApi = {
  list: (
    portal: SystemTicketPortal,
    filters: SystemTicketFilters,
  ) => {
    const params = new URLSearchParams({
      q: filters.query,
      status: filters.status,
      type: filters.type,
      priority: filters.priority,
      assignee: filters.assignee,
      module: filters.module,
      distributor: filters.distributor,
      overdue: String(filters.overdue),
    });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return apiClient<SystemTicketWorkspaceData>(`${operationsPath(portal)}?${params}`);
  },
  create: (portal: SystemTicketPortal, payload: SystemTicketCreatePayload) => apiClient<SystemTicket>(
    basePath(portal),
    { method: 'POST', body: JSON.stringify(payload) },
  ),
  detail: (portal: SystemTicketPortal, ticketId: number) => apiClient<SystemTicketDetail>(
    `${operationsPath(portal)}/${ticketId}`,
  ),
  update: (ticketId: number, payload: SystemTicketUpdatePayload) => apiClient<SystemTicket>(
    `${operationsPath('root')}/${ticketId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  ),
  assign: (ticketId: number, assignedToUserId: number | null) => apiClient<SystemTicket>(
    `${operationsPath('root')}/${ticketId}/assignment`,
    { method: 'PATCH', body: JSON.stringify({ assigned_to_user_id: assignedToUserId }) },
  ),
  take: (ticketId: number) => apiClient<SystemTicket>(
    `${operationsPath('root')}/${ticketId}/take`,
    { method: 'POST' },
  ),
  addMessage: (
    portal: SystemTicketPortal,
    ticketId: number,
    message: string,
    visibility: 'PUBLIC' | 'INTERNAL' = 'PUBLIC',
  ) => apiClient<SystemTicketDetail>(
    `${operationsPath(portal)}/${ticketId}/messages`,
    { method: 'POST', body: JSON.stringify({ message, visibility }) },
  ),
  presignAttachment: (
    portal: SystemTicketPortal,
    ticketId: number,
    file: File,
  ) => {
    const contentType = uploadMimeType(file);
    if (!contentType) return Promise.reject(new Error('El tipo de archivo no está permitido.'));
    return apiClient<SystemTicketAttachmentPresign>(
      `${operationsPath(portal)}/${ticketId}/attachments/presign-upload`,
      {
        method: 'POST',
        body: JSON.stringify({
          file_name: file.name,
          content_type: contentType,
          size_bytes: file.size,
        }),
      },
    );
  },
  uploadAttachment: async (
    uploadUrl: string,
    file: File,
    uploadHeaders: Record<string, string>,
  ) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': uploadMimeType(file), ...uploadHeaders },
      body: file,
    });
    if (!response.ok) throw new Error('No se pudo subir la evidencia.');
  },
  registerAttachment: (
    portal: SystemTicketPortal,
    ticketId: number,
    presign: SystemTicketAttachmentPresign,
    file: File,
  ) => apiClient<SystemTicketAttachment>(
    `${operationsPath(portal)}/${ticketId}/attachments`,
    {
      method: 'POST',
      body: JSON.stringify({
        object_key: presign.object_key,
        original_filename: file.name,
        mime_type: uploadMimeType(file),
        size_bytes: file.size,
      }),
    },
  ),
};
