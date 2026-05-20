import type { AnnouncementAttachment, CreateAnnouncementPayload } from '../../../api/humanResources';

export type AnnouncementDisplayType = 'Celebracion' | 'General' | 'Recordatorio' | 'Urgente';
export type AnnouncementDisplayStatus = 'Borrador' | 'Programado' | 'Publicado';

export interface AnnouncementView {
  id: string;
  backendId: number;
  title: string;
  type: AnnouncementDisplayType;
  status: AnnouncementDisplayStatus;
  audienceType: CreateAnnouncementPayload['audience_type'];
  audienceSummary: string;
  publicationDate: string;
  publicationTime: string;
  authorName: string;
  content: string;
  preview: string;
  readSummary: string;
  attachments: AnnouncementAttachment[];
  attachmentCount: number;
  deliveryCount: number;
  readCount: number;
  isRead: boolean;
  readAt?: string | null;
  editData: CreateAnnouncementFormData;
}

export interface AnnouncementEmployeeOption {
  id: number;
  name: string;
  position: string;
  unit: number;
  unitName?: string;
  department?: string;
}

export interface AnnouncementDepartmentOption {
  name: string;
  activeUserCount: number;
  isAvailable: boolean;
}

export interface AnnouncementUnitOption {
  id: string;
  name: string;
  activeUserCount: number;
  isAvailable: boolean;
}

export interface CreateAnnouncementFormData {
  title: string;
  type: CreateAnnouncementPayload['type'];
  audienceType: CreateAnnouncementPayload['audience_type'];
  unitIds: string[];
  departmentNames: string[];
  employeeIds: number[];
  content: string;
  status: CreateAnnouncementPayload['status'];
  scheduledDate: string;
  scheduledTime: string;
}
