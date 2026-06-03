import type {
  AttendanceControlLocation,
  AttendanceControlTemplate,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';

export interface HorarioDiaDraft {
  dayOfWeek: number;
  dia: string;
  entrada: string;
  salida: string;
  comida: number;
  descanso: number;
  isRestDay: boolean;
}

export type ScheduleMode = 'strict' | 'open';
export type ScheduleLocationRule = 'business' | 'temporary' | 'open';
export type ScheduleBuilderStep = 'setup' | 'workdays' | 'rules' | 'review';

export interface OperationalScheduleSummary {
  compact: string;
  reviewItems: Array<{
    label: string;
    value: string;
  }>;
}

export interface ScheduleAppliedResult {
  employeeIds: number[];
  templateId: number;
  templateName: string;
}

export interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: AttendanceControlTemplate[];
  locations: AttendanceControlLocation[];
  selectedTemplateId?: number | null;
  effectiveStartDate?: string;
  onApplied?: (result: ScheduleAppliedResult) => Promise<void> | void;
}

export type ScheduleCopy = ControlTranslations['schedule'];
export type WeekdayKey = keyof ScheduleCopy['workdays']['days'];
