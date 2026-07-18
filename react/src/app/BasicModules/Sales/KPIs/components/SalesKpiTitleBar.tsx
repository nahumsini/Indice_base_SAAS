import { BarChart3, Printer } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesTitleBar, salesTitleBarSecondaryActionClassName } from '../../components/SalesTitleBar';
import type { SalesKpisTranslations } from '../translations';

export function SalesKpiTitleBar({
  copy,
  disabled = false,
  onPrint,
}: {
  copy: SalesKpisTranslations;
  disabled?: boolean;
  onPrint: () => void;
}) {
  return (
    <SalesTitleBar
      icon={<BarChart3 className="h-5 w-5" />}
      title={copy.header.title}
      subtitle={copy.header.subtitle}
      actions={(
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onPrint}
          className={salesTitleBarSecondaryActionClassName}
        >
          <Printer className="h-4 w-4" />
          {copy.actions.printReport}
        </Button>
      )}
    />
  );
}
