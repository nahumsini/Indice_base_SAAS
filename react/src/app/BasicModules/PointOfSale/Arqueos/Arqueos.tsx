import { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { CashAuditDetailPanel } from './components/CashAuditDetailPanel';
import { CashAuditFiltersBar } from './components/CashAuditFiltersBar';
import { CashAuditHeader } from './components/CashAuditHeader';
import { CashAuditKpiStrip } from './components/CashAuditKpiStrip';
import { CashAuditTable } from './components/CashAuditTable';
import { useCashAuditFilters } from './hooks/useCashAuditFilters';
import { useCashAudits } from './hooks/useCashAudits';
import type { CashAuditRecord, CashAuditReviewStatus } from './types/cashAudit.types';
import { exportCashAuditsCsv } from './utils/exportCashAudits';

const formatCurrency = (amount: number) => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
);

export default function Arqueos() {
  const { filters, setFilter, resetFilters } = useCashAuditFilters();
  const { error, loading, records, kpis, options, refresh, updateReview } = useCashAudits(filters);
  const [selectedRecord, setSelectedRecord] = useState<CashAuditRecord | null>(null);

  const hasRisk = kpis.short > 0 || kpis.netDifference < 0;
  const hasDifference = Math.abs(kpis.netDifference) >= 1;

  const handleUpdateReview = (
    record: CashAuditRecord,
    auditStatus: CashAuditReviewStatus,
    auditNote: string,
  ) => {
    updateReview(record.id, auditStatus, auditNote);
    setSelectedRecord({
      ...record,
      auditNote,
      auditStatus,
      reviewedAt: auditStatus === 'resolved' ? new Date() : record.reviewedAt,
      requiresReview: record.status !== 'balanced' && auditStatus !== 'resolved',
    });
  };

  return (
    <div className="space-y-5">
      <CashAuditHeader onRefresh={refresh} onExport={() => exportCashAuditsCsv(records)} />

      <CashAuditFiltersBar
        filters={filters}
        options={options}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      <CashAuditKpiStrip kpis={kpis} formatCurrency={formatCurrency} />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">No se pudieron cargar los arqueos reales</p>
            <p className="mt-0.5 text-sm opacity-80">{error}</p>
          </div>
        </div>
      )}

      <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        !hasDifference
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100'
          : hasRisk
          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100'
          : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100'
      }`}>
        {!hasDifference ? (
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
        ) : hasRisk ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium">
            {!hasDifference ? 'Periodo sin diferencias abiertas' : hasRisk ? 'Diferencias por revisar' : 'Sobrantes registrados'}
          </p>
          <p className="mt-0.5 text-sm opacity-80">
            {records.length} cierres filtrados · {kpis.requiresReview} requieren revisión · Diferencia neta {kpis.netDifference > 0 ? '+' : ''}{formatCurrency(kpis.netDifference)}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-8 text-sm font-medium text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando cierres reales para revisión...
        </div>
      )}

      <CashAuditTable
        records={records}
        selectedRecordId={selectedRecord?.id}
        onSelectRecord={setSelectedRecord}
        formatCurrency={formatCurrency}
        isLoading={loading}
      />

      <CashAuditDetailPanel
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onUpdateReview={handleUpdateReview}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
