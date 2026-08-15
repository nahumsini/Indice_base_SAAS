export type SystemTicketType = 'FAILURE' | 'IMPROVEMENT';
export type SystemTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SystemTicketStatus = 'OPEN' | 'IN_REVIEW' | 'PLANNED' | 'RESOLVED' | 'CLOSED';
export type SystemTicketStatusFilter = 'ALL' | 'ACTIVE' | SystemTicketStatus;

export interface SystemTicket {
  id: number;
  folio: string;
  distributor_company_id: number;
  distributor_name: string;
  reported_by_user_id: number;
  reporter_name: string;
  reporter_email: string;
  type: SystemTicketType;
  priority: SystemTicketPriority;
  module: string | null;
  title: string;
  description: string;
  status: SystemTicketStatus;
  root_response: string | null;
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
  };
  tickets: SystemTicket[];
  matching_tickets: number;
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
}
