export type PermissionType =
  | 'vacation'
  | 'sick_leave'
  | 'personal'
  | 'maternity'
  | 'bereavement'
  | 'unpaid'
  | 'other';

export type PermissionStatus = 'pending' | 'approved' | 'rejected';

export type PermissionPayrollTreatment = 'paid' | 'unpaid';

export interface PermissionItem {
  id: string;
  folio: string;
  employee: {
    id?: string;
    name: string;
    avatar?: string;
    initials: string;
    position?: string;
    department?: string;
  };
  type: PermissionType;
  payrollTreatment: PermissionPayrollTreatment;
  startDate: string;
  endDate: string;
  days: number;
  halfDay?: boolean;
  status: PermissionStatus;
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
  attachments?: Array<{
    id: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number;
    downloadUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export interface PermissionFilterState {
  search: string;
  status: 'all' | PermissionStatus;
  type: 'all' | PermissionType;
  payrollTreatment: 'all' | PermissionPayrollTreatment;
  employee: 'all' | string;
}
