export type MeetingStatus = 'scheduled' | 'in_progress' | 'pending_follow_up' | 'completed' | 'overdue';
export type MeetingType = 'weekly' | 'comite_rh' | 'seguimiento_comercial' | 'direccion' | 'daily' | 'retrospectiva' | 'otro';
export type AgreementStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
export type AgreementPriority = 'low' | 'medium' | 'high' | 'critical';
export type ActivityType = 'note' | 'comment' | 'status_change' | 'file_upload' | 'agreement_created' | 'agreement_completed' | 'agreement_updated' | 'meeting_created' | 'meeting_updated' | 'follow_up';

export interface Participant {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
}

export interface Meeting {
  id: string;
  title: string;
  company: string;
  type: MeetingType;
  date: Date;
  participants: Participant[];
  responsible: string;
  status: MeetingStatus;
  description?: string;
  location?: string;
  agreementsCount: number;
  pendingAgreements: number;
  completionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agreement {
  id: string;
  meetingId: string;
  meetingTitle?: string;
  description: string;
  responsible: string;
  responsibleName: string;
  dueDate: Date;
  priority: AgreementPriority;
  status: AgreementStatus;
  progress: number;
  area?: string;
  tags?: string[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
}

export interface Activity {
  id: string;
  type: ActivityType;
  meetingId: string;
  agreementId?: string;
  title: string;
  description: string;
  timestamp: Date;
  performedBy: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    oldStatus?: string;
    newStatus?: string;
    [key: string]: any;
  };
}

export interface FollowUp {
  id: string;
  meetingId: string;
  meetingTitle: string;
  agreementId?: string;
  agreementDescription?: string;
  type: 'overdue_agreement' | 'no_progress' | 'no_comments' | 'no_responsible' | 'critical_pending' | 'meeting_no_follow_up';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  responsible?: string;
  daysOverdue?: number;
  description: string;
  createdAt: Date;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  type: MeetingType;
  description: string;
  agenda: string[];
  suggestedParticipants: string[];
  typicalAgreements: string[];
  duration?: number;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  createdAt: Date;
  usageCount: number;
}

export interface MeetingStats {
  activeMeetings: number;
  pendingAgreements: number;
  overdueAgreements: number;
  weeklyCompliance: number;
  saturatedResponsibles: number;
}

export interface ComplianceMetrics {
  totalAgreements: number;
  completedAgreements: number;
  overdueAgreements: number;
  complianceRate: number;
  effectiveMeetings: number;
  averageCompletionTime: number;
  topResponsibles: {
    name: string;
    completed: number;
    pending: number;
    overdue: number;
  }[];
  areaMetrics: {
    area: string;
    completed: number;
    pending: number;
    overdue: number;
    complianceRate: number;
  }[];
}

export interface Insight {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  icon: string;
  message: string;
  actionable: boolean;
  action?: string;
  actionUrl?: string;
}
