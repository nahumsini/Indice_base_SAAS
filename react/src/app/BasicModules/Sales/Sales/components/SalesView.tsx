import type { SalesRecordsTranslations } from '../translations';
import type { ReceivableAccount, ReceivablePayment } from '../../../Receivables/types';
import type {
  SaleLifecycleSignals,
  SaleReceivableSummary,
  SaleRecord,
  SaleSourceSummary,
  SalesColumnId,
  SalesFiltersState,
} from '../types/salesTypes';
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
  receivablesByRecordId,
  sourceByRecordId,
  receivableAccounts,
  receivablePayments,
  sellers,
  customers,
  t,
  onFiltersChange,
  onViewRecord,
  onPreviewSummary,
  onManageCommission,
  onPrepareMovement,
  onSendToFinance,
  onSendToCredit,
  onOpenReceivables,
  onDownloadQuote,
  onDownloadInvoice,
  onCancelSale,
}: {
  learningModeActive?: boolean;
  records: SaleRecord[];
  filteredRecords: SaleRecord[];
  metrics: SalesMetrics;
  filters: SalesFiltersState;
  visibleColumns: SalesColumnId[];
  lifecycleByRecordId: Record<string, SaleLifecycleSignals>;
  receivablesByRecordId: Record<string, SaleReceivableSummary | undefined>;
  sourceByRecordId: Record<string, SaleSourceSummary>;
  receivableAccounts: ReceivableAccount[];
  receivablePayments: ReceivablePayment[];
  sellers: string[];
  customers: string[];
  t: SalesRecordsTranslations;
  onFiltersChange: (filters: SalesFiltersState) => void;
  onViewRecord: (record: SaleRecord) => void;
  onPreviewSummary: (record: SaleRecord) => void;
  onManageCommission: (record: SaleRecord) => void;
  onPrepareMovement: (record: SaleRecord) => void;
  onSendToFinance: (record: SaleRecord) => void;
  onSendToCredit: (record: SaleRecord) => void;
  onOpenReceivables: (record: SaleRecord) => void;
  onDownloadQuote: (record: SaleRecord) => void;
  onDownloadInvoice: (record: SaleRecord) => void;
  onCancelSale: (record: SaleRecord) => void;
}) {
  return (
    <>
      <SalesFilters
        filters={filters}
        sellers={sellers}
        customers={customers}
        t={t}
        onFiltersChange={onFiltersChange}
      />

      {!learningModeActive ? <SalesKpiStrip
        metrics={metrics}
        records={filteredRecords}
        receivableAccounts={receivableAccounts}
        receivablePayments={receivablePayments}
        visibleCount={filteredRecords.length}
        totalCount={records.length}
        t={t}
      /> : null}

      <SalesTable
        records={filteredRecords}
        visibleColumns={visibleColumns}
        lifecycleByRecordId={lifecycleByRecordId}
        receivablesByRecordId={receivablesByRecordId}
        sourceByRecordId={sourceByRecordId}
        t={t}
        onViewRecord={onViewRecord}
        onPreviewSummary={onPreviewSummary}
        onManageCommission={onManageCommission}
        onPrepareMovement={onPrepareMovement}
        onSendToFinance={onSendToFinance}
        onSendToCredit={onSendToCredit}
        onOpenReceivables={onOpenReceivables}
        onDownloadQuote={onDownloadQuote}
        onDownloadInvoice={onDownloadInvoice}
        onCancelSale={onCancelSale}
      />
    </>
  );
}
