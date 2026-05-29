import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { InventoryMovementStatus } from '../types/salesTypes';
import type { SalesRecordsTranslations } from '../translations';
import { getInventoryMovementTooltip, inventoryMovementStatusClasses } from '../utils/salesInventoryBridge';

export function InventoryMovementBadge({
  status,
  t,
}: {
  status: InventoryMovementStatus;
  t: SalesRecordsTranslations;
}) {
  return (
    <Badge
      variant="outline"
      title={getInventoryMovementTooltip(status, t)}
      className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', inventoryMovementStatusClasses[status])}
    >
      {t.statuses.movement[status]}
    </Badge>
  );
}
