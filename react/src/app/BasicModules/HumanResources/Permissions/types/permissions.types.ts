export type PermissionType =
  | 'vacation'
  | 'sick_leave'
  | 'personal'
  | 'maternity'
  | 'bereavement'
  | 'unpaid'
  | 'other';

export type PermissionStatus = 'pending' | 'approved' | 'rejected';

export interface PermissionItem {
  id: string;
  folio: string;
  employee: {
    name: string;
    avatar?: string;
    initials: string;
  };
  type: PermissionType;
  startDate: string;
  endDate: string;
  days: number;
  status: PermissionStatus;
  reason?: string;
  attachmentName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionFilterState {
  search: string;
  status: 'all' | PermissionStatus;
  type: 'all' | PermissionType;
  employee: 'all' | string;
}
