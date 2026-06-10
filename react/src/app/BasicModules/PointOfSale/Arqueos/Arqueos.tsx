import { useState } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { CashAuditDetailPanel } from './components/CashAuditDetailPanel';
import { CashAuditFiltersBar } from './components/CashAuditFiltersBar';
import { CashAuditHeader } from './components/CashAuditHeader';
import { CashAuditKpiStrip } from './components/CashAuditKpiStrip';
import { CashAuditTable } from './components/CashAuditTable';
import { useCashAuditFilters } from './hooks/useCashAuditFilters';
import { useCashAudits } from './hooks/useCashAudits';
import type { CashAuditRecord } from './types/cashAudit.types';
import { exportCashAuditsCsv } from './utils/exportCashAudits';

const formatCurrency = (amount: number) => (
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
);

export default function Arqueos() {
  const { filters, setFilter, resetFilters } = useCashAuditFilters();
  const { records, kpis, options, refresh } = useCashAudits(filters);
  const [selectedRecord, setSelectedRecord] = useState<CashAuditRecord | null>(null);

  const hasRisk = kpis.short > 0 || kpis.netDifference < 0;
  const hasDifference = Math.abs(kpis.netDifference) >= 1;

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
          <p className="font-bold">
            {!hasDifference ? 'Periodo balanceado' : hasRisk ? 'Diferencias por revisar' : 'Sobrantes registrados'}
          </p>
          <p className="mt-0.5 text-sm opacity-80">
            {records.length} cierres filtrados · Diferencia neta {kpis.netDifference > 0 ? '+' : ''}{formatCurrency(kpis.netDifference)}
          </p>
        </div>
      </div>

      <CashAuditTable
        records={records}
        selectedRecordId={selectedRecord?.id}
        onSelectRecord={setSelectedRecord}
        formatCurrency={formatCurrency}
      />

      <CashAuditDetailPanel
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
