import { Columns3, Plus } from 'lucide-react';
import type { PermissionsTranslations } from '../translations';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

interface PermissionHeaderBarProps {
  canCreate: boolean;
  copy: PermissionsTranslations;
  onColumns: () => void;
  onCreate: () => void;
}

export function PermissionHeaderBar({ canCreate, copy, onColumns, onCreate }: PermissionHeaderBarProps) {
  return (
    <HrTitleBar className="mb-0" emoji="✅" title={copy.title} subtitle={copy.subtitle} actions={<>
          <button
            type="button"
            onClick={onColumns}
            className={hrTitleBarSecondaryActionClass}
          >
            <Columns3 className="h-4 w-4" />
            {copy.actions.columns}
          </button>
          {canCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className={hrTitleBarPrimaryActionClass}
            >
              <Plus className="h-4 w-4" />
              {copy.actions.addRequest}
            </button>
          ) : null}
        </>}
    />
  );
}
