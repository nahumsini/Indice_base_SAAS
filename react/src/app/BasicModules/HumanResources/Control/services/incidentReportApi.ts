import { apiClient } from '../../../../lib/apiClient';
import type { IncidentReport, IncidentReportQuery } from '../types/incidentReport';

export function getIncidentReport(query: IncidentReportQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null) params.set(key, String(value));
  });
  return apiClient<IncidentReport>(`/api/v1/hr/attendance/incidents?${params}`, { signal });
}
