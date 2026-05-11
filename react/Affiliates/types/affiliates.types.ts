export type AffiliateStatus = 'active' | 'inactive' | 'pending' | 'suspended';
export type AffiliateCategory = 'member' | 'volunteer' | 'partner' | 'sponsor' | 'other';
export type CampaignChannel = 'whatsapp' | 'email' | 'sms' | 'broadcast';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'completed' | 'failed';
export type SurveyQuestionType = 'multiple_choice' | 'text' | 'rating' | 'yes_no' | 'scale' | 'single_choice';
export type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type ActivityType = 'message' | 'campaign' | 'survey' | 'ticket' | 'note' | 'interaction' | 'whatsapp_sent' | 'email_sent' | 'call' | 'tag_added';

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  status: AffiliateStatus;
  category: AffiliateCategory;
  city: string;
  state?: string;
  country?: string;
  affiliationDate: Date;
  lastInteraction?: Date;
  tags: string[];
  responsible?: string;
  avatar?: string;
  notes?: string;
  customFields?: Record<string, any>;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  segment: string;
  message: string;
  scheduledDate?: Date;
  sentDate?: Date;
  createdBy: string;
  createdAt: Date;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    responded: number;
    failed: number;
  };
  targetCount: number;
}

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  question: string;
  options?: string[];
  required: boolean;
  order: number;
}

export interface Survey {
  id: string;
  name: string;
  description?: string;
  questions: SurveyQuestion[];
  status: 'draft' | 'active' | 'closed';
  createdBy: string;
  createdAt: Date;
  responses: number;
  targetAudience?: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  affiliateId: string;
  affiliateName: string;
  answers: Record<string, any>;
  submittedAt: Date;
}

export interface Kiosk {
  id: string;
  name: string;
  description?: string;
  location: string;
  status: 'active' | 'inactive';
  fields: string[];
  qrCode?: string;
  registrations: number;
  createdAt: Date;
  createdBy: string;
}

export interface Ticket {
  id: string;
  folio: string;
  affiliateId: string;
  affiliateName: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  responsible?: string;
  responses: TicketResponse[];
  attachments?: string[];
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  message: string;
  author: string;
  timestamp: Date;
  isInternal: boolean;
}

export interface Activity {
  id: string;
  type: ActivityType;
  affiliateId: string;
  title: string;
  description: string;
  timestamp: Date;
  performedBy: string;
  metadata?: Record<string, any>;
}

export interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  newThisMonth: number;
  activeCampaigns: number;
  surveysResponded: number;
  openTickets: number;
}

export interface AffiliateMetrics {
  totalAffiliates: number;
  activeAffiliates: number;
  monthlyGrowth: number;
  successfulCampaigns: number;
  responseRate: number;
  openTickets: number;
  engagement: number;
  surveysCompleted: number;
  activeCities: number;
  topCities: {
    city: string;
    count: number;
    growth: number;
  }[];
  categoryDistribution: {
    category: AffiliateCategory;
    count: number;
    percentage: number;
  }[];
}

export interface Insight {
  id: string;
  type: 'success' | 'warning' | 'critical' | 'info';
  icon: string;
  message: string;
  actionable: boolean;
  action?: string;
}
