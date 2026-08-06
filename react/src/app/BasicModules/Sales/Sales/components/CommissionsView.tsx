import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import type { SaleRecord } from '../types/salesTypes';
import type { CommissionRecord, CommissionRule } from '../types/commissions';
import type { SalesRecordsTranslations } from '../translations';
import { useCommissionCalculations } from '../hooks/useCommissionCalculations';
import { CommissionDetailModal } from './CommissionDetailModal';
import { CommissionFilters } from './CommissionFilters';
import { CommissionKpiStrip } from './CommissionKpiStrip';
import { CommissionTable } from './CommissionTable';
import { salesApi } from '../../salesApi';
import { formatSalesCurrency } from '../utils/salesFormatters';
import { SalesFilterBar, SalesFilterSearch, SalesFilterSelect, salesFilterControlClassName } from '../../components/SalesFilterBar';

type CommissionCut = {
  id: number;
  cutCode: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalAmount: number;
  commissionCount: number;
  employeeCount: number;
  appliedCount: number;
  currencyTotals: Record<string, number>;
};

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
  const loadCuts = () => salesApi.listCommissionCuts()
    .then((response) => setCuts(response.items as unknown as CommissionCut[]))
    .catch(() => setCutsError('No se pudo cargar el historial de cortes.'));
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
      {section === 'cuts' && cutCreated ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">El corte fue enviado a Incentivos de RH. Las aplicaciones quedarán disponibles para la siguiente nómina compatible.</div> : null}

      {section === 'cuts' ? <SalesFilterBar title="Filtros de cortes" gridClassName="md:grid-cols-2 xl:grid-cols-4" summary={<span>{visibleCuts.length} de {cuts.length} cortes</span>}>
        <SalesFilterSearch label="Buscar" placeholder="Folio del corte" value={cutSearch} onValueChange={setCutSearch} />
        <SalesFilterSelect label="Estado" value={cutStatus} onValueChange={setCutStatus} options={[{ value: 'all', label: 'Todos los estados' }, { value: 'in_hr', label: 'En Recursos Humanos' }, { value: 'consumed', label: 'Consumido en nómina' }]} />
        <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Periodo desde</span><input type="date" className={salesFilterControlClassName} value={cutPeriodStart} onChange={(event) => setCutPeriodStart(event.target.value)} /></label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700"><span>Periodo hasta</span><input type="date" className={salesFilterControlClassName} value={cutPeriodEnd} min={cutPeriodStart || undefined} onChange={(event) => setCutPeriodEnd(event.target.value)} /></label>
      </SalesFilterBar> : null}

      {section === 'cuts' ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3"><div><h3 className="font-medium text-slate-950">Cortes de comisión</h3><p className="mt-1 text-xs text-slate-500">Historial enviado a Incentivos y seguimiento de consumo en Nómina.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{visibleCuts.length} cortes</span></div>
        {cutsError ? <p className="p-4 text-sm text-rose-700">{cutsError}</p> : visibleCuts.length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="border-b border-slate-200 text-left text-xs text-slate-500"><tr><th className="px-4 py-3">Folio</th><th className="px-4 py-3">Periodo</th><th className="px-4 py-3">Comisiones</th><th className="px-4 py-3">Colaboradores</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleCuts.map((cut) => <tr key={cut.id}><td className="px-4 py-3 font-medium text-slate-950">{cut.cutCode}</td><td className="px-4 py-3 text-slate-600">{cut.periodStart} → {cut.periodEnd}</td><td className="px-4 py-3">{cut.commissionCount}</td><td className="px-4 py-3">{cut.employeeCount}</td><td className="px-4 py-3 font-medium">{Object.entries(cut.currencyTotals ?? {}).map(([currency, amount]) => <span key={currency} className="block">{formatSalesCurrency(amount, currency)}</span>)}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cut.status === 'consumed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{cut.status === 'consumed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{cut.status === 'consumed' ? 'Consumido en nómina' : `En RH · ${cut.appliedCount}/${cut.employeeCount} aplicados`}</span></td></tr>)}</tbody></table></div> : <div className="p-8 text-center text-sm text-slate-500">{cuts.length ? 'No hay cortes que coincidan con los filtros.' : 'Aún no se han generado cortes de comisión.'}</div>}
      </section> : null}

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
