export interface IncidentReportDay {
  date: string;
  status: string;
  systemStatus: string;
  correctedStatus: string | null;
  checkIn: string | null;
  checkOut: string | null;
  minutesLate: number;
  recordedMinutes: number | null;
  incomplete: boolean;
  notes: string | null;
}
export interface IncidentReportTotals {
  statuses: Record<string, number>;
  daysWithEntry: number;
  incompleteDays: number;
  minutesLate: number;
  recordedMinutes: number;
}
export interface IncidentReportEmployee {
  person: {
    id: number; code: string; name: string; position: string; department: string;
    unitId: number | null; unitName: string; businessId: number | null; businessName: string;
    hireDate: string | null; lastWorkingDay: string | null; employmentStatus: string;
  };
  days: IncidentReportDay[];
  totals: IncidentReportTotals;
}
export interface IncidentReport {
  from: string; to: string; generatedAt: string; calendarDays: number;
  employeeCount: number; employees: IncidentReportEmployee[]; totals: IncidentReportTotals;
}
export interface IncidentReportQuery {
  from: string; to: string; unitId?: number; businessId?: number; employeeId?: number;
}
export type IncidentReportPeriod = 'week' | 'fortnight' | 'month' | 'custom';
