import { useState } from 'react';
import { BadgePercent } from 'lucide-react';
import type { SaleRecord } from '../types/salesTypes';
import type { CommissionRecord, CommissionRule } from '../types/commissions';
import type { SalesRecordsTranslations } from '../translations';
import { useCommissionCalculations } from '../hooks/useCommissionCalculations';
import { CommissionDetailModal } from './CommissionDetailModal';
import { CommissionFilters } from './CommissionFilters';
import { CommissionInsightBar } from './CommissionInsightBar';
import { CommissionKpiStrip } from './CommissionKpiStrip';
import { CommissionTable } from './CommissionTable';

export function CommissionsView({
  sales,
  rules,
  t,
}: {
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
      <section className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-5 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-white text-[#B63B32] shadow-sm">
            <BadgePercent className="h-5 w-5" />
          </span>
          <div>
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

      <CommissionKpiStrip kpis={kpis} t={t} />

      <CommissionInsightBar kpis={kpis} visibleCount={filteredRecords.length} t={t} />

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
