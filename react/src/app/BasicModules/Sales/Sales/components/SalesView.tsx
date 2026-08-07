import type { SalesRecordsTranslations } from '../translations';
import type { SaleLifecycleSignals, SaleRecord, SalesColumnId, SalesFiltersState } from '../types/salesTypes';
import { SalesFilters } from './SalesFilters';
import { SalesKpiStrip } from './SalesKpiStrip';
import { SalesTable } from './SalesTable';
import type { SalesMetrics } from '../types/salesTypes';

export function SalesView({
  learningModeActive = false,
  records,
  filteredRecords,
  metrics,
  filters,
  visibleColumns,
  lifecycleByRecordId,
  sellers,
  customers,
  businessUnits,
  businesses,
  t,
  onFiltersChange,
  onViewRecord,
  onPreviewSummary,
  onManageCommission,
  onPrepareMovement,
  onSendToFinance,
  onSendToCredit,
  onCancelSale,
}: {
  learningModeActive?: boolean;
  records: SaleRecord[];
  filteredRecords: SaleRecord[];
  metrics: SalesMetrics;
  filters: SalesFiltersState;
  visibleColumns: SalesColumnId[];
  lifecycleByRecordId: Record<string, SaleLifecycleSignals>;
  sellers: string[];
  customers: string[];
  businessUnits: Array<{ id: string; name: string }>;
  businesses: Array<{ id: string; name: string; businessUnitId: string }>;
  t: SalesRecordsTranslations;
  onFiltersChange: (filters: SalesFiltersState) => void;
  onViewRecord: (record: SaleRecord) => void;
  onPreviewSummary: (record: SaleRecord) => void;
  onManageCommission: (record: SaleRecord) => void;
  onPrepareMovement: (record: SaleRecord) => void;
  onSendToFinance: (record: SaleRecord) => void;
  onSendToCredit: (record: SaleRecord) => void;
  onCancelSale: (record: SaleRecord) => void;
}) {
  return (
    <>
      <SalesFilters
        filters={filters}
        businessUnits={businessUnits}
        businesses={businesses}
        sellers={sellers}
        customers={customers}
        t={t}
        onFiltersChange={onFiltersChange}
      />

      {!learningModeActive ? <SalesKpiStrip
        metrics={metrics}
        records={filteredRecords}
        visibleCount={filteredRecords.length}
        totalCount={records.length}
        t={t}
      /> : null}

      <SalesTable
        records={filteredRecords}
        visibleColumns={visibleColumns}
        lifecycleByRecordId={lifecycleByRecordId}
        t={t}
        onViewRecord={onViewRecord}
        onPreviewSummary={onPreviewSummary}
        onManageCommission={onManageCommission}
        onPrepareMovement={onPrepareMovement}
        onSendToFinance={onSendToFinance}
        onSendToCredit={onSendToCredit}
        onCancelSale={onCancelSale}
      />
    </>
  );
}
