import { useEffect, useMemo } from 'react';
import {
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Target,
  UsersRound,
} from 'lucide-react';
import { useKpiMonetaryAggregate, useKpiMonetaryAggregates, type KpiMonetaryBatchQuery } from '../../shared/kpiMonetaryApi';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { useCompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { printStandardKpiReport } from '../../shared/print/standardKpiPrintReport';
import { useLanguage } from '../../../shared/context';
import { useSalesCrm } from '../salesCrmContext';
import { getOpportunityNativePipelineTotals } from '../Prospectos/utils/prospectosPipeline';
import {
  filterSalesKpiSources,
  getSalesKpiMetrics,
  getSalesKpiOptions,
  getSellerRanking,
  parseSalesKpiMoney,
  type SalesKpiDataSources,
} from './salesKpiSelectors';
import { SalesKpiCardItem, SalesKpiGrid } from './components/SalesKpiCard';
import { SalesKpiCharts } from './components/SalesKpiCharts';
import { SalesKpiContextStrip } from './components/SalesKpiContextStrip';
import { SalesKpiFilters } from './components/SalesKpiFilters';
import { SalesKpiSignals } from './components/SalesKpiSignals';
import { SalesKpiTitleBar } from './components/SalesKpiTitleBar';
import { SalesProspectsPerformanceTable } from './components/SalesProspectsPerformanceTable';
import { SalesSellerRanking } from './components/SalesSellerRanking';
import { useSalesKpiFilters } from './hooks/useSalesKpiFilters';
import { useSalesKpisTranslations } from './hooks/useSalesKpisTranslations';

const percent = (value: number) => `${Math.round(value)}%`;

export default function KPIs() {
  const { contacts, opportunities, quotes, salesRecords } = useSalesCrm();
  const copy = useSalesKpisTranslations();
  const { currentLanguage } = useLanguage();
  const { identity: companyPrintIdentity, isReady: isCompanyPrintIdentityReady } = useCompanyPrintIdentity();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const formatMoney = (amount: number, currency = preferredCurrency) => new Intl.NumberFormat(currentLanguage.code, {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(amount);
  const {
    businessFilter,
    businessUnitFilter,
    page,
    pageSize,
    search,
    sellerFilter,
    setBusinessFilter,
    setBusinessUnitFilter,
    setPage,
    setPageSize,
    setSearch,
    setSellerFilter,
  } = useSalesKpiFilters();

  const sources = useMemo<SalesKpiDataSources>(() => ({
    contacts,
    opportunities,
    quotes,
    sales: salesRecords,
  }), [contacts, opportunities, quotes, salesRecords]);

  const options = useMemo(() => getSalesKpiOptions(sources), [sources]);
  const filteredSources = useMemo(() => filterSalesKpiSources(sources, {
    business: businessFilter,
    businessUnit: businessUnitFilter,
    search,
    seller: sellerFilter,
  }), [businessFilter, businessUnitFilter, search, sellerFilter, sources]);
  const kpis = useMemo(() => getSalesKpiMetrics(filteredSources), [filteredSources]);
  const sellerRanking = useMemo(() => getSellerRanking(filteredSources), [filteredSources]);
  const filteredOpportunities = filteredSources.opportunities;
  const totalPages = Math.max(1, Math.ceil(filteredOpportunities.length / pageSize));
  const salesAggregate = useKpiMonetaryAggregate({
    metric: 'SALES_TOTAL',
    preferredCurrency,
    ids: filteredSources.sales.map((sale) => sale.backendId ?? sale.id),
  });
  const commissionAggregate = useKpiMonetaryAggregate({
    metric: 'SALES_COMMISSION',
    preferredCurrency,
    ids: filteredSources.sales.map((sale) => sale.backendId ?? sale.id),
  });
  const pipelineAggregate = useKpiMonetaryAggregate({
    metric: 'SALES_OPPORTUNITY_PIPELINE',
    preferredCurrency,
    ids: filteredOpportunities.filter((opportunity) => !['Won', 'Lost'].includes(opportunity.stage)).map((opportunity) => opportunity.backendId ?? opportunity.id),
  });
  const groupedQueries = useMemo<KpiMonetaryBatchQuery[]>(() => {
    const queries: KpiMonetaryBatchQuery[] = [];
    sellerRanking.forEach((row, index) => {
      queries.push({
        key: `seller-sales-${index}`,
        metric: 'SALES_TOTAL',
        preferredCurrency,
        ids: filteredSources.sales.filter((sale) => sale.sellerName === row.seller).map((sale) => sale.backendId ?? sale.id),
      });
      queries.push({
        key: `seller-pipeline-${index}`,
        metric: 'SALES_OPPORTUNITY_PIPELINE',
        preferredCurrency,
        ids: filteredOpportunities.filter((opportunity) => opportunity.owner === row.seller && !['Won', 'Lost'].includes(opportunity.stage)).map((opportunity) => opportunity.backendId ?? opportunity.id),
      });
    });
    const months = Array.from(new Set(filteredSources.sales.map((sale) => sale.saleDate.slice(0, 7)))).sort().slice(-6);
    months.forEach((month) => queries.push({
      key: `month-${month}`,
      metric: 'SALES_TOTAL',
      preferredCurrency,
      ids: filteredSources.sales.filter((sale) => sale.saleDate.startsWith(month)).map((sale) => sale.backendId ?? sale.id),
    }));
    return queries;
  }, [filteredOpportunities, filteredSources.sales, preferredCurrency, sellerRanking]);
  const groupedAggregates = useKpiMonetaryAggregates(groupedQueries);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [setPage, totalPages]);

  const aggregateLabel = (aggregate: typeof salesAggregate) => aggregate.data && !aggregate.loading
    ? formatMoney(aggregate.data.preferredTotal)
    : '—';
  const salesTotal = salesAggregate.data?.preferredTotal ?? 0;

  const sellerMoney = useMemo(() => new Map(sellerRanking.map((row, index) => {
    const pipelineValue = groupedAggregates.data[`seller-pipeline-${index}`]?.preferredTotal ?? 0;
    const salesValue = groupedAggregates.data[`seller-sales-${index}`]?.preferredTotal ?? 0;

    return [row.seller, {
      pipeline: groupedAggregates.loading ? '—' : formatMoney(pipelineValue),
      pipelineValue,
      sales: groupedAggregates.loading ? '—' : formatMoney(salesValue),
      salesValue,
    }];
  })), [groupedAggregates.data, groupedAggregates.loading, preferredCurrency, sellerRanking]);

  const funnelChart = useMemo(() => [
    { label: copy.cards.activeProspects.label, value: kpis.activeProspects },
    { label: copy.cards.quotes.label, value: kpis.totalQuotes },
    { label: copy.cards.quoteApproval.label, value: kpis.approvedQuotes + kpis.closedWonQuotes },
    { label: copy.sellerTable.columns.closed, value: kpis.totalSales },
  ], [copy, kpis]);
  const salesTrend = useMemo(() => {
    const months = Array.from(new Set(filteredSources.sales.map((sale) => sale.saleDate.slice(0, 7)))).sort().slice(-6);
    return months.map((label) => ({ label, value: groupedAggregates.data[`month-${label}`]?.preferredTotal ?? 0 }));
  }, [filteredSources.sales, groupedAggregates.data]);
  const sellerComparison = useMemo(() => sellerRanking.slice(0, 5).map((row) => ({
    label: row.seller.split(' ')[0] || row.seller,
    quotes: row.quotes,
    wins: row.closed,
  })), [sellerRanking]);

  const kpiCards = useMemo<SalesKpiCardItem[]>(() => [
    {
      detail: copy.cards.salesRevenue.detail(kpis.totalSales),
      icon: CircleDollarSign,
      label: copy.cards.salesRevenue.label,
      tone: 'green',
      value: aggregateLabel(salesAggregate),
    },
    {
      detail: copy.cards.pipeline.detail(kpis.activeProspects),
      icon: Target,
      label: copy.cards.pipeline.label,
      tone: 'coral',
      value: aggregateLabel(pipelineAggregate),
    },
    {
      detail: copy.cards.quoteConversion.detail(kpis.totalQuotes),
      icon: CheckCircle2,
      label: copy.cards.quoteConversion.label,
      tone: kpis.quoteConversionRate < 25 ? 'red' : 'blue',
      value: percent(kpis.quoteConversionRate),
    },
    {
      detail: copy.cards.averageTicket.detail,
      icon: BriefcaseBusiness,
      label: copy.cards.averageTicket.label,
      tone: 'blue',
      value: formatMoney(kpis.totalSales > 0 ? salesTotal / kpis.totalSales : 0),
    },
    {
      detail: copy.cards.quotes.detail(kpis.approvedQuotes + kpis.closedWonQuotes),
      icon: FileText,
      label: copy.cards.quotes.label,
      tone: 'yellow',
      value: String(kpis.totalQuotes),
    },
    {
      detail: copy.cards.commercialRisk.detail(kpis.overdueProspects + kpis.pendingFollowUpProspects),
      icon: ClipboardList,
      label: copy.cards.commercialRisk.label,
      tone: kpis.commercialRisk ? 'red' : 'green',
      value: String(kpis.commercialRisk),
    },
    {
      detail: copy.cards.commissions.detail,
      icon: UsersRound,
      label: copy.cards.commissions.label,
      tone: 'blue',
      value: aggregateLabel(commissionAggregate),
    },
    {
      detail: copy.cards.contacts.detail(kpis.activeCustomers),
      icon: UsersRound,
      label: copy.cards.contacts.label,
      tone: kpis.activeCustomers > 0 ? 'green' : 'yellow',
      value: String(kpis.totalContacts),
    },
  ], [commissionAggregate.data, commissionAggregate.loading, copy.cards, kpis, pipelineAggregate.data, pipelineAggregate.loading, preferredCurrency, salesAggregate.data, salesAggregate.loading, salesTotal]);

  const totalRecords =
    filteredSources.sales.length +
    filteredSources.quotes.length +
    filteredSources.opportunities.length +
    filteredSources.contacts.length;

  const handlePrintReport = () => {
    const unitLabel = businessUnitFilter === 'all'
      ? copy.filters.allUnits
      : options.businessUnits.find((item) => item.id === businessUnitFilter)?.name ?? businessUnitFilter;
    const businessLabel = businessFilter === 'all'
      ? copy.filters.allBusinesses
      : options.businesses.find((item) => item.id === businessFilter)?.name ?? businessFilter;
    const sellerLabel = sellerFilter === 'all' ? copy.filters.allSellers : sellerFilter;

    printStandardKpiReport({
      charts: [
        {
          rows: funnelChart.map((row) => ({ ...row, valueLabel: String(row.value) })),
          title: copy.cards.activeProspects.label,
        },
        {
          rows: salesTrend.map((row) => ({
            ...row,
            valueLabel: formatMoney(row.value),
          })),
          title: copy.cards.salesRevenue.label,
        },
      ],
      companyIdentity: companyPrintIdentity,
      documentName: copy.header.title,
      locale: currentLanguage.code,
      meta: [
        { label: copy.filters.unit, value: unitLabel },
        { label: copy.filters.business, value: businessLabel },
        { label: copy.filters.seller, value: sellerLabel },
        { label: copy.filters.search, value: search.trim() || '-' },
        { label: copy.context.preferredCurrency, value: preferredCurrency },
        { label: copy.context.records, value: String(totalRecords) },
      ],
      metrics: kpiCards.map((card) => ({
        detail: card.detail,
        label: card.label,
        value: card.value,
      })),
      reportTitle: copy.header.title,
      subtitle: copy.header.subtitle,
      tables: [
        {
          emptyLabel: '-',
          headers: [
            copy.sellerTable.columns.rank,
            copy.sellerTable.columns.seller,
            copy.sellerTable.columns.sales,
            copy.sellerTable.columns.pipeline,
            copy.sellerTable.columns.quotes,
            copy.sellerTable.columns.closed,
            copy.sellerTable.columns.conversion,
          ],
          rows: sellerRanking.map((row, index) => [
            String(index + 1),
            row.seller,
            sellerMoney.get(row.seller)?.sales ?? '-',
            sellerMoney.get(row.seller)?.pipeline ?? '-',
            String(row.quotes),
            String(row.closed),
            percent(row.conversion),
          ]),
          title: copy.sellerTable.title,
        },
        {
          emptyLabel: '-',
          headers: [
            copy.prospectsTable.columns.prospect,
            copy.prospectsTable.columns.customer,
            copy.prospectsTable.columns.stage,
            copy.prospectsTable.columns.owner,
            copy.prospectsTable.columns.value,
            copy.prospectsTable.columns.nextAction,
            copy.prospectsTable.columns.status,
          ],
          rows: filteredOpportunities.map((item) => [
            item.opportunityName,
            item.company,
            item.stage,
            item.owner,
            getOpportunityNativePipelineTotals(item, quotes).totalLabel,
            `${item.nextAction} · ${item.nextActionDate}`,
            item.status,
          ]),
          title: copy.prospectsTable.title,
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <SalesKpiTitleBar copy={copy} disabled={!isCompanyPrintIdentityReady} onPrint={handlePrintReport} />

      <SalesKpiFilters
        businessFilter={businessFilter}
        businessUnitFilter={businessUnitFilter}
        businesses={options.businesses}
        copy={copy}
        search={search}
        sellerFilter={sellerFilter}
        sellers={options.sellers}
        units={options.businessUnits}
        onBusinessChange={setBusinessFilter}
        onBusinessUnitChange={setBusinessUnitFilter}
        onSearchChange={setSearch}
        onSellerChange={setSellerFilter}
      />

      <SalesKpiContextStrip
        copy={copy}
        nativeBreakdown={salesAggregate.data?.nativeTotals.map(({ amount, currency }) => formatMoney(amount, currency)).join(' / ') ?? '—'}
        preferredCurrency={preferredCurrency}
        rateDate={salesAggregate.data?.exchangeRate.effectiveDate ?? ''}
        rateLabel={salesAggregate.data?.exchangeRate.mode === 'configured' ? 'Tasa configurada' : 'Tasa diaria'}
        recordCount={totalRecords}
      />

      <SalesKpiGrid items={kpiCards} />

      <SalesKpiCharts
        copy={copy}
        funnel={funnelChart}
        sellerComparison={sellerComparison}
        trend={salesTrend}
      />

      <SalesKpiSignals
        activeCustomers={kpis.activeCustomers}
        commercialRisk={kpis.commercialRisk}
        copy={copy}
        quoteApprovalRate={kpis.quoteApprovalRate}
        quoteConversionRate={kpis.quoteConversionRate}
        quoteRejectionRate={kpis.quoteRejectionRate}
        totalContacts={kpis.totalContacts}
      />

      <SalesSellerRanking copy={copy} rows={sellerRanking} sellerMoney={sellerMoney} />

      <SalesProspectsPerformanceTable
        copy={copy}
        items={filteredOpportunities}
        quotes={quotes}
        page={page}
        pageSize={pageSize}
        totalItems={filteredOpportunities.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
