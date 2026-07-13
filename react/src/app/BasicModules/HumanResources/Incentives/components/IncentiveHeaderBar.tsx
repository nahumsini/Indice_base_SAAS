import { Columns3, Plus } from 'lucide-react';
import type { IncentivesTranslations } from '../translations';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

interface IncentiveHeaderBarProps {
  copy: IncentivesTranslations;
  onColumns: () => void;
  onCreate: () => void;
}

export function IncentiveHeaderBar({ copy, onColumns, onCreate }: IncentiveHeaderBarProps) {
  return (
    <HrTitleBar emoji="🎁" title={copy.title} subtitle={copy.subtitle} actions={<>
          <button
            type="button"
            onClick={onColumns}
            className={hrTitleBarSecondaryActionClass}
          >
            <Columns3 className="h-4 w-4" />
            {copy.actions.columns}
          </button>
          <button
            type="button"
            onClick={onCreate}
            className={hrTitleBarPrimaryActionClass}
          >
            <Plus className="h-4 w-4" />
            {copy.actions.addIncentive}
          </button>
        </>}
    />
  );
}
