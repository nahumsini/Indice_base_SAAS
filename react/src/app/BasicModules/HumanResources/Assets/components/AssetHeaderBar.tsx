import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AssetHeaderCopy } from '../translations';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

interface AssetHeaderBarProps {
  canManage: boolean;
  copy: AssetHeaderCopy;
  onAdd: () => void;
  onColumns: () => void;
}

export function AssetHeaderBar({
  canManage,
  copy,
  onAdd,
  onColumns,
}: AssetHeaderBarProps) {
  return (
    <HrTitleBar emoji="💼" title={copy.title} subtitle={copy.subtitle} actions={<>
          <Button
            variant="outline"
            onClick={onColumns}
            className={hrTitleBarSecondaryActionClass}
          >
            <Columns3 className="h-4 w-4" />
            {copy.columnPicker.button}
          </Button>
          {canManage ? (
            <Button
              onClick={onAdd}
              className={hrTitleBarPrimaryActionClass}
            >
              <Plus className="h-4 w-4" />
              {copy.newAsset}
            </Button>
          ) : null}
        </>}
    />
  );
}
