export type ProcessFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'specific-dates';

export type ProcessPriority = 'high' | 'medium' | 'low';

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
  folio: string;
  unit: string;
  business: string;
  title: string;
  description: string;
  createdAt: string;
  frequency: ProcessFrequency;
  creator: string;
  responsible: string;
  priority: ProcessPriority;
  recurrence: ProcessRecurrenceConfig;
  isActive: boolean;
}

export type ProcessColumnId =
  | 'folio'
  | 'unit'
  | 'business'
  | 'title'
  | 'description'
  | 'createdAt'
  | 'frequency'
  | 'creator'
  | 'responsible'
  | 'priority';

export interface ProcessColumnConfig {
  id: ProcessColumnId;
  label: string;
  visible: boolean;
  locked?: boolean;
}

export interface ProcessFormState {
  unit: string;
  business: string;
  title: string;
  description: string;
  frequency: ProcessFrequency;
  responsible: string;
  priority: ProcessPriority;
  recurrence: ProcessRecurrenceConfig;
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
