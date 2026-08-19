import { BarChart3, Printer } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../../shared/components/PointOfSaleTitleBar';
import type { PosKpiCopy } from '../posKpiTranslations';

export function PosKpiTitleBar({ copy, disabled = false, onPrint }: { copy: PosKpiCopy; disabled?: boolean; onPrint: () => void }) {
  return (
    <PointOfSaleTitleBar
      icon={<BarChart3 className="h-5 w-5" />}
      eyebrow={copy.titleBar.eyebrow}
      title={copy.titleBar.title}
      subtitle={copy.titleBar.subtitle}
      actions={(
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onPrint}
          className={pointOfSaleTitleBarSecondaryActionClassName}
        >
          <Printer className="h-4 w-4" />
          {copy.titleBar.print}
        </Button>
      )}
    />
  );
}
