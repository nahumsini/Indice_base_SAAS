import { useEffect, useMemo, useState } from 'react';
import type { SaleRecord } from '../types/salesTypes';
import type { CommissionCut, CommissionRecord, CommissionRule } from '../types/commissions';
import type { SalesRecordsTranslations } from '../translations';
import { useCommissionCalculations } from '../hooks/useCommissionCalculations';
import { CommissionDetailModal } from './CommissionDetailModal';
import { CommissionFilters } from './CommissionFilters';
import { CommissionKpiStrip } from './CommissionKpiStrip';
import { CommissionTable } from './CommissionTable';
import { CommissionCutsTable } from './CommissionCutsTable';
import { salesApi } from '../../salesApi';
import { SalesFilterBar, SalesFilterSearch, SalesFilterSelect, salesFilterControlClassName } from '../../components/SalesFilterBar';

export function CommissionsView({
  learningModeActive = false,
  sales,
  rules,
  t,
  section = 'generated',
  cutCreated = false,
  cutRefreshKey = 0,
}: {
  learningModeActive?: boolean;
  sales: SaleRecord[];
  rules: CommissionRule[];
  t: SalesRecordsTranslations;
  section?: 'generated' | 'cuts';
  cutCreated?: boolean;
  cutRefreshKey?: number;
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
  const [cuts, setCuts] = useState<CommissionCut[]>([]);
  const [cutsError, setCutsError] = useState('');
  const [cutSearch, setCutSearch] = useState('');
  const [cutStatus, setCutStatus] = useState('all');
  const [cutPeriodStart, setCutPeriodStart] = useState('');
  const [cutPeriodEnd, setCutPeriodEnd] = useState('');
  const copy = t.commissionWorkspace.cutsPanel;
  const loadCuts = () => salesApi.listCommissionCuts()
    .then((response) => setCuts(response.items as unknown as CommissionCut[]))
    .catch(() => setCutsError(copy.loadError));
  useEffect(() => { void loadCuts(); }, [cutRefreshKey]);
  const visibleCuts = useMemo(() => cuts.filter((cut) => {
    const matchesSearch = !cutSearch.trim() || cut.cutCode.toLocaleLowerCase().includes(cutSearch.trim().toLocaleLowerCase());
    const matchesStatus = cutStatus === 'all' || (cutStatus === 'consumed' ? cut.status === 'consumed' : cut.status !== 'consumed');
    const overlapsStart = !cutPeriodStart || cut.periodEnd >= cutPeriodStart;
    const overlapsEnd = !cutPeriodEnd || cut.periodStart <= cutPeriodEnd;
    return matchesSearch && matchesStatus && overlapsStart && overlapsEnd;
  }), [cutPeriodEnd, cutPeriodStart, cutSearch, cutStatus, cuts]);

  return (
    <>
      {section === 'cuts' && cutCreated ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{copy.created}</div> : null}

      {section === 'cuts' ? <SalesFilterBar title={copy.filters} gridClassName="md:grid-cols-2 xl:grid-cols-4" summary={<span>{copy.summary(visibleCuts.length, cuts.length)}</span>}>
        <SalesFilterSearch label={copy.search} placeholder={copy.searchPlaceholder} value={cutSearch} onValueChange={setCutSearch} />
        <SalesFilterSelect label={copy.status} value={cutStatus} onValueChange={setCutStatus} options={[{ value: 'all', label: copy.allStatuses }, { value: 'in_hr', label: copy.inHr }, { value: 'consumed', label: copy.consumed }]} />
        <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{copy.periodFrom}</span><input type="date" className={salesFilterControlClassName} value={cutPeriodStart} onChange={(event) => setCutPeriodStart(event.target.value)} /></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>{copy.periodTo}</span><input type="date" className={salesFilterControlClassName} value={cutPeriodEnd} min={cutPeriodStart || undefined} onChange={(event) => setCutPeriodEnd(event.target.value)} /></label>
      </SalesFilterBar> : null}

      {section === 'cuts' ? cutsError
        ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{cutsError}</div>
        : <CommissionCutsTable records={visibleCuts} totalRecords={cuts.length} copy={copy} />
        : null}

      {section === 'generated' ? <><CommissionFilters
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
      /></> : null}
    </>
  );
}
