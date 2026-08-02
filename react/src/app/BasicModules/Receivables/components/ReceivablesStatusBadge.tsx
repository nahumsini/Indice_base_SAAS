import { Badge } from '../../../components/ui/badge';
import { cn } from '../../../components/ui/utils';
import type { ReceivablesTranslations } from '../translations';
import type { CreditSaleStatus, ReceivableStatus } from '../types';
import { statusClasses } from '../utils';

interface ReceivablesStatusBadgeProps {
  copy: ReceivablesTranslations;
  status: CreditSaleStatus | ReceivableStatus;
}

export function ReceivablesStatusBadge({ copy, status }: ReceivablesStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('rounded-full border px-3 py-1 text-xs font-medium', statusClasses[status])}>
      {copy.status[status]}
    </Badge>
  );
}
