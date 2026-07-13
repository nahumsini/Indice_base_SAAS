import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { AnnouncementHeaderCopy } from '../translations';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

interface AnnouncementHeaderBarProps {
  canManage: boolean;
  copy: AnnouncementHeaderCopy;
  onAdd: () => void;
  onColumns: () => void;
}

export function AnnouncementHeaderBar({
  canManage,
  copy,
  onAdd,
  onColumns,
}: AnnouncementHeaderBarProps) {
  return (
    <HrTitleBar emoji="📢" title={copy.pageTitle} subtitle={copy.pageSubtitle} actions={<>
          <Button
            variant="outline"
            className={hrTitleBarSecondaryActionClass}
            onClick={onColumns}
          >
            <Columns3 className="h-4 w-4" />
            {copy.columns}
          </Button>
          {canManage ? (
            <Button
              className={hrTitleBarPrimaryActionClass}
              onClick={onAdd}
            >
              <Plus className="h-4 w-4" />
              {copy.addAnnouncement}
            </Button>
          ) : null}
        </>}
    />
  );
}
