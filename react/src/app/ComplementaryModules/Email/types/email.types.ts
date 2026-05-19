export type EmailStatus = 'no_leido' | 'leido' | 'seguimiento' | 'urgente' | 'archivado';
export type EmailPriority = 'normal' | 'importante' | 'urgente';
export type EmailCategory = 'cliente' | 'ventas' | 'soporte' | 'tickets' | 'facturacion' | 'general';
export type FollowUpStatus = 'pendiente' | 'seguimiento' | 'esperando_respuesta' | 'completado';
export type TemplateCategory = 'ventas' | 'soporte' | 'cobranza' | 'bienvenida' | 'seguimiento' | 'cotizaciones';
export type IntegrationStatus = 'conectado' | 'desconectado' | 'sincronizando' | 'error';
export type IntegrationType = 'gmail' | 'outlook' | 'microsoft365' | 'smtp';

export interface EmailThread {
  id: string;
  threadId: string;
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  recipients: string[];
  cc?: string[];
  subject: string;
  preview: string;
  body: string;
  status: EmailStatus;
  priority: EmailPriority;
  category: EmailCategory;
  labels: string[];
  hasAttachments: boolean;
  attachments: Attachment[];
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  replies: EmailReply[];
  // Contexto operativo (el diferenciador)
  relatedClient?: RelatedClient;
  relatedTickets?: RelatedTicket[];
  relatedSales?: RelatedSale[];
  relatedContracts?: RelatedContract[];
  relatedInvoices?: RelatedInvoice[];
  relatedProjects?: RelatedProject[];
}

export interface EmailReply {
  id: string;
  sender: {
    name: string;
    email: string;
  };
  body: string;
  sentAt: Date;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface FollowUpEmail {
  id: string;
  emailId: string;
  subject: string;
  sender: string;
  assignedTo?: string;
  priority: EmailPriority;
  dueDate?: Date;
  status: FollowUpStatus;
  reminder?: Date;
  notes?: string;
  createdAt: Date;
}

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string;
  variables: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  email: string;
  status: IntegrationStatus;
  lastSync?: Date;
  emailsReceived: number;
  emailsSent: number;
  connectedAt: Date;
  errorMessage?: string;
}

export interface EmailMetrics {
  receivedToday: number;
  sentToday: number;
  pendingCount: number;
  averageResponseTime: number;
  overdueFollowUps: number;
  responseRate: number;
  unreadCount: number;
  mostActiveUser: string;
}

// Contexto Operativo
export interface RelatedClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  totalSales: number;
  openTickets: number;
  lastInteraction: Date;
}

export interface RelatedTicket {
  id: string;
  folio: string;
  title: string;
  status: string;
  priority: string;
  createdAt: Date;
}

export interface RelatedSale {
  id: string;
  folio: string;
  amount: number;
  status: string;
  date: Date;
}

export interface RelatedContract {
  id: string;
  folio: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
}

export interface RelatedInvoice {
  id: string;
  folio: string;
  amount: number;
  status: string;
  dueDate: Date;
}

export interface RelatedProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  deadline: Date;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  count: number;
  color?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  icon: string;
  message: string;
  actionable: boolean;
  action?: string;
  emailId?: string;
}
