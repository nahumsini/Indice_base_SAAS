import { Columns3, Plus } from 'lucide-react';
import type { RecordHeaderCopy } from '../translations';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

interface RecordHeaderBarProps {
  canManage: boolean;
  copy: RecordHeaderCopy;
  onColumns: () => void;
  onCreate: () => void;
}

export function RecordHeaderBar({ canManage, copy, onColumns, onCreate }: RecordHeaderBarProps) {
  return (
    <HrTitleBar className="mb-0" emoji="📋" title={copy.title} subtitle={copy.subtitle} actions={<>
          <button
            type="button"
            onClick={onColumns}
            className={hrTitleBarSecondaryActionClass}
          >
            <Columns3 className="h-4 w-4" />
            {copy.actions.columns}
          </button>
          {canManage ? (
            <button
              type="button"
              onClick={onCreate}
              className={hrTitleBarPrimaryActionClass}
            >
              <Plus className="h-4 w-4" />
              {copy.actions.addRecord}
            </button>
          ) : null}
        </>}
    />
  );
}
