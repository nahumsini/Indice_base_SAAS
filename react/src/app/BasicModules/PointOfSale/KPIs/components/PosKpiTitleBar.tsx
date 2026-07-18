import { BarChart3, Printer } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../../shared/components/PointOfSaleTitleBar';

export function PosKpiTitleBar({ disabled = false, onPrint }: { disabled?: boolean; onPrint: () => void }) {
  return (
    <PointOfSaleTitleBar
      icon={<BarChart3 className="h-5 w-5" />}
      eyebrow="Retail operativo"
      title="KPIs de punto de venta"
      subtitle="Lectura ejecutiva de cierres, tickets, mezcla de pago y diferencias de caja por periodo."
      actions={(
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onPrint}
          className={pointOfSaleTitleBarSecondaryActionClassName}
        >
          <Printer className="h-4 w-4" />
          Imprimir reporte
        </Button>
      )}
    />
  );
}
