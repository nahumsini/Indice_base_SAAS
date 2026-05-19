export type FormStatus = 'borrador' | 'activo' | 'pausado' | 'archivado';
export type FormType = 'encuesta' | 'checklist' | 'inspeccion' | 'auditoria' | 'onboarding' | 'evaluacion' | 'incidencia' | 'publico' | 'kiosco';
export type FieldType = 'texto' | 'opcion_multiple' | 'dropdown' | 'fecha' | 'rating' | 'firma' | 'foto' | 'gps' | 'qr' | 'archivo' | 'checklist' | 'numero' | 'email' | 'telefono';
export type ResponseStatus = 'completada' | 'en_proceso' | 'abandonada';
export type AutomationType = 'crear_ticket' | 'asignar_tarea' | 'enviar_email' | 'whatsapp' | 'alerta' | 'aprobar' | 'escalar';
export type TriggerCondition = 'siempre' | 'si_respuesta' | 'si_score_bajo' | 'si_incidencia' | 'personalizado';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  conditional?: {
    showIf: string;
    condition: string;
    value: any;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface Form {
  id: string;
  folio: string;
  name: string;
  type: FormType;
  description?: string;
  status: FormStatus;
  sections: FormSection[];
  totalResponses: number;
  completedResponses: number;
  abandonedResponses: number;
  averageTime: number;
  participationRate: number;
  abandonmentRate: number;
  automations: number;
  isPublic: boolean;
  publicUrl?: string;
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastResponseAt?: Date;
}

export interface Response {
  id: string;
  formId: string;
  formName: string;
  status: ResponseStatus;
  respondent?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  answers: Record<string, any>;
  evidence: Evidence[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  startedAt: Date;
  completedAt?: Date;
  timeSpent?: number;
  device?: string;
  ipAddress?: string;
}

export interface Evidence {
  id: string;
  type: 'photo' | 'signature' | 'file' | 'gps' | 'qr';
  url?: string;
  data?: any;
  timestamp: Date;
  fieldId?: string;
}

export interface Automation {
  id: string;
  formId: string;
  formName: string;
  name: string;
  type: AutomationType;
  trigger: TriggerCondition;
  triggerValue?: any;
  action: {
    type: AutomationType;
    target?: string;
    message?: string;
    template?: string;
  };
  isActive: boolean;
  executionCount: number;
  lastExecuted?: Date;
  createdAt: Date;
}

export interface Template {
  id: string;
  name: string;
  category: FormType;
  description: string;
  icon: string;
  sections: FormSection[];
  usageCount: number;
  recommended?: boolean;
}

export interface Kiosk {
  id: string;
  name: string;
  formId: string;
  formName: string;
  location: string;
  deviceId: string;
  status: 'activo' | 'inactivo' | 'mantenimiento';
  responsesToday: number;
  totalResponses: number;
  lastResponse?: Date;
  createdAt: Date;
}

export interface FormsMetrics {
  totalForms: number;
  activeForms: number;
  totalResponses: number;
  responsesToday: number;
  averageParticipation: number;
  averageAbandonment: number;
  automationsTriggered: number;
  publicForms: number;
  kioskResponses: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  icon: string;
  message: string;
  actionable: boolean;
  action?: string;
  formId?: string;
  aiGenerated?: boolean;
}

export interface AnalyticsData {
  formId: string;
  formName: string;
  responses: number;
  completion: number;
  abandonment: number;
  avgTime: number;
  trend: 'up' | 'down' | 'stable';
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  riskDetected?: boolean;
  incidentsGenerated?: number;
}
