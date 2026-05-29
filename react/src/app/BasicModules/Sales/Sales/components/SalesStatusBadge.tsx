import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { CommercialStatus } from '../types/salesTypes';
import type { SalesRecordsTranslations } from '../translations';
import { commercialStatusClasses } from '../utils/salesStatuses';

export function SalesStatusBadge({
  status,
  t,
}: {
  status: CommercialStatus;
  t: SalesRecordsTranslations;
}) {
  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', commercialStatusClasses[status])}>
      {t.statuses.commercial[status]}
    </Badge>
  );
}
