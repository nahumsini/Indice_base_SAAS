import { useState } from 'react';
import { BadgePercent } from 'lucide-react';
import type { SaleRecord } from '../types/salesTypes';
import type { CommissionRecord, CommissionRule } from '../types/commissions';
import type { SalesRecordsTranslations } from '../translations';
import { useCommissionCalculations } from '../hooks/useCommissionCalculations';
import { CommissionDetailModal } from './CommissionDetailModal';
import { CommissionFilters } from './CommissionFilters';
import { CommissionKpiStrip } from './CommissionKpiStrip';
import { CommissionTable } from './CommissionTable';

export function CommissionsView({
  learningModeActive = false,
  sales,
  rules,
  t,
}: {
  learningModeActive?: boolean;
  sales: SaleRecord[];
  rules: CommissionRule[];
  t: SalesRecordsTranslations;
}) {
  const {
    filteredRecords,
    filters,
    setFilters,
    kpis,
    units,
    businesses,
    salesReps,
    products,
  } = useCommissionCalculations({ sales, rules });
  const [selectedRecord, setSelectedRecord] = useState<CommissionRecord | null>(null);

  return (
    <>
      <section className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/[0.08] p-5 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
        <div className="flex items-start gap-3">
          <span className="mt-1 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden="true">
            <BadgePercent className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xl font-black text-slate-950 dark:text-white">{t.commissions.view.title}</h3>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{t.commissions.view.subtitle}</p>
          </div>
        </div>
      </section>

      <CommissionFilters
        filters={filters}
        units={units}
        businesses={businesses}
        salesReps={salesReps}
        products={products}
        t={t}
        onFiltersChange={setFilters}
      />

      {!learningModeActive ? <CommissionKpiStrip kpis={kpis} records={filteredRecords} t={t} /> : null}

      <CommissionTable records={filteredRecords} t={t} onViewRecord={setSelectedRecord} />

      <CommissionDetailModal
        open={Boolean(selectedRecord)}
        record={selectedRecord}
        t={t}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
      />
    </>
  );
}
