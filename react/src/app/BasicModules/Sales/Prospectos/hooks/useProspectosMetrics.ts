import { useMemo } from 'react';
import type { SalesOpportunity } from '../../salesCrmContext';
import { calculateProspectosMetrics } from '../utils/prospectosMetrics';

export function useProspectosMetrics(opportunities: SalesOpportunity[]) {
  return useMemo(() => calculateProspectosMetrics(opportunities), [opportunities]);
}

