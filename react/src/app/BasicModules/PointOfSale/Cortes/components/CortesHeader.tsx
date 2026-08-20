import { Columns3, Printer, RefreshCw } from 'lucide-react';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../../shared/components/PointOfSaleTitleBar';
import type { CortesCopy } from '../cortesTranslations';

interface CortesHeaderProps {
  copy: CortesCopy;
  loading: boolean;
  onColumns: () => void;
  onPrintReport: () => void;
  onRefresh: () => void;
}

export function CortesHeader({
  copy,
  loading,
  onColumns,
  onPrintReport,
  onRefresh,
}: CortesHeaderProps) {
  return (
    <PointOfSaleTitleBar
      icon="💵"
      title={copy.header.title}
      subtitle={copy.header.description}
      actions={(
        <>
          <button type="button" onClick={onColumns} className={pointOfSaleTitleBarSecondaryActionClassName}>
            <Columns3 className="h-4 w-4" />
            {copy.header.columns}
          </button>
          <button type="button" onClick={onRefresh} disabled={loading} className={pointOfSaleTitleBarSecondaryActionClassName}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {copy.header.refresh}
          </button>
          <button type="button" onClick={onPrintReport} className={pointOfSaleTitleBarPrimaryActionClassName}>
            <Printer className="h-4 w-4" />
            {copy.header.printReport}
          </button>
        </>
      )}
    />
  );
}
