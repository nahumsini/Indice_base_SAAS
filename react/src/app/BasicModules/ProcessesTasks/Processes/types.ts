export type ProcessFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'specific-dates';

export type ProcessPriority = 'high' | 'medium' | 'low';
export type ProcessDistributionMode = 'individual' | 'shared';
export type ProcessActivationMode = 'recurring' | 'occasional';
export type ProcessOrganizationMode = 'parallel' | 'sequential' | 'staged';

export interface ProcessTaskTemplate {
  id?: number;
  position?: number;
  stage: number;
  title: string;
  description: string;
  notes: string;
  priority: ProcessPriority;
  unitId?: number | null;
  unitName?: string;
  businessId?: number | null;
  businessName?: string;
  scheduledOffsetDays: number;
  deadlineOffsetDays: number;
  evidenceRequired: boolean;
  assigneeUserCompanyIds: number[];
  assignees?: Array<{ userCompanyId: number; name: string }>;
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface ProcessRecurrenceConfig {
  weeklyDay: Weekday;
  biWeeklyDays: Weekday[];
  biWeeklyAnchorDate: string;
  monthlyDays: number[];
  specificDates: string[];
}

export interface ProcessRecord {
  id: number;
  companyId: number;
  folio: string;
  unitId?: number | null;
  unit: string;
  unitName?: string;
  businessId?: number | null;
  business: string;
  businessName?: string;
  title: string;
  description: string;
  taskTitleTemplate?: string;
  taskDescriptionTemplate?: string;
  taskNotesTemplate?: string;
  createdAt: string;
  frequency: ProcessFrequency;
  creatorUserCompanyId?: number | null;
  creatorUserId?: number | null;
  creator: string;
  responsibleUserCompanyId?: number | null;
  responsibleUserId?: number | null;
  responsible: string;
  priority: ProcessPriority;
  recurrence: ProcessRecurrenceConfig;
  startDate?: string | null;
  endDate?: string | null;
  graceDays?: number;
  generationWindowDays?: number;
  evidenceRequired?: boolean;
  distributionMode: ProcessDistributionMode;
  activationMode: ProcessActivationMode;
  organizationMode: ProcessOrganizationMode;
  includeWeekends: boolean;
  coordinatorUserCompanyId?: number | null;
  coordinatorUserId?: number | null;
  coordinator: string;
  currentVersion: number;
  definitionTaskCount: number;
  taskTemplates: ProcessTaskTemplate[];
  lastGeneratedForDate?: string | null;
  nextOccurrenceDate?: string | null;
  generatedUntilDate?: string | null;
  lastMaterializedAt?: string | null;
  isActive: boolean;
  taskCount: number;
  tasks: number;
  openTaskCount: number;
  openTasks: number;
  completedTaskCount: number;
  completedTasks: number;
  overdueTaskCount: number;
  overdueTasks: number;
  auditedTaskCount: number;
  auditedTasks: number;
  completionPercent: number;
  progress: number;
}

export type ProcessColumnId =
  | 'folio'
  | 'unit'
  | 'business'
  | 'title'
  | 'description'
  | 'template'
  | 'createdAt'
  | 'frequency'
  | 'nextOccurrence'
  | 'generatedUntil'
  | 'tasks'
  | 'creator'
  | 'responsible'
  | 'priority';

export interface ProcessColumnConfig {
  id: ProcessColumnId;
  label: string;
  visible: boolean;
  locked?: boolean;
  description?: string;
}

export interface ProcessFormState {
  unitId?: number | null;
  unit: string;
  businessId?: number | null;
  business: string;
  title: string;
  description: string;
  taskTitleTemplate: string;
  taskDescriptionTemplate: string;
  taskNotesTemplate: string;
  frequency: ProcessFrequency;
  responsibleUserCompanyId?: number | null;
  responsible: string;
  priority: ProcessPriority;
  recurrence: ProcessRecurrenceConfig;
  startDate: string;
  endDate: string;
  graceDays: string;
  generationWindowDays: string;
  evidenceRequired: boolean;
  distributionMode: ProcessDistributionMode;
  activationMode: ProcessActivationMode;
  organizationMode: ProcessOrganizationMode;
  includeWeekends: boolean;
  coordinatorUserCompanyId?: number | null;
  coordinator: string;
  taskTemplates: ProcessTaskTemplate[];
}

export interface ProcessUnitOption {
  id: number;
  name: string;
}

export interface ProcessBusinessOption {
  id: number;
  name: string;
  unitId?: number | null;
}

export interface ProcessCollaboratorOption {
  userCompanyId: number;
  userId?: number | null;
  name: string;
  email?: string | null;
  unitId?: number | null;
  unitName?: string | null;
  businessId?: number | null;
  businessName?: string | null;
}

export interface Option<T extends string> {
  value: T;
  label: string;
}

export type ProcessSortDirection = 'asc' | 'desc';

export interface ProcessSortState {
  columnId: ProcessColumnId;
  direction: ProcessSortDirection;
}
