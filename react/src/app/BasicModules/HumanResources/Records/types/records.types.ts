export type RecordType = 'incident' | 'warning' | 'recognition' | 'observation' | 'training';
export type RecordSeverity = 'low' | 'medium' | 'high';
export type RecordStatus = 'pending' | 'reviewed' | 'resolved';

export interface EmployeeRecord {
  id: string;
  recordNumber?: string;
  employee: {
    id: string;
    name: string;
    position: string;
    department: string;
  };
  unit: string;
  business: string;
  type: RecordType;
  severity?: RecordSeverity;
  status: RecordStatus;
  title: string;
  description: string;
  actionsTaken?: string;
  witnesses?: string[];
  reportedBy: {
    id: string;
    name: string;
  };
  eventDate: string;
  createdAt: string;
  updatedAt: string;
  attachments?: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

export interface RecordEmployeeOption {
  id: string;
  name: string;
  position: string;
  department: string;
}

export interface CreateRecordData {
  employeeId: string;
  status: RecordStatus;
  type: RecordType;
  severity?: RecordSeverity;
  title: string;
  description: string;
  actionsTaken?: string;
  witnesses?: string[];
  eventDate: string;
  attachments?: File[];
}

export interface RecordFiltersState {
  search: string;
  unit: string;
  business: string;
  status: 'all' | RecordStatus;
  type: 'all' | RecordType;
  severity: 'all' | RecordSeverity;
  dateFrom?: string;
  dateTo?: string;
}
