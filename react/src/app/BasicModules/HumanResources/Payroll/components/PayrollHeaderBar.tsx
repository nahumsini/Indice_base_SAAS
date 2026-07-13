import { RefreshCw, Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PayrollHeaderCopy } from '../translations/types';
import { HrTitleBar, hrTitleBarPrimaryActionClass, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

type PayrollHeaderBarProps = {
  copy: PayrollHeaderCopy;
  isBusy: boolean;
  isRegenerating: boolean;
  onRegenerateRuns: () => void;
  onOpenPreferences: () => void;
};

export function PayrollHeaderBar({
  copy,
  isBusy,
  isRegenerating,
  onRegenerateRuns,
  onOpenPreferences,
}: PayrollHeaderBarProps) {
  return (
    <HrTitleBar emoji="💰" title={copy.title} subtitle={copy.subtitle} actions={<>
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
          <Button
            type="button"
            disabled={isBusy}
            onClick={onOpenPreferences}
            className={hrTitleBarPrimaryActionClass}
          >
            <Settings className="h-4 w-4" />
            {copy.preferences}
          </Button>
        </>}
    />
  );
}
