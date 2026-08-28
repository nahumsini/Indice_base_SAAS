export type SystemTicketType = 'FAILURE' | 'IMPROVEMENT';
export type SystemTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SystemTicketStatus = 'OPEN' | 'IN_REVIEW' | 'WAITING_ON_REPORTER' | 'PLANNED' | 'RESOLVED' | 'CLOSED';
export type SystemTicketStatusFilter = 'ALL' | 'ACTIVE' | SystemTicketStatus;

export interface SystemTicket {
  id: number;
  folio: string;
  distributor_company_id: number;
  distributor_name: string;
  reported_by_user_id: number;
  reporter_name: string;
  reporter_email: string;
  assigned_to_user_id: number | null;
  assignee_name: string | null;
  assignee_email: string | null;
  type: SystemTicketType;
  priority: SystemTicketPriority;
  module: string | null;
  title: string;
  description: string;
  status: SystemTicketStatus;
  root_response: string | null;
  first_responded_at: string | null;
  target_resolution_at: string | null;
  reopened_count: number;
  overdue: boolean;
  minutes_to_target: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemTicketWorkspaceData {
  summary: {
    total: number;
    active: number;
    in_review: number;
    planned: number;
    completed: number;
    unassigned: number;
    critical: number;
    overdue: number;
    waiting_on_reporter: number;
    resolved_today: number;
    average_first_response_minutes: number | null;
    average_resolution_minutes: number | null;
    sla_compliance_percent: number | null;
    reopened: number;
  };
  tickets: SystemTicket[];
  matching_tickets: number;
  assignees: SystemTicketAssignee[];
  modules: string[];
  distributors: SystemTicketFilterOption[];
}

export interface SystemTicketAssignee {
  user_id: number;
  name: string;
  email: string;
}

export interface SystemTicketFilterOption {
  value: string;
  label: string;
}

export interface SystemTicketEvent {
  id: number;
  event_type: 'CREATED' | 'ROOT_UPDATED' | 'ASSIGNED' | 'PUBLIC_MESSAGE' | 'INTERNAL_NOTE' | 'ATTACHMENT_ADDED' | 'REOPENED';
  visibility: 'PUBLIC' | 'INTERNAL';
  actor_name: string;
  actor_email: string;
  previous_status: SystemTicketStatus | null;
  new_status: SystemTicketStatus | null;
  note: string | null;
  created_at: string;
}

export interface SystemTicketAttachment {
  id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  download_url: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface SystemTicketDetail {
  ticket: SystemTicket;
  events: SystemTicketEvent[];
  attachments: SystemTicketAttachment[];
}

export interface SystemTicketFilters {
  query: string;
  status: SystemTicketStatusFilter;
  type: 'ALL' | SystemTicketType;
  priority: 'ALL' | SystemTicketPriority;
  assignee: 'ALL' | 'UNASSIGNED' | string;
  module: string;
  distributor: string;
  overdue: boolean;
  from: string;
  to: string;
}

export interface SystemTicketCreatePayload {
  type: SystemTicketType;
  priority: SystemTicketPriority;
  module: string;
  title: string;
  description: string;
}

export interface SystemTicketUpdatePayload {
  status: SystemTicketStatus;
  priority: SystemTicketPriority;
  root_response: string;
  target_resolution_at: string | null;
}

export interface SystemTicketAttachmentPresign {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers: Record<string, string>;
}
