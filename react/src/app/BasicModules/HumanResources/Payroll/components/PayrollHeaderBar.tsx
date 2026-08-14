import { Plus, RefreshCw, Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PayrollHeaderCopy } from '../translations/types';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

type PayrollHeaderBarProps = {
  copy: PayrollHeaderCopy;
  isBusy: boolean;
  isRegenerating: boolean;
  hasRuns: boolean;
  canPrepare: boolean;
  canConfigure: boolean;
  onCreateRun: () => void;
  onRegenerateRuns: () => void;
  onOpenPreferences: () => void;
};

export function PayrollHeaderBar({
  copy,
  isBusy,
  isRegenerating,
  hasRuns,
  canPrepare,
  canConfigure,
  onCreateRun,
  onRegenerateRuns,
  onOpenPreferences,
}: PayrollHeaderBarProps) {
  return (
    <HrTitleBar
      emoji={'\u{1F4B0}'}
      title={copy.title}
      subtitle={copy.subtitle}
      actions={(
        <>
          {canPrepare ? (
            <Button
              type="button"
              disabled={isBusy}
              onClick={onCreateRun}
              className={hrTitleBarPrimaryActionClass}
            >
              <Plus className="h-4 w-4" />
              {hasRuns ? copy.createRun : copy.createFirstRun}
            </Button>
          ) : null}
          {canPrepare && hasRuns ? (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={onRegenerateRuns}
              className={hrTitleBarSecondaryActionClass}
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              {copy.regenerateRuns}
            </Button>
          ) : null}
          {canConfigure ? (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={onOpenPreferences}
              className={hrTitleBarSecondaryActionClass}
            >
              <Settings className="h-4 w-4" />
              {copy.preferences}
            </Button>
          ) : null}
        </>
      )}
    />
  );
}
