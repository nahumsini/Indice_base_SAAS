import { printStandardDocumentHtml } from '../../shared/print/standardDocumentHtml';
import type { StandardDocumentTable } from '../../shared/print/standardDocumentPdf';
import { BudgetHealthStatus } from '../types/finance-status.types';
import type { FinancialOverviewCostDriverType, FinancialOverviewDataSet } from '../types/financial-overview.types';
import type { FinanceLocale, FinanceTranslations } from '../translations';
import type { CompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import { formatKpiCurrency, formatKpiPercent } from './kpiUtils';

interface FinancialOverviewPdfContext {
  companyIdentity: CompanyPrintIdentity;
  copy: FinanceTranslations;
  locale: FinanceLocale;
  overview: FinancialOverviewDataSet;
  periodLabel: string;
  scopeNotes?: string;
  workspaceTables?: Array<{ title: string; columns: string[]; rows: string[][] }>;
}


const pdfLabels = (locale: FinanceLocale) => {
  if (locale.toLowerCase().startsWith('es')) {
    return {
      amount: 'Importe',
      count: 'Registros',
      health: 'Salud',
      metric: 'Metrica',
      name: 'Nombre',
      recommendation: 'Recomendacion',
      source: 'Fuente: Módulo financiero',
      type: 'Tipo',
      value: 'Valor',
      window: 'Ventana',
    };
  }

  return {
    amount: 'Amount',
    count: 'Records',
    health: 'Health',
    metric: 'Metric',
    name: 'Name',
    recommendation: 'Recommendation',
    source: 'Source: Finance module',
    type: 'Type',
    value: 'Value',
    window: 'Window',
  };
};


const healthLabel = (status: BudgetHealthStatus, copy: FinanceTranslations) => {
  if (status === BudgetHealthStatus.EXCEEDED) return copy.kpis.healthLabels.exceeded;
  if (status === BudgetHealthStatus.WARNING) return copy.kpis.healthLabels.warning;
  return copy.kpis.healthLabels.onTrack;
};

const driverLabel = (
  type: FinancialOverviewCostDriverType,
  copy: FinanceTranslations,
) => ({
  ACCOUNTING_ACCOUNT: copy.kpis.costDrivers.accountingAccounts,
  BUSINESS: copy.kpis.costDrivers.businesses,
  PAYMENT_ACCOUNT: copy.kpis.costDrivers.paymentAccounts,
  PROVIDER: copy.kpis.costDrivers.providers,
  UNIT: copy.kpis.costDrivers.units,
}[type]);


export async function downloadFinancialOverviewPdf({
  companyIdentity,
  copy,
  locale,
  overview,
  periodLabel,
  scopeNotes,
  workspaceTables = [],
}: FinancialOverviewPdfContext) {
  const { currency, metrics } = overview;
  const labels = pdfLabels(locale);
  const tables: StandardDocumentTable[] = [];
  const addTable = (title: string, columns: string[], rows: string[][]) => { tables.push({ title, columns, rows }); };
  if (scopeNotes) addTable(copy.kpis.financialSummary, [labels.source], [[scopeNotes]]);
  for (const table of workspaceTables) addTable(table.title, table.columns, table.rows);
  addTable(copy.kpis.financialSummary, [labels.metric, labels.value], [
    [copy.kpis.planned, formatKpiCurrency(metrics.planned, currency, locale)],
    [copy.kpis.committed, formatKpiCurrency(metrics.committed, currency, locale)],
    [copy.kpis.actual, formatKpiCurrency(metrics.actual, currency, locale)],
    [copy.kpis.available, formatKpiCurrency(metrics.available, currency, locale)],
    [copy.kpis.pending, formatKpiCurrency(metrics.pendingPayments, currency, locale)],
    [copy.kpis.overdue, formatKpiCurrency(metrics.overdueAmount, currency, locale)],
    [copy.kpis.records, String(metrics.expenseCount + metrics.budgetLineCount)],
  ]);

  addTable(copy.kpis.cashRequirements, [labels.window, labels.amount, labels.count], overview.cashRequirements.map(item => [
    copy.kpis.cashRequirementCopy[item.id]?.label ?? item.label,
    formatKpiCurrency(item.amount, currency, locale),
    String(item.count),
  ]));

  addTable(copy.kpis.budgetHealth, [
    copy.kpis.budgetLine,
    copy.kpis.planned,
    copy.kpis.committed,
    copy.kpis.actual,
    copy.kpis.available,
    copy.kpis.consumption,
    labels.health,
  ], overview.budgetHealthRows.map(row => [
    row.name,
    formatKpiCurrency(row.planned, currency, locale),
    formatKpiCurrency(row.committed, currency, locale),
    formatKpiCurrency(row.actual, currency, locale),
    formatKpiCurrency(row.available, currency, locale),
    formatKpiPercent(row.usagePercent),
    healthLabel(row.healthStatus, copy),
  ]));

  addTable(copy.kpis.concentrationRisk, [labels.type, labels.name, 'Total', '%'], overview.concentrationRisks.map(risk => [
    driverLabel(risk.driverType, copy),
    risk.name,
    formatKpiCurrency(risk.total, currency, locale),
    formatKpiPercent(risk.percentage),
  ]));

  Object.entries(overview.costDrivers).forEach(([type, drivers]) => {
    addTable(driverLabel(type as FinancialOverviewCostDriverType, copy), [
      labels.name,
      'Total',
      '%',
      copy.kpis.records,
    ], drivers.map(driver => [
      driver.name,
      formatKpiCurrency(driver.total, currency, locale),
      formatKpiPercent(driver.percentage),
      String(driver.count),
    ]));
  });


  return printStandardDocumentHtml({
    contract: { category: 'executive-report', modifiers: ['internal', 'multi-currency'], pageSize: 'a4', orientation: 'portrait', version: '1.0' },
    fileName: { documentType: copy.kpis.pdfFileName, companyName: companyIdentity.name },
    title: copy.kpis.headerTitle, issuer: companyIdentity.name, logoUrl: companyIdentity.logoUrl, locale,
    subtitle: [periodLabel, currency, overview.generatedAt].filter(Boolean).join(' · '),
    tables,
    sections: overview.alerts.map(alert => ({ title: alert.title, paragraphs: [alert.message, alert.recommendation] })),
  });
}
