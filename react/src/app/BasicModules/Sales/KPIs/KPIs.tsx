import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  PackageCheck,
  Search,
  Target,
  TrendingUp,
  UsersRound,
  Warehouse,
} from 'lucide-react';
import { useSalesCrm } from '../salesCrmContext';
import { buildInventoryStockRows, initialInventoryWarehouses } from '../Inventory/data/inventoryMockData';
import {
  filterSalesKpiSources,
  getSalesKpiMetrics,
  getSalesKpiOptions,
  getSellerRanking,
  parseSalesKpiMoney,
  type SalesKpiDataSources,
} from './salesKpiSelectors';

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const percent = (value: number) => `${Math.round(value)}%`;

function StatusPill({ label, tone = 'gray' }: { label: string; tone?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {label}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'blue',
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  detail: string;
  tone?: 'coral' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const tones = {
    coral: 'text-[#B63B32]',
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    yellow: 'text-amber-600',
    red: 'text-rose-600',
    purple: 'text-violet-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Icon className={`h-5 w-5 ${tones[tone]}`} />
      </div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function ProgressLine({ value, danger = false }: { value: number; danger?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${danger ? 'bg-rose-500' : 'bg-[#FF6B5E]'}`}
          style={{ width: `${Math.min(Math.max(value, 2), 100)}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-bold text-slate-900">{percent(value)}</span>
    </div>
  );
}

export default function KPIs() {
  const { contacts, opportunities, quotes, products, salesRecords } = useSalesCrm();

  const [businessUnitFilter, setBusinessUnitFilter] = useState('all');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [search, setSearch] = useState('');

  const sources = useMemo<SalesKpiDataSources>(() => ({
    contacts,
    opportunities,
    quotes,
    sales: salesRecords,
    products,
    inventoryRows: buildInventoryStockRows(products, initialInventoryWarehouses),
  }), [contacts, opportunities, products, quotes, salesRecords]);

  const options = useMemo(() => getSalesKpiOptions(sources), [sources]);
  const filteredSources = useMemo(() => filterSalesKpiSources(sources, {
    businessUnit: businessUnitFilter,
    business: businessFilter,
    seller: sellerFilter,
    search,
  }), [businessFilter, businessUnitFilter, search, sellerFilter, sources]);
  const kpis = useMemo(() => getSalesKpiMetrics(filteredSources), [filteredSources]);
  const sellerRanking = useMemo(() => getSellerRanking(filteredSources), [filteredSources]);
  const filteredOpportunities = filteredSources.opportunities;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <BarChart3 className="h-6 w-6 text-[#B63B32]" />
              KPIs comerciales
            </h2>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Tablero real de ventas: prospectos, cotizaciones, cierres, comisiones, productos e inventario comercial.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-slate-950">Filtros</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <select value={businessUnitFilter} onChange={(event) => setBusinessUnitFilter(event.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <option value="all">Todas las unidades</option>
            {options.businessUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>

          <select value={businessFilter} onChange={(event) => setBusinessFilter(event.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <option value="all">Todos los negocios</option>
            {options.businesses.map((business) => (
              <option key={business.id} value={business.id}>{business.name}</option>
            ))}
          </select>

          <select value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <option value="all">Todos los vendedores</option>
            {options.sellers.map((seller) => (
              <option key={seller} value={seller}>{seller}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar prospecto, cliente o vendedor"
              className="w-full bg-transparent outline-none"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Target} label="Prospectos activos" value={String(kpis.activeProspects)} detail={`${kpis.totalProspects} oportunidades totales`} />
        <MetricCard icon={FileText} label="Cotizaciones" value={String(kpis.totalQuotes)} detail={`${kpis.approvedQuotes + kpis.closedWonQuotes} aprobadas o ganadas`} tone="yellow" />
        <MetricCard icon={CircleDollarSign} label="Ingresos por ventas" value={money.format(kpis.salesRevenue)} detail={`${kpis.totalSales} ventas registradas`} tone="green" />
        <MetricCard icon={BriefcaseBusiness} label="Comisiones" value={money.format(kpis.totalCommissions)} detail="Calculadas desde ventas" tone="purple" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Señales comerciales</h3>
            <p className="text-sm text-slate-500">
              Lectura rápida del embudo comercial y puntos que pueden frenar cierre o ejecución.
            </p>
          </div>
          <StatusPill
            label={kpis.commercialRisk ? 'Atención requerida' : 'Operación estable'}
            tone={kpis.commercialRisk ? 'red' : 'green'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-slate-700">Conversión cotización → venta</p>
              <TrendingUp className="h-5 w-5 text-[#B63B32]" />
            </div>
            <p className="mb-4 text-3xl font-bold text-slate-950">{percent(kpis.quoteConversionRate)}</p>
            <ProgressLine value={kpis.quoteConversionRate} danger={kpis.quoteConversionRate < 25} />
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-slate-700">Preparación inventario</p>
              <Warehouse className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mb-4 text-3xl font-bold text-slate-950">{percent(kpis.inventoryReadiness)}</p>
            <p className="mb-4 text-sm text-slate-500">{kpis.inventoryPreparedProducts} de {kpis.totalProducts} productos listos</p>
            <ProgressLine value={kpis.inventoryReadiness} danger={kpis.inventoryReadiness < 60} />
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-slate-700">Riesgo comercial</p>
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <p className="mb-4 text-3xl font-bold text-slate-950">{kpis.commercialRisk}</p>
            <p className="text-sm text-slate-500">
              Prospectos vencidos, estancados o sin seguimiento oportuno.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UsersRound} label="Contactos" value={String(kpis.totalContacts)} detail={`${kpis.activeCustomers} clientes activos`} />
        <MetricCard icon={PackageCheck} label="Productos" value={String(kpis.totalProducts)} detail={`${kpis.activeProducts} activos en catálogo`} tone="green" />
        <MetricCard icon={ClipboardList} label="Ticket promedio" value={money.format(kpis.averageTicket)} detail="Sobre ventas registradas" tone="purple" />
        <MetricCard icon={CheckCircle2} label="Aprobación de cotizaciones" value={percent(kpis.quoteApprovalRate)} detail={`${percent(kpis.quoteRejectionRate)} rechazadas o expiradas`} tone="yellow" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-bold text-slate-950">Rendimiento por vendedor</h3>
          <p className="text-sm text-slate-500">Ranking por ventas ganadas, conversión, cotizaciones y pipeline.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Rank</th>
                <th className="px-5 py-4">Vendedor</th>
                <th className="px-5 py-4">Ventas</th>
                <th className="px-5 py-4">Pipeline</th>
                <th className="px-5 py-4">Cotizaciones</th>
                <th className="px-5 py-4">Cierres</th>
                <th className="px-5 py-4">Conversión</th>
              </tr>
            </thead>
            <tbody>
              {sellerRanking.map((row, index) => (
                <tr key={row.seller} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-bold">#{index + 1}</td>
                  <td className="px-5 py-4 font-semibold text-slate-950">{row.seller}</td>
                  <td className="px-5 py-4 font-bold">{money.format(row.sales)}</td>
                  <td className="px-5 py-4">{money.format(row.pipeline)}</td>
                  <td className="px-5 py-4">{row.quotes}</td>
                  <td className="px-5 py-4">{row.closed}</td>
                  <td className="px-5 py-4">
                    <ProgressLine value={row.conversion} danger={row.conversion < 25} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-bold text-slate-950">Prospectos filtrados</h3>
          <p className="text-sm text-slate-500">
            Operación diaria: seguimiento, etapa, valor estimado y próxima acción.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Prospecto</th>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Etapa</th>
                <th className="px-5 py-4">Responsable</th>
                <th className="px-5 py-4">Valor</th>
                <th className="px-5 py-4">Próxima acción</th>
                <th className="px-5 py-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-950">{item.opportunityName}</p>
                    <p className="text-xs text-slate-500">{item.id}</p>
                  </td>
                  <td className="px-5 py-4">{item.company}</td>
                  <td className="px-5 py-4">{item.stage}</td>
                  <td className="px-5 py-4">{item.owner}</td>
                  <td className="px-5 py-4 font-bold">{money.format(parseSalesKpiMoney(item.estimatedValue))}</td>
                  <td className="px-5 py-4">{item.nextAction} · {item.nextActionDate}</td>
                  <td className="px-5 py-4">
                    <StatusPill
                      label={item.status}
                      tone={item.status === 'Overdue' ? 'red' : item.status === 'Closed' ? 'green' : 'blue'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
