import { Plus } from 'lucide-react';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
} from '../../shared/components/PointOfSaleTitleBar';
import { usePurchaseOrderTranslations } from '../hooks/usePurchaseOrderTranslations';

export function PurchaseOrderHeader({
  onCreateOrder,
}: {
  onCreateOrder: () => void;
}) {
  const { copy } = usePurchaseOrderTranslations();

  return (
    <PointOfSaleTitleBar
      eyebrow={null}
      icon="📋"
      rhIndent
      title={copy.header.title}
      subtitle={copy.header.subtitle}
      actions={(
        <>
          <button
            type="button"
            className={pointOfSaleTitleBarPrimaryActionClassName}
            onClick={onCreateOrder}
          >
            <Plus className="h-4 w-4" />
            {copy.header.newOrder}
          </button>
        </>
      )}
    />
  );
}
