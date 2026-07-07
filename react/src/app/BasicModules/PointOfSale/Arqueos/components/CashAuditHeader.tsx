import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../../shared/components/PointOfSaleTitleBar';

interface CashAuditHeaderProps {
  onRefresh: () => void;
  onExport: () => void;
}

export function CashAuditHeader({ onRefresh, onExport }: CashAuditHeaderProps) {
  return (
    <PointOfSaleTitleBar
      eyebrow="Control supervisor"
      icon={<ShieldCheck className="h-8 w-8 text-orange-600 dark:text-orange-300" />}
      rhIndent
      title="Arqueos de caja"
      subtitle="Valida diferencias de efectivo, evidencia operativa y cierres que requieren seguimiento."
      actions={(
        <>
        <button
          onClick={onRefresh}
          className={pointOfSaleTitleBarSecondaryActionClassName}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
        <button
          onClick={onExport}
          className={pointOfSaleTitleBarPrimaryActionClassName}
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
        </>
      )}
    />
  );
}
