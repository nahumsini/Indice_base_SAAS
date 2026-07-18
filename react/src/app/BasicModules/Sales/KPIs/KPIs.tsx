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
import { useCurrencyAwareMoney } from '../../shared/useCurrencyAwareMoney';
import { useSalesCrm } from '../salesCrmContext';
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
  const { formatPreferred, preferredCurrency, rateContext, summarize } = useCurrencyAwareMoney();
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
  const paginatedOpportunities = filteredOpportunities.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [setPage, totalPages]);

  const salesSummary = summarize(filteredSources.sales.map((sale) => ({
    amount: sale.totalAmount,
    currency: sale.currency,
  })));
  const commissionSummary = summarize(filteredSources.sales.map((sale) => ({
    amount: sale.commissionAmount || 0,
    currency: sale.currency,
  })));
  const pipelineSummary = summarize(filteredOpportunities
    .filter((opportunity) => opportunity.status !== 'Closed')
    .map((opportunity) => ({
      amount: parseSalesKpiMoney(opportunity.estimatedValue),
      currency: opportunity.currency ?? preferredCurrency,
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

  const funnelChart = useMemo(() => [
    { label: copy.cards.activeProspects.label, value: kpis.activeProspects },
    { label: copy.cards.quotes.label, value: kpis.totalQuotes },
    { label: copy.cards.quoteApproval.label, value: kpis.approvedQuotes + kpis.closedWonQuotes },
    { label: copy.sellerTable.columns.closed, value: kpis.totalSales },
  ], [copy, kpis]);
  const salesTrend = useMemo(() => {
    const monthTotals = new Map<string, Array<{ amount: number; currency: string }>>();
    filteredSources.sales.forEach((sale) => {
      const month = sale.saleDate.slice(0, 7);
      const entries = monthTotals.get(month) ?? [];
      entries.push({ amount: sale.totalAmount, currency: sale.currency });
      monthTotals.set(month, entries);
    });

    return Array.from(monthTotals.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-6)
      .map(([label, values]) => ({ label, value: summarize(values).preferredTotal }));
  }, [filteredSources.sales, summarize]);
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
      value: salesSummary.preferredTotalLabel,
    },
    {
      detail: copy.cards.pipeline.detail(kpis.activeProspects),
      icon: Target,
      label: copy.cards.pipeline.label,
      tone: 'coral',
      value: pipelineSummary.preferredTotalLabel,
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
      value: formatPreferred(kpis.totalSales > 0 ? salesSummary.preferredTotal / kpis.totalSales : 0, preferredCurrency),
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
      value: commissionSummary.preferredTotalLabel,
    },
    {
      detail: copy.cards.contacts.detail(kpis.activeCustomers),
      icon: UsersRound,
      label: copy.cards.contacts.label,
      tone: kpis.activeCustomers > 0 ? 'green' : 'yellow',
      value: String(kpis.totalContacts),
    },
  ], [commissionSummary.preferredTotalLabel, copy.cards, formatPreferred, kpis, pipelineSummary.preferredTotalLabel, preferredCurrency, salesSummary.preferredTotal, salesSummary.preferredTotalLabel]);

  const totalRecords =
    filteredSources.sales.length +
    filteredSources.quotes.length +
    filteredSources.opportunities.length +
    filteredSources.contacts.length;

  return (
    <div className="space-y-5">
      <SalesKpiTitleBar copy={copy} />

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
        nativeBreakdown={salesSummary.nativeBreakdown}
        preferredCurrency={preferredCurrency}
        rateDate={rateContext.effectiveDate}
        rateLabel={rateContext.label}
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
        formatPreferred={formatPreferred}
        items={paginatedOpportunities}
        page={page}
        pageSize={pageSize}
        preferredCurrency={preferredCurrency}
        totalItems={filteredOpportunities.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
