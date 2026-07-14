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
import { formatSalesCurrencyAmount } from '../utils/salesCurrency';
import { buildInventoryStockRows } from '../Inventory/data/inventoryMockData';
import {
  filterSalesKpiSources,
  getSalesKpiMetrics,
  getSalesKpiOptions,
  getSellerRanking,
  parseSalesKpiMoney,
  type SalesKpiDataSources,
} from './salesKpiSelectors';
import { useSalesKpisTranslations } from './hooks/useSalesKpisTranslations';
import { useCurrencyAwareMoney } from '../../shared/useCurrencyAwareMoney';

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
  tone?: 'coral' | 'blue' | 'green' | 'yellow' | 'red';
}) {
  const tones = {
    coral: 'text-[#B63B32]',
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    yellow: 'text-amber-600',
    red: 'text-rose-600',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
  const copy = useSalesKpisTranslations();
  const { formatPreferred, preferredCurrency, rateContext, summarize } = useCurrencyAwareMoney();

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
    inventoryRows: buildInventoryStockRows(products),
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
  const salesSummary = summarize(filteredSources.sales.map((sale) => ({
    amount: sale.totalAmount,
    currency: sale.currency,
  })));
  const commissionSummary = summarize(filteredSources.sales.map((sale) => ({
    amount: sale.commissionAmount || 0,
    currency: sale.currency,
  })));
  const sellerMoney = useMemo(() => new Map(sellerRanking.map((row) => {
    const sellerSales = filteredSources.sales.filter((sale) => sale.sellerName === row.seller);
    const sellerOpportunities = filteredOpportunities.filter(
      (opportunity) => opportunity.owner === row.seller && opportunity.status !== 'Closed',
    );
    return [row.seller, {
      pipeline: summarize(sellerOpportunities.map((opportunity) => ({
        amount: parseSalesKpiMoney(opportunity.estimatedValue),
        currency: opportunity.currency ?? preferredCurrency,
      }))).preferredTotalLabel,
      sales: summarize(sellerSales.map((sale) => ({
        amount: sale.totalAmount,
        currency: sale.currency,
      }))).preferredTotalLabel,
    }];
  })), [filteredOpportunities, filteredSources.sales, preferredCurrency, sellerRanking, summarize]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <BarChart3 className="h-6 w-6 text-[#B63B32]" />
              {copy.header.title}
            </h2>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {copy.header.subtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-slate-950">{copy.filters.title}</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <select value={businessUnitFilter} onChange={(event) => setBusinessUnitFilter(event.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <option value="all">{copy.filters.allUnits}</option>
            {options.businessUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>

          <select value={businessFilter} onChange={(event) => setBusinessFilter(event.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <option value="all">{copy.filters.allBusinesses}</option>
            {options.businesses.map((business) => (
              <option key={business.id} value={business.id}>{business.name}</option>
            ))}
          </select>

          <select value={sellerFilter} onChange={(event) => setSellerFilter(event.target.value)} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <option value="all">{copy.filters.allSellers}</option>
            {options.sellers.map((seller) => (
              <option key={seller} value={seller}>{seller}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.filters.searchPlaceholder}
              className="w-full bg-transparent outline-none"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Target} label={copy.cards.activeProspects.label} value={String(kpis.activeProspects)} detail={copy.cards.activeProspects.detail(kpis.totalProspects)} />
        <MetricCard icon={FileText} label={copy.cards.quotes.label} value={String(kpis.totalQuotes)} detail={copy.cards.quotes.detail(kpis.approvedQuotes + kpis.closedWonQuotes)} tone="yellow" />
        <MetricCard icon={CircleDollarSign} label={copy.cards.salesRevenue.label} value={salesSummary.preferredTotalLabel} detail={copy.cards.salesRevenue.detail(kpis.totalSales)} tone="green" />
        <MetricCard icon={BriefcaseBusiness} label={copy.cards.commissions.label} value={commissionSummary.preferredTotalLabel} detail={copy.cards.commissions.detail} tone="blue" />
      </section>

      {filteredSources.sales.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="rounded-full border border-[#59C3A5]/25 bg-[#E7F3F2] px-3 py-1 text-[#257B68]">Totales en {preferredCurrency}</span>
          <span>{rateContext.label} · {rateContext.effectiveDate}</span>
          {salesSummary.nativeBreakdown ? <span>Nativo: {salesSummary.nativeBreakdown}</span> : null}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">{copy.signals.title}</h3>
            <p className="text-sm text-slate-500">
              {copy.signals.subtitle}
            </p>
          </div>
          <StatusPill
            label={kpis.commercialRisk ? copy.signals.risk : copy.signals.stable}
            tone={kpis.commercialRisk ? 'red' : 'green'}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-slate-700">{copy.signals.conversion}</p>
              <TrendingUp className="h-5 w-5 text-[#B63B32]" />
            </div>
            <p className="mb-4 text-3xl font-bold text-slate-950">{percent(kpis.quoteConversionRate)}</p>
            <ProgressLine value={kpis.quoteConversionRate} danger={kpis.quoteConversionRate < 25} />
          </div>

          <div className="rounded-lg border border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-slate-700">{copy.signals.inventoryReadiness}</p>
              <Warehouse className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mb-4 text-3xl font-bold text-slate-950">{percent(kpis.inventoryReadiness)}</p>
            <p className="mb-4 text-sm text-slate-500">{copy.signals.inventoryReadyDetail(kpis.inventoryPreparedProducts, kpis.totalProducts)}</p>
            <ProgressLine value={kpis.inventoryReadiness} danger={kpis.inventoryReadiness < 60} />
          </div>

          <div className="rounded-lg border border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold text-slate-700">{copy.signals.commercialRisk}</p>
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <p className="mb-4 text-3xl font-bold text-slate-950">{kpis.commercialRisk}</p>
            <p className="text-sm text-slate-500">
              {copy.signals.commercialRiskDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UsersRound} label={copy.cards.contacts.label} value={String(kpis.totalContacts)} detail={copy.cards.contacts.detail(kpis.activeCustomers)} />
        <MetricCard icon={PackageCheck} label={copy.cards.products.label} value={String(kpis.totalProducts)} detail={copy.cards.products.detail(kpis.activeProducts)} tone="green" />
        <MetricCard icon={ClipboardList} label={copy.cards.averageTicket.label} value={formatPreferred(kpis.totalSales > 0 ? salesSummary.preferredTotal / kpis.totalSales : 0, preferredCurrency)} detail={copy.cards.averageTicket.detail} tone="blue" />
        <MetricCard icon={CheckCircle2} label={copy.cards.quoteApproval.label} value={percent(kpis.quoteApprovalRate)} detail={copy.cards.quoteApproval.detail(percent(kpis.quoteRejectionRate))} tone="yellow" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-bold text-slate-950">{copy.sellerTable.title}</h3>
          <p className="text-sm text-slate-500">{copy.sellerTable.subtitle}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-5 py-4">{copy.sellerTable.columns.rank}</th>
                <th className="px-5 py-4">{copy.sellerTable.columns.seller}</th>
                <th className="px-5 py-4">{copy.sellerTable.columns.sales}</th>
                <th className="px-5 py-4">{copy.sellerTable.columns.pipeline}</th>
                <th className="px-5 py-4">{copy.sellerTable.columns.quotes}</th>
                <th className="px-5 py-4">{copy.sellerTable.columns.closed}</th>
                <th className="px-5 py-4">{copy.sellerTable.columns.conversion}</th>
              </tr>
            </thead>
            <tbody>
              {sellerRanking.map((row, index) => (
                <tr key={row.seller} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-bold">#{index + 1}</td>
                  <td className="px-5 py-4 font-semibold text-slate-950">{row.seller}</td>
                  <td className="px-5 py-4 font-bold">{sellerMoney.get(row.seller)?.sales}</td>
                  <td className="px-5 py-4">{sellerMoney.get(row.seller)?.pipeline}</td>
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

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-lg font-bold text-slate-950">{copy.prospectsTable.title}</h3>
          <p className="text-sm text-slate-500">
            {copy.prospectsTable.subtitle}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-5 py-4">{copy.prospectsTable.columns.prospect}</th>
                <th className="px-5 py-4">{copy.prospectsTable.columns.customer}</th>
                <th className="px-5 py-4">{copy.prospectsTable.columns.stage}</th>
                <th className="px-5 py-4">{copy.prospectsTable.columns.owner}</th>
                <th className="px-5 py-4">{copy.prospectsTable.columns.value}</th>
                <th className="px-5 py-4">{copy.prospectsTable.columns.nextAction}</th>
                <th className="px-5 py-4">{copy.prospectsTable.columns.status}</th>
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
                  <td className="px-5 py-4 font-bold">
                    <p>{formatPreferred(parseSalesKpiMoney(item.estimatedValue), item.currency)}</p>
                    {item.currency !== preferredCurrency ? <p className="text-xs font-medium text-slate-400">Nativo: {formatSalesCurrencyAmount(parseSalesKpiMoney(item.estimatedValue), item.currency)}</p> : null}
                  </td>
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
