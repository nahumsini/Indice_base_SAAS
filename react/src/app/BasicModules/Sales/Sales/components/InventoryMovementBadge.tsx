import { Badge } from '../../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';
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
  const tooltip = getInventoryMovementTooltip(status, t);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn('h-auto max-w-full whitespace-normal break-words rounded-full px-3 py-1 text-xs font-medium tracking-normal', inventoryMovementStatusClasses[status])}
        >
          {t.statuses.movement[status]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-[260px] rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium leading-4 text-white shadow-xl"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
