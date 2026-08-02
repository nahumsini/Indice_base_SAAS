import { Button } from '../../../../../components/ui/button';
import type { InventoryTranslations } from '../../translations';

export function StockBulkActionsBar({
  selectedCount,
  t,
  onClearSelection,
}: {
  selectedCount: number;
  t: InventoryTranslations;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-4 py-3">
      <span className="mr-2 text-sm font-medium text-[#B63B32]">{selectedCount} selected</span>
      <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg bg-white text-xs font-medium">
        {t.operational.actions.setMinimumStock}
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg bg-white text-xs font-medium">
        {t.operational.actions.markAsReviewed}
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg bg-white text-xs font-medium">
        {t.operational.actions.exportVisible}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg text-xs font-medium text-[#B63B32]" onClick={onClearSelection}>
        {t.operational.actions.clearSelection}
      </Button>
    </div>
  );
}
