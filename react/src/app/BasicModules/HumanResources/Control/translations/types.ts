import type { enCA } from './en-CA';

export type ControlLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type ControlStatusKey =
  | 'on_time'
  | 'late'
  | 'leave'
  | 'rest'
  | 'absence'
  | 'pending'
  | 'not_scheduled'
  | 'active'
  | 'inactive';

export interface ControlKpiTranslations {
  absences: string;
  activeShifts: string;
  checkIns: string;
  checkOuts: string;
  late: string;
  noRecords: string;
  operationRate: string;
  reviewBadge: (count: number) => string;
  statusLabels: {
    absence: string;
    late: string;
    noRecord: string;
    onTrack: string;
    other: string;
  };
  summaryInsight: (params: {
    activeShiftCount: number;
    checkInsCount: number;
    operationRate: string;
    reviewCount: number;
    totalCount: number;
  }) => string;
}

export type ControlTranslations = typeof enCA;
