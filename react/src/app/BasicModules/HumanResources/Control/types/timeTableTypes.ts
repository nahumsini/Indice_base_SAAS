import type { ReactNode } from 'react';
import type { AttendanceControlAssignment } from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';

export interface TimeTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AttendanceControlAssignment[];
  date: string;
  locale: string;
  isSaving: boolean;
  onDateChange: (date: string) => void;
  onRemoveShift: (assignment: AttendanceControlAssignment, date?: string) => Promise<void> | void;
}

export type TimeTableEmployeeRow = {
  assignment: AttendanceControlAssignment;
  attendance: string;
  businessLocation: string;
  contractSite: string;
  hasAttendance: boolean;
  hasScheduleAssignment: boolean;
  hasWorkSite: boolean;
  schedule: string;
  workingDays: number;
};

export type TimeTableSortKey =
  | 'employee'
  | 'unit'
  | 'business'
  | 'businessLocation'
  | 'contractSite'
  | 'scheduledTime'
  | 'checkIn'
  | 'checkOut'
  | 'attendance';

export type TimeTableSortDirection = 'asc' | 'desc';

export type TimeTableUnitCoverage = {
  unitId: string;
  unit: string;
  count: number;
  businessList: Array<{
    business: string;
    count: number;
  }>;
};

export type DailyAttendanceMetric = {
  key: string;
  icon: ReactNode;
  label: string;
  title: string;
  value: number;
  valueClassName?: string;
};

export type TimeTableCopy = ControlTranslations['timeTable'];
