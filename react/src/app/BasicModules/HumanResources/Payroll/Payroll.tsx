import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  CreditCard,
  Download,
  Globe2,
  Info,
  Landmark,
  LoaderCircle,
  MapPinned,
  PlayCircle,
  Printer,
  Save,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { ApiClientError, buildApiUrl } from '../../../lib/apiClient';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import {
  humanResourcesApi,
  type HrUserDetailsResponse,
  type PayrollLineItem,
  type PayrollManualItemPayload,
  type PayrollOverviewResponse,
  type PayrollPreferences,
  type PayrollRunDetailResponse,
  type PayrollRunLine,
  type PayrollRunSummary,
} from '../../../api/humanResources';
import { useLanguage } from '../../../shared/context';
import { usePayrollTranslations } from './hooks/usePayrollTranslations';
import type { PayrollTranslations } from './translations';
import {
  PayrollRunPrintPortal,
} from './PayrollRunPrintPortal';
import type { PayrollRunPdfDocumentProps } from './PayrollRunPdfDocument';
import { SelectField, DateField } from './components/PayrollFormFields';
import { DetailMetric } from './components/DetailMetric';
import { PayrollHeaderBar } from './components/PayrollHeaderBar';
import { PayrollOperationsPanel } from './components/PayrollOperationsPanel';
import { PayrollRunActionsMenu } from './components/PayrollRunActionsMenu';
import { PayrollSetupGuide } from './components/PayrollSetupGuide';
import {
  payrollBreakdownConfigByJurisdiction,
  payrollDetailedColumnsByJurisdiction,
  payrollEmployerSummaryConfigByJurisdiction,
  payrollSimplifiedColumnsByJurisdiction,
  payrollStatutoryColumnKeysByJurisdiction,
} from './config/payrollColumns';
import { QUEBEC_PROVINCE_NAME } from './config/payrollJurisdictions';
import { VariablePayModal, type VariablePayItem } from './modules/payroll/components/VariablePayModal';
import type {
  PayrollDetailedColumnKey,
  PayrollEditTableColumnKey,
  PayrollEmployerSummaryMetricKey,
  PayrollJurisdiction,
} from './types/payrollJurisdiction';
import {
  filterPayrollItemsByJurisdiction,
  groupPayrollEntitiesByJurisdiction,
  resolveJurisdictionProvinceLabel,
  resolveRunJurisdiction,
} from './utils/payrollGrouping';
import {
  formatPayrollJurisdictionLabel,
  parseUnsupportedPayrollCountryLabel,
  parsePayrollJurisdictionLabel,
  resolvePayrollJurisdiction,
  resolvePayrollJurisdictionCountry,
} from './utils/resolvePayrollJurisdiction';

const PAYROLL_PRINT_REPORT_ID_PREFIX = 'IDX-PR';
const payrollRateFieldKeys = [
  'isr_rate',
  'imss_user_rate',
  'infonavit_user_rate',
  'imss_employer_rate',
  'infonavit_employer_rate',
  'sar_employer_rate',
] as const;
const payrollRateProfileKeys = [
  'mexico',
  'canada',
  'usa',
  'colombia',
  'brazil',
  'custom',
] as const;

type PayrollRateFieldKey = (typeof payrollRateFieldKeys)[number];
type PayrollRateProfileKey = (typeof payrollRateProfileKeys)[number];
type PayrollRateEditorMode = 'preset' | 'advanced';
type PayrollRateValues = Pick<PayrollPreferences, PayrollRateFieldKey>;
type PayrollRateDrafts = Record<PayrollRateProfileKey, PayrollRateValues>;

type PayrollCopy = PayrollTranslations;

const pickPayrollRateValues = (preferences: PayrollPreferences): PayrollRateValues => ({
  isr_rate: preferences.isr_rate,
  imss_user_rate: preferences.imss_user_rate,
  infonavit_user_rate: preferences.infonavit_user_rate,
  imss_employer_rate: preferences.imss_employer_rate,
  infonavit_employer_rate: preferences.infonavit_employer_rate,
  sar_employer_rate: preferences.sar_employer_rate,
});

const applyPayrollRateValues = (
  preferences: PayrollPreferences,
  rates: PayrollRateValues,
): PayrollPreferences => ({
  ...preferences,
  ...rates,
});

const createPayrollRateDrafts = (preferences: PayrollPreferences): PayrollRateDrafts => {
  const baseRates = pickPayrollRateValues(preferences);

  return payrollRateProfileKeys.reduce((drafts, profileKey) => ({
    ...drafts,
    [profileKey]: { ...baseRates },
  }), {} as PayrollRateDrafts);
};

const formatRateInputPercent = (value: number) => {
  const percent = value * 100;
  if (Number.isInteger(percent)) {
    return String(percent);
  }

  return percent.toFixed(2).replace(/\.?0+$/, '');
};

const parseRateInputPercent = (value: string) => {
  const parsed = Number(value.replace(',', '.'));
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, parsed / 100);
};

const defaultPayrollPreferences: PayrollPreferences = {
  grouping_mode: 'single',
  default_daily_hours: 8,
  pay_leave_days: true,
  isr_rate: 0.1,
  imss_user_rate: 0.04,
  infonavit_user_rate: 0.03,
  imss_employer_rate: 0.07,
  infonavit_employer_rate: 0.05,
  sar_employer_rate: 0.02,
};

const payrollRateProfileFlags: Record<PayrollRateProfileKey, string> = {
  mexico: '🇲🇽',
  canada: '🇨🇦',
  usa: '🇺🇸',
  colombia: '🇨🇴',
  brazil: '🇧🇷',
  custom: '⚙️',
};

const formatCurrency = (value: number, locale: string, currency = 'USD') =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const resolvePayrollCurrencyCode = (jurisdictionLabel: string) => {
  const normalizedLabel = jurisdictionLabel.toLowerCase();

  if (normalizedLabel.includes('mexico') || normalizedLabel.includes('méxico')) {
    return 'MXN';
  }
  if (
    normalizedLabel.includes('canada')
    || normalizedLabel.includes('ontario')
    || normalizedLabel.includes('quebec')
    || normalizedLabel.includes('québec')
  ) {
    return 'CAD';
  }
  if (
    normalizedLabel.includes('usa')
    || normalizedLabel.includes('united states')
    || normalizedLabel.includes('florida')
    || normalizedLabel.includes('texas')
  ) {
    return 'USD';
  }
  if (normalizedLabel.includes('colombia')) {
    return 'COP';
  }
  if (normalizedLabel.includes('brazil') || normalizedLabel.includes('brasil')) {
    return 'BRL';
  }

  return 'USD';
};

const formatDate = (value: string, locale: string, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const toErrorMessage = (error: unknown, copy: PayrollCopy) => {
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return copy.notFound;
    }
    if (error.status === 401) {
      return copy.unauthorized;
    }
    return error.message || copy.genericError;
  }
  return error instanceof Error ? error.message : copy.genericError;
};

type PayrollBusyKind =
  | 'refresh'
  | 'open-run'
  | 'save-preferences'
  | 'generate-runs'
  | 'save-line'
  | 'process-run'
  | 'approve-run'
  | 'mark-paid'
  | 'cancel-run'
  | 'download-csv'
  | 'download-pdf';

type PayrollBusyState = {
  kind: PayrollBusyKind;
  title: string;
  description: string;
};

type PayrollDialogNotice = {
  tone: 'success' | 'error';
  message: string;
};

type PayrollRunEditForm = {
  status: PayrollRunSummary['status'];
  employeesCount: string;
  netAmount: string;
  jurisdiction: string;
};

type PayrollEditTableRow = {
  id: number | string;
  jurisdiction: PayrollJurisdiction;
  statutoryPayroll: boolean;
  payrollMode: 'Statutory' | 'Internal only' | 'Pending setup';
  employee: string;
  unit: string;
  business: string;
  employmentType: PayrollDetailedRow['employmentType'];
  province: string;
  daysWorked: number;
  daysAbsent: number;
  periodSalary: number;
  transportAllowance: number;
  variablePayTotal: number;
  variablePayItems: VariablePayItem[];
  grossPay: number;
  internalDeductions: number;
  statutoryDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: 'Processed' | 'Draft' | 'Review' | 'Internal only';
};

type PayrollEditableAttendanceField =
  | 'daysWorked'
  | 'daysAbsent'
  | 'daysPaid'
  | 'overtimeHours'
  | 'vacationDays'
  | 'paidHolidays';

type PayrollDetailedRow = {
  id: number | string;
  jurisdiction: PayrollJurisdiction;
  country: string;
  province: string;
  employee: string;
  rfc: string;
  curp: string;
  nss: string;
  sin: string;
  cpf: string;
  pisPasep: string;
  idNumber: string;
  contractType: 'Indefinite' | 'Fixed-term' | 'Service contract' | 'Apprenticeship';
  unit: string;
  business: string;
  statutoryPayroll: boolean;
  payrollMode: 'Statutory' | 'Internal only' | 'Pending setup';
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'CLT' | 'Contractor' | 'Intern' | 'Temporary' | 'Apprentice';
  payType: 'Hourly' | 'Salary' | 'Monthly';
  hourlyRate: number;
  monthlySalary: number;
  contributionType: 'Fixed' | 'Variable' | 'Mixed';
  dailyWage: number;
  integratedDailyWage: number;
  baseContributionSalary: number;
  daysPaid: number;
  totalWorkedHours: number;
  hoursPerDay: number;
  overtimeHours: number;
  nightSurcharge: number;
  sundayHolidaySurcharge: number;
  nightShiftPremium: number;
  hazardUnhealthyPremium: number;
  periodSalary: number;
  overtimeAmount: number;
  transportAllowance: number;
  variablePayTotal: number;
  bonusesCommissions: number;
  vacationPay: number;
  vacationBonusOneThird: number;
  vacationPremium: number;
  thirteenthSalaryProvision: number;
  taxableBenefits: number;
  proportionalChristmasBonus: number;
  grossPay: number;
  totalEarnings: number;
  federalTax: number;
  provincialTax: number;
  quebecProvincialTax: number;
  isrBeforeSubsidy: number;
  employmentSubsidy: number;
  finalIsr: number;
  employeeImss: number;
  employeeCpp: number;
  employeeCpp2: number;
  employeeEi: number;
  employeeQpp: number;
  employeeQpp2: number;
  employeeQpip: number;
  employeeHealth: number;
  employeePension: number;
  withholdingTax: number;
  employeeInss: number;
  irrf: number;
  transportationVoucher: number;
  mealBenefitsDeduction: number;
  infonavitType: 'Percentage' | 'VSM' | 'Fixed Amount' | 'None';
  infonavitDiscount: number;
  otherDeductions: number;
  loans: number;
  otherDiscounts: number;
  netAdjustment: number;
  totalDeductions: number;
  netPay: number;
  employerImss: number;
  employerInfonavit: number;
  sar: number;
  payrollStateTax: number;
  occupationalRisk: number;
  childcareImss: number;
  employerCpp: number;
  employerCpp2: number;
  employerEi: number;
  employerBenefits: number;
  employerQpp: number;
  employerQpp2: number;
  employerQpip: number;
  employerHealth: number;
  employerPension: number;
  arl: number;
  severance: number;
  severanceInterest: number;
  serviceBonus: number;
  vacationProvision: number;
  familyCompensationFund: number;
  icbf: number;
  sena: number;
  employerInss: number;
  fgts: number;
  ratWorkAccident: number;
  thirdPartyContributions: number;
  totalEmployerObligations: number;
  totalPayrollCost: number;
};

type PayrollRow = PayrollDetailedRow & {
  periodStartDate: string;
  periodEndDate: string;
};

type ImssBreakdownRow = {
  concept: string;
  employer: number;
  employee: number;
};

type PayrollEmployerSummary = Record<PayrollEmployerSummaryMetricKey, number>;

type PayrollBreakdownModalProps = {
  isOpen: boolean;
  onClose: () => void;
  employee: PayrollRow | null;
  copy: PayrollCopy['breakdown'];
};

const roundPayrollMoney = (value: number) => Math.round(value * 100) / 100;

function getEffectivePayrollValues<T extends PayrollDetailedRow | PayrollRow>(row: T): T {
  if (!row.statutoryPayroll) {
    const internalDeductions = roundPayrollMoney(
      row.otherDeductions || row.loans + row.otherDiscounts + row.netAdjustment,
    );
    const grossPay = roundPayrollMoney(row.grossPay || row.totalEarnings);
    const internalNetPay = roundPayrollMoney(grossPay - internalDeductions);

    return {
      ...row,
      federalTax: 0,
      provincialTax: 0,
      quebecProvincialTax: 0,
      isrBeforeSubsidy: 0,
      employmentSubsidy: 0,
      finalIsr: 0,
      employeeImss: 0,
      employeeCpp: 0,
      employeeCpp2: 0,
      employeeEi: 0,
      employeeQpp: 0,
      employeeQpp2: 0,
      employeeQpip: 0,
      employeeHealth: 0,
      employeePension: 0,
      withholdingTax: 0,
      employeeInss: 0,
      irrf: 0,
      transportationVoucher: 0,
      mealBenefitsDeduction: 0,
      infonavitDiscount: 0,
      employerImss: 0,
      employerInfonavit: 0,
      sar: 0,
      payrollStateTax: 0,
      occupationalRisk: 0,
      childcareImss: 0,
      employerCpp: 0,
      employerCpp2: 0,
      employerEi: 0,
      employerBenefits: 0,
      employerQpp: 0,
      employerQpp2: 0,
      employerQpip: 0,
      employerHealth: 0,
      employerPension: 0,
      arl: 0,
      severance: 0,
      severanceInterest: 0,
      serviceBonus: 0,
      vacationProvision: 0,
      familyCompensationFund: 0,
      icbf: 0,
      sena: 0,
      employerInss: 0,
      fgts: 0,
      ratWorkAccident: 0,
      thirdPartyContributions: 0,
      totalEmployerObligations: 0,
      otherDeductions: internalDeductions,
      totalDeductions: internalDeductions,
      netPay: internalNetPay,
      totalPayrollCost: internalNetPay,
    };
  }

  return row;
}

const createPayrollPrintReportId = (runId: number) => (
  `${PAYROLL_PRINT_REPORT_ID_PREFIX}-${String(runId).padStart(4, '0')}`
);

const emptyEmployerSummary = (): PayrollEmployerSummary => ({
  employerImss: 0,
  employerInfonavit: 0,
  sar: 0,
  payrollStateTax: 0,
  occupationalRisk: 0,
  childcareImss: 0,
  employerCpp: 0,
  employerCpp2: 0,
  employerEi: 0,
  employerBenefits: 0,
  employerQpp: 0,
  employerQpp2: 0,
  employerQpip: 0,
  employerHealth: 0,
  employerPension: 0,
  arl: 0,
  severance: 0,
  severanceInterest: 0,
  serviceBonus: 0,
  vacationProvision: 0,
  familyCompensationFund: 0,
  icbf: 0,
  sena: 0,
  employerInss: 0,
  fgts: 0,
  ratWorkAccident: 0,
  thirdPartyContributions: 0,
  totalEmployerObligations: 0,
  totalPayrollCost: 0,
});

const createEmptyCanadaStatutoryValues = () => ({
  federalTax: 0,
  provincialTax: 0,
  quebecProvincialTax: 0,
  employeeCpp: 0,
  employeeCpp2: 0,
  employeeEi: 0,
  employeeQpp: 0,
  employeeQpp2: 0,
  employeeQpip: 0,
  employerCpp: 0,
  employerCpp2: 0,
  employerEi: 0,
  employerBenefits: 0,
  employerQpp: 0,
  employerQpp2: 0,
  employerQpip: 0,
  totalEmployerObligations: 0,
});

const buildCanadaStandardStatutoryValues = (earningsBase: number) => {
  const federalTax = roundPayrollMoney(earningsBase * 0.12);
  const provincialTax = roundPayrollMoney(earningsBase * 0.0525);
  const employeeCpp = roundPayrollMoney(earningsBase * 0.0595);
  const employeeCpp2 = roundPayrollMoney(earningsBase * 0.01);
  const employeeEi = roundPayrollMoney(earningsBase * 0.0166);
  const employerCpp = roundPayrollMoney(earningsBase * 0.0595);
  const employerCpp2 = roundPayrollMoney(earningsBase * 0.01);
  const employerEi = roundPayrollMoney(earningsBase * 0.02324);
  const employerBenefits = roundPayrollMoney(earningsBase * 0.028);
  const totalEmployerObligations = roundPayrollMoney(
    employerCpp + employerCpp2 + employerEi + employerBenefits,
  );

  return {
    federalTax,
    provincialTax,
    employeeCpp,
    employeeCpp2,
    employeeEi,
    employerCpp,
    employerCpp2,
    employerEi,
    employerBenefits,
    totalEmployerObligations,
  };
};

const buildCanadaQuebecStatutoryValues = (earningsBase: number) => {
  const federalTax = roundPayrollMoney(earningsBase * 0.12);
  const quebecProvincialTax = roundPayrollMoney(earningsBase * 0.054);
  const employeeQpp = roundPayrollMoney(earningsBase * 0.054);
  const employeeQpp2 = roundPayrollMoney(earningsBase * 0.01);
  const employeeQpip = roundPayrollMoney(earningsBase * 0.00494);
  const employeeEi = roundPayrollMoney(earningsBase * 0.0132);
  const employerQpp = roundPayrollMoney(earningsBase * 0.054);
  const employerQpp2 = roundPayrollMoney(earningsBase * 0.01);
  const employerQpip = roundPayrollMoney(earningsBase * 0.00692);
  const employerEi = roundPayrollMoney(earningsBase * 0.01848);
  const employerBenefits = roundPayrollMoney(earningsBase * 0.028);
  const totalEmployerObligations = roundPayrollMoney(
    employerQpp + employerQpp2 + employerQpip + employerEi + employerBenefits,
  );

  return {
    federalTax,
    quebecProvincialTax,
    employeeQpp,
    employeeQpp2,
    employeeQpip,
    employeeEi,
    employerQpp,
    employerQpp2,
    employerQpip,
    employerEi,
    employerBenefits,
    totalEmployerObligations,
  };
};

const buildBrazilStatutoryValues = (earningsBase: number) => {
  const employeeInss = roundPayrollMoney(earningsBase * 0.09);
  const irrf = roundPayrollMoney(earningsBase * 0.075);
  const transportationVoucher = roundPayrollMoney(earningsBase * 0.03);
  const mealBenefitsDeduction = roundPayrollMoney(earningsBase * 0.018);
  const employerInss = roundPayrollMoney(earningsBase * 0.2);
  const fgts = roundPayrollMoney(earningsBase * 0.08);
  const ratWorkAccident = roundPayrollMoney(earningsBase * 0.02);
  const thirdPartyContributions = roundPayrollMoney(earningsBase * 0.058);
  const employerBenefits = roundPayrollMoney(earningsBase * 0.03);
  const totalEmployerObligations = roundPayrollMoney(
    employerInss + fgts + ratWorkAccident + thirdPartyContributions + employerBenefits,
  );

  return {
    employeeInss,
    irrf,
    transportationVoucher,
    mealBenefitsDeduction,
    employerInss,
    fgts,
    ratWorkAccident,
    thirdPartyContributions,
    employerBenefits,
    totalEmployerObligations,
  };
};

const buildUsaStatutoryValues = (earningsBase: number) => {
  const federalTax = roundPayrollMoney(earningsBase * 0.11);
  const provincialTax = roundPayrollMoney(earningsBase * 0.045);
  const employeeCpp = roundPayrollMoney(earningsBase * 0.062);
  const employeeEi = roundPayrollMoney(earningsBase * 0.0145);
  const employerCpp = roundPayrollMoney(earningsBase * 0.062);
  const employerEi = roundPayrollMoney(earningsBase * 0.0145);
  const payrollStateTax = roundPayrollMoney(earningsBase * 0.018);
  const employerBenefits = roundPayrollMoney(earningsBase * 0.03);
  const totalEmployerObligations = roundPayrollMoney(
    employerCpp + employerEi + payrollStateTax + employerBenefits,
  );

  return {
    federalTax,
    provincialTax,
    employeeCpp,
    employeeEi,
    employerCpp,
    employerEi,
    payrollStateTax,
    employerBenefits,
    totalEmployerObligations,
  };
};

const buildColombiaStatutoryValues = (earningsBase: number) => {
  const employeeHealth = roundPayrollMoney(earningsBase * 0.04);
  const employeePension = roundPayrollMoney(earningsBase * 0.04);
  const withholdingTax = roundPayrollMoney(earningsBase * 0.035);
  const employerHealth = roundPayrollMoney(earningsBase * 0.085);
  const employerPension = roundPayrollMoney(earningsBase * 0.12);
  const arl = roundPayrollMoney(earningsBase * 0.00522);
  const severance = roundPayrollMoney(earningsBase * 0.0833);
  const severanceInterest = roundPayrollMoney(earningsBase * 0.01);
  const serviceBonus = roundPayrollMoney(earningsBase * 0.0833);
  const vacationProvision = roundPayrollMoney(earningsBase * 0.0417);
  const familyCompensationFund = roundPayrollMoney(earningsBase * 0.04);
  const icbf = roundPayrollMoney(earningsBase * 0.03);
  const sena = roundPayrollMoney(earningsBase * 0.02);
  const totalEmployerObligations = roundPayrollMoney(
    employerHealth
    + employerPension
    + arl
    + severance
    + severanceInterest
    + serviceBonus
    + vacationProvision
    + familyCompensationFund
    + icbf
    + sena,
  );

  return {
    employeeHealth,
    employeePension,
    withholdingTax,
    employerHealth,
    employerPension,
    arl,
    severance,
    severanceInterest,
    serviceBonus,
    vacationProvision,
    familyCompensationFund,
    icbf,
    sena,
    totalEmployerObligations,
  };
};

const escapePrintHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const printHtmlDocument = ({
  title,
  orientation,
  bodyHtml,
}: {
  title: string;
  orientation: 'portrait' | 'landscape';
  bodyHtml: string;
}) => {
  const htmlDocument = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapePrintHtml(title)}</title>
    <style>
      @page { size: A4 ${orientation}; margin: 10mm; }
      html, body { margin: 0; padding: 0; color: #0f172a; font-family: "Segoe UI", Tahoma, sans-serif; }
      body { padding: 14px; }
      h1, h2, h3, p { margin: 0; }
      .header { margin-bottom: 12px; }
      .header h1 { font-size: 18px; color: #59C3A5; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #475569; margin-bottom: 2px; }
      .badge { display: inline-block; border: 1px solid #cbd5e1; border-radius: 9999px; padding: 2px 8px; font-size: 11px; color: #334155; }
      .section { margin-top: 14px; }
      .section h2 { font-size: 13px; margin-bottom: 8px; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; table-layout: auto; }
      th, td { border: 1px solid #dbe3ee; padding: 6px 8px; font-size: 11px; vertical-align: top; }
      th { background: #eef3fb; color: #0f172a; text-align: left; }
      .num { text-align: right; font-variant-numeric: tabular-nums; }
      .muted { color: #64748b; }
      .note { margin-top: 10px; padding: 8px; border: 1px solid #facc15; background: #fef9c3; color: #854d0e; border-radius: 6px; font-size: 11px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .card { border: 1px solid #dbe3ee; border-radius: 8px; padding: 8px; }
      .card-title { font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .02em; }
      .card-value { font-size: 13px; font-weight: 600; color: #0f172a; }
    </style>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`;

  const blob = new Blob([htmlDocument], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
  };

  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
    setTimeout(cleanup, 30_000);
  }, { once: true });

  // Fallback cleanup if load event is not fired as expected.
  setTimeout(cleanup, 60_000);

  return true;
};

const downloadFile = async (path: string, filename: string) => {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new ApiClientError(response.statusText || 'Request failed', response.status);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(objectUrl);
};

export default function Payroll() {
  const { currentLanguage } = useLanguage();
  const copy = usePayrollTranslations();

  const [overview, setOverview] = useState<PayrollOverviewResponse | null>(null);
  // Seed data for development
  const seedRuns: PayrollRunSummary[] = [
    {
      id: 1,
      period_start_date: '2026-04-01',
      period_end_date: '2026-04-07',
      pay_period: 'weekly',
      grouping_mode: 'single',
      grouping_label: '',
      grouping_key: '',
      users_count: 12,
      gross_amount: 16450,
      deductions_amount: 3340,
      employer_contributions_amount: 2260,
      net_amount: 12000,
      status: 'draft',
    },
    {
      id: 2,
      period_start_date: '2026-04-08',
      period_end_date: '2026-04-14',
      pay_period: 'weekly',
      grouping_mode: 'single',
      grouping_label: '',
      grouping_key: '',
      users_count: 9,
      gross_amount: 13120,
      deductions_amount: 2620,
      employer_contributions_amount: 1980,
      net_amount: 10500,
      status: 'processed',
    },
    {
      id: 3,
      period_start_date: '2026-04-15',
      period_end_date: '2026-04-21',
      pay_period: 'weekly',
      grouping_mode: 'single',
      grouping_label: '',
      grouping_key: '',
      users_count: 15,
      gross_amount: 19840,
      deductions_amount: 4170,
      employer_contributions_amount: 2985,
      net_amount: 15670,
      status: 'approved',
    },
    {
      id: 4,
      period_start_date: '2026-04-01',
      period_end_date: '2026-04-15',
      pay_period: 'biweekly',
      grouping_mode: 'unit',
      grouping_label: 'Sales',
      grouping_key: '1',
      users_count: 8,
      gross_amount: 10490,
      deductions_amount: 1940,
      employer_contributions_amount: 1430,
      net_amount: 8000,
      status: 'draft',
    },
    {
      id: 5,
      period_start_date: '2026-03-16',
      period_end_date: '2026-03-31',
      pay_period: 'biweekly',
      grouping_mode: 'business',
      grouping_label: 'MainCo',
      grouping_key: '2',
      users_count: 15,
      gross_amount: 21400,
      deductions_amount: 3920,
      employer_contributions_amount: 3240,
      net_amount: 15000,
      status: 'processed',
    },
    {
      id: 6,
      period_start_date: '2026-03-01',
      period_end_date: '2026-03-15',
      pay_period: 'biweekly',
      grouping_mode: 'business',
      grouping_label: 'North America',
      grouping_key: '3',
      users_count: 11,
      gross_amount: 16900,
      deductions_amount: 3420,
      employer_contributions_amount: 2480,
      net_amount: 12850,
      status: 'approved',
    },
    {
      id: 7,
      period_start_date: '2026-04-01',
      period_end_date: '2026-04-30',
      pay_period: 'monthly',
      grouping_mode: 'single',
      grouping_label: '',
      grouping_key: '',
      users_count: 19,
      gross_amount: 41800,
      deductions_amount: 8470,
      employer_contributions_amount: 6150,
      net_amount: 33330,
      status: 'paid',
    },
  ];
  const seedJurisdictionsByRunId: Record<number, string> = {
    1: 'Ontario, Canada',
    2: 'Mexico',
    3: 'Colombia',
    4: 'Brazil',
    5: 'Quebec, Canada',
    6: 'Florida, USA',
    7: 'Texas, USA',
  };
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [jurisdictionsByRunId, setJurisdictionsByRunId] = useState<Record<number, string>>({});
  const [units, setUnits] = useState<BackendUnit[]>([]);
  const [businesses, setBusinesses] = useState<BackendBusiness[]>([]);
  const [selectedRunDetail, setSelectedRunDetail] = useState<PayrollRunDetailResponse | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyState, setBusyState] = useState<PayrollBusyState | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isEditRunDialogOpen, setIsEditRunDialogOpen] = useState(false);
  const [isEditRunDetailLoading, setIsEditRunDetailLoading] = useState(false);
  const [editRunDetail, setEditRunDetail] = useState<PayrollRunDetailResponse | null>(null);
  const [editingRun, setEditingRun] = useState<PayrollRunSummary | null>(null);
  const [editRunForm, setEditRunForm] = useState<PayrollRunEditForm | null>(null);
  const [printJob, setPrintJob] = useState<PayrollRunPdfDocumentProps | null>(null);
  const [runDialogNotice, setRunDialogNotice] = useState<PayrollDialogNotice | null>(null);
  const [preferencesForm, setPreferencesForm] = useState<PayrollPreferences>(defaultPayrollPreferences);
  const [filters, setFilters] = useState({
    period_range: 'all_year',
    period_from: '',
    period_to: '',
    pay_period: '',
    grouping_mode: '',
    unit_id: '',
    business_id: '',
    status: '',
  });
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [lineDraft, setLineDraft] = useState<{
    include_in_fiscal: boolean;
    notes: string;
    manual_items: PayrollManualItemPayload[];
  }>({
    include_in_fiscal: true,
    notes: '',
    manual_items: [],
  });

  const isSaving = busyState !== null;
  const activeBusyKind = busyState?.kind ?? null;
  const unitsById = useMemo(
    () => new Map(units.map((unit) => [String(unit.id), unit.name])),
    [units],
  );
  const businessesById = useMemo(
    () => new Map(businesses.map((business) => [String(business.id), business])),
    [businesses],
  );

  const sortedRuns = useMemo(() => {
    if (!sortConfig) {
      return runs;
    }

    const sortedArray = [...runs];
    sortedArray.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortConfig.column) {
        case 'period':
          aValue = new Date(a.period_start_date);
          bValue = new Date(b.period_start_date);
          break;
        case 'frequency':
          aValue = a.pay_period;
          bValue = b.pay_period;
          break;
        case 'payrollType':
          aValue = a.grouping_mode;
          bValue = b.grouping_mode;
          break;
        case 'employees':
          aValue = a.users_count;
          bValue = b.users_count;
          break;
        case 'totalAmount':
          aValue = a.net_amount;
          bValue = b.net_amount;
          break;
        case 'jurisdiction': {
          const aJurisdiction = jurisdictionsByRunId[a.id]?.trim() || (a.grouping_mode === 'single' ? 'Automatic' : 'No jurisdiction');
          const bJurisdiction = jurisdictionsByRunId[b.id]?.trim() || (b.grouping_mode === 'single' ? 'Automatic' : 'No jurisdiction');
          aValue = aJurisdiction;
          bValue = bJurisdiction;
          break;
        }
        case 'unit': {
          let aUnitLabel = '';
          let bUnitLabel = '';

          if (a.grouping_mode === 'unit') {
            aUnitLabel = a.grouping_label || '';
          } else if (a.grouping_mode === 'business' && a.grouping_key && businessesById.has(a.grouping_key)) {
            const matchedBusiness = businessesById.get(a.grouping_key);
            aUnitLabel = matchedBusiness?.unitId ? String(unitsById.get(String(matchedBusiness.unitId)) || '') : '';
          }

          if (b.grouping_mode === 'unit') {
            bUnitLabel = b.grouping_label || '';
          } else if (b.grouping_mode === 'business' && b.grouping_key && businessesById.has(b.grouping_key)) {
            const matchedBusiness = businessesById.get(b.grouping_key);
            bUnitLabel = matchedBusiness?.unitId ? String(unitsById.get(String(matchedBusiness.unitId)) || '') : '';
          }

          aValue = aUnitLabel;
          bValue = bUnitLabel;
          break;
        }
        case 'business': {
          let aBusinessLabel = '';
          let bBusinessLabel = '';

          if (a.grouping_mode === 'business') {
            aBusinessLabel = a.grouping_label || '';
          }

          if (b.grouping_mode === 'business') {
            bBusinessLabel = b.grouping_label || '';
          }

          aValue = aBusinessLabel;
          bValue = bBusinessLabel;
          break;
        }
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortedArray;
  }, [runs, sortConfig, jurisdictionsByRunId, unitsById, businessesById]);

  const handleSortColumn = (column: string) => {
    setSortConfig((prevConfig) => {
      if (prevConfig?.column === column) {
        // Toggle direction if same column
        return {
          column,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      // Set new column with ascending direction
      return { column, direction: 'asc' };
    });
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortConfig?.column !== column) {
      return <span className="ml-1 text-slate-400 dark:text-slate-500">↑↓</span>;
    }
    return sortConfig.direction === 'asc' ? (
      <span className="ml-1 text-slate-600 dark:text-slate-300">↑</span>
    ) : (
      <span className="ml-1 text-slate-600 dark:text-slate-300">↓</span>
    );
  };

  const handleStatusChange = (run: PayrollRunSummary, newStatus: PayrollRunSummary['status']) => {
    if (run.status === newStatus) return;

    setRuns((currentRuns) => currentRuns.map((r) =>
      r.id === run.id ? { ...r, status: newStatus } : r
    ));
  };

  const loadPayroll = async (
    activeFilters = filters,
    options: { background?: boolean } = {},
  ) => {
    if (!options.background) {
      setIsLoading(true);
    }
    setErrorMessage('');

    try {
      const [overviewResponse, runsResponse, unitsResponse, businessesResponse] = await Promise.all([
        humanResourcesApi.getPayrollOverview(),
        humanResourcesApi.listPayrollRuns(activeFilters),
        dashboardApi.listUnits().catch(() => []),
        dashboardApi.listBusinesses().catch(() => []),
      ]);

      setOverview(overviewResponse);
      setPreferencesForm(overviewResponse.preferences);
      const shouldUseSeedRuns = runsResponse.items.length === 0;
      setRuns(shouldUseSeedRuns ? seedRuns : runsResponse.items);
      setJurisdictionsByRunId(shouldUseSeedRuns ? seedJurisdictionsByRunId : {});
      setUnits(unitsResponse);
      setBusinesses(businessesResponse);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    } finally {
      if (!options.background) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadPayroll();
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const selectedLine = useMemo(
    () => selectedRunDetail?.lines.find((line) => line.id === selectedLineId) ?? null,
    [selectedLineId, selectedRunDetail?.lines],
  );

  useEffect(() => {
    if (!selectedLine) {
      return;
    }
    setLineDraft({
      include_in_fiscal: selectedLine.include_in_fiscal,
      notes: selectedLine.notes || '',
      manual_items: selectedLine.items
        .filter((item) => item.source_type === 'manual')
        .map((item) => ({
          category: item.category === 'earning' ? 'earning' : 'deduction',
          label: item.label,
          amount: item.amount,
        })),
    });
  }, [selectedLine]);

  const runBusyTask = async <T,>(
    nextBusyState: PayrollBusyState,
    task: () => Promise<T>,
    minimumDurationMs = 900,
  ) => {
    setBusyState(nextBusyState);
    setErrorMessage('');

    try {
      return await runWithMinimumDuration(task(), minimumDurationMs);
    } finally {
      setBusyState(null);
    }
  };

  const buildPrintJob = (detail: PayrollRunDetailResponse): PayrollRunPdfDocumentProps => ({
    detail,
    preferences: overview?.preferences ?? preferencesForm,
    title: `${copy.title} ${detail.run.grouping_label || copy.groupingModes[detail.run.grouping_mode]}`,
    subtitle: `${copy.labels.payPeriod}: ${formatDate(detail.run.period_start_date, currentLanguage.code, detail.run.period_start_date)} → ${formatDate(detail.run.period_end_date, currentLanguage.code, detail.run.period_end_date)}`,
    generatedAt: new Date(),
    reportId: createPayrollPrintReportId(detail.run.id),
    locale: currentLanguage.code,
    statusLabel: copy.statuses[detail.run.status],
    groupingLabel: detail.run.grouping_label || copy.groupingModes[detail.run.grouping_mode],
    payPeriodLabel: copy.frequencies[detail.run.pay_period],
    copy: copy.pdf,
  });

  const fetchRunDetail = async (runId: number) => {
    const detail = await humanResourcesApi.getPayrollRun(runId);
    setSelectedRunDetail(detail);
    setSelectedLineId((current) => (
      current && detail.lines.some((line) => line.id === current)
        ? current
        : detail.lines[0]?.id ?? null
    ));
    return detail;
  };

  const openRunDetail = async (runId: number) => {
    try {
      setRunDialogNotice(null);
      await runBusyTask({
        kind: 'open-run',
        title: copy.busy.openRunTitle,
        description: copy.busy.openRunDescription,
      }, async () => {
        await fetchRunDetail(runId);
        setIsRunDialogOpen(true);
      }, 700);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const refreshOpenRun = async (runId: number) => {
    await fetchRunDetail(runId);
  };

  const handleSavePreferences = async () => {
    try {
      await runBusyTask({
        kind: 'save-preferences',
        title: copy.busy.preferencesTitle,
        description: copy.busy.preferencesDescription,
      }, async () => {
        await humanResourcesApi.updatePayrollPreferences(preferencesForm);
        setIsPreferencesDialogOpen(false);
        setSuccessMessage(copy.success.preferences);
        await loadPayroll(filters, { background: true });
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleSaveLine = async () => {
    if (!selectedRunDetail || !selectedLine) {
      return;
    }

    try {
      setRunDialogNotice(null);
      await runBusyTask({
        kind: 'save-line',
        title: copy.busy.saveLineTitle,
        description: copy.busy.saveLineDescription,
      }, async () => {
        await humanResourcesApi.updatePayrollRunLine(selectedRunDetail.run.id, selectedLine.id, lineDraft);
        setIsRunDialogOpen(false);
        setSelectedRunDetail(null);
        setSelectedLineId(null);
        setRunDialogNotice(null);
        setSuccessMessage(copy.success.lineSaved);
        await loadPayroll(filters, { background: true });
      });
    } catch (error) {
      setRunDialogNotice({
        tone: 'error',
        message: toErrorMessage(error, copy),
      });
    }
  };

  const handleRunAction = async (action: 'process' | 'approve' | 'pay' | 'cancel') => {
    if (!selectedRunDetail) {
      return;
    }

    try {
      const busyConfig = action === 'process'
        ? { kind: 'process-run' as const, title: copy.busy.processTitle, description: copy.busy.processDescription }
        : action === 'approve'
          ? { kind: 'approve-run' as const, title: copy.busy.approveTitle, description: copy.busy.approveDescription }
          : action === 'pay'
            ? { kind: 'mark-paid' as const, title: copy.busy.payTitle, description: copy.busy.payDescription }
            : { kind: 'cancel-run' as const, title: copy.busy.cancelTitle, description: copy.busy.cancelDescription };

      await runBusyTask(busyConfig, async () => {
        switch (action) {
          case 'process':
            await humanResourcesApi.processPayrollRun(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.processed);
            break;
          case 'approve':
            await humanResourcesApi.approvePayrollRun(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.approved);
            break;
          case 'pay':
            await humanResourcesApi.markPayrollRunPaid(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.paid);
            break;
          case 'cancel':
            await humanResourcesApi.cancelPayrollRun(selectedRunDetail.run.id);
            setSuccessMessage(copy.success.cancelled);
            break;
        }

        await refreshOpenRun(selectedRunDetail.run.id);
        await loadPayroll(filters, { background: true });
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  useEffect(() => {
    void loadPayroll(filters, { background: true });
  }, [filters]);

  const handleDownload = async (kind: 'csv' | 'pdf', run: PayrollRunSummary) => {
    try {
      if (kind === 'csv') {
        await runBusyTask({
          kind: 'download-csv',
          title: copy.busy.csvTitle,
          description: copy.busy.csvDescription,
        }, async () => {
          await downloadFile(
            `/api/v1/hr/payroll/runs/${run.id}/export.csv`,
            `payroll-run-${run.id}.csv`,
          );
        }, 650);
        return;
      }

      await runBusyTask({
        kind: 'download-pdf',
        title: copy.busy.pdfTitle,
        description: copy.busy.pdfDescription,
      }, async () => {
        const detail = selectedRunDetail?.run.id === run.id
          ? selectedRunDetail
          : await humanResourcesApi.getPayrollRun(run.id);

        setPrintJob(buildPrintJob(detail));
      }, 650);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const openEditRunModal = async (run: PayrollRunSummary) => {
    setEditingRun(run);
    setEditRunDetail(null);
    setIsEditRunDetailLoading(true);
    setEditRunForm({
      status: run.status,
      employeesCount: String(run.users_count),
      netAmount: String(run.net_amount),
      jurisdiction: jurisdictionsByRunId[run.id] ?? '',
    });
    setIsEditRunDialogOpen(true);

    try {
      const detail = await humanResourcesApi.getPayrollRun(run.id);
      setEditRunDetail(detail);
    } catch {
      setEditRunDetail(null);
    } finally {
      setIsEditRunDetailLoading(false);
    }
  };

  const handleSaveEditedRun = () => {
    if (!editingRun || !editRunForm) {
      return;
    }

    const parsedEmployees = Number(editRunForm.employeesCount);
    const parsedNetAmount = Number(editRunForm.netAmount);

    setRuns((currentRuns) => currentRuns.map((run) => (
      run.id === editingRun.id
        ? {
          ...run,
          status: editRunForm.status,
          users_count: Number.isFinite(parsedEmployees) ? Math.max(0, parsedEmployees) : run.users_count,
          net_amount: Number.isFinite(parsedNetAmount) ? Math.max(0, parsedNetAmount) : run.net_amount,
        }
        : run
    )));

    setJurisdictionsByRunId((current) => ({
      ...current,
      [editingRun.id]: editRunForm.jurisdiction.trim(),
    }));

    setIsEditRunDialogOpen(false);
    setEditingRun(null);
    setEditRunForm(null);
    setSuccessMessage(copy.success.runEdited);
  };

  const handleProcessRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'process-run',
        title: copy.busy.processTitle,
        description: copy.busy.processDescription,
      }, async () => {
        await humanResourcesApi.processPayrollRun(run.id);
        setSuccessMessage(copy.success.processed);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handlePayRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'mark-paid',
        title: copy.busy.payTitle,
        description: copy.busy.payDescription,
      }, async () => {
        await humanResourcesApi.markPayrollRunPaid(run.id);
        setSuccessMessage(copy.success.paid);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleApproveRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'approve-run',
        title: copy.busy.approveTitle,
        description: copy.busy.approveDescription,
      }, async () => {
        await humanResourcesApi.approvePayrollRun(run.id);
        setSuccessMessage(copy.success.approved);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleCancelRunFromTable = async (run: PayrollRunSummary) => {
    try {
      await runBusyTask({
        kind: 'cancel-run',
        title: copy.busy.cancelTitle,
        description: copy.busy.cancelDescription,
      }, async () => {
        await humanResourcesApi.cancelPayrollRun(run.id);
        setSuccessMessage(copy.success.cancelled);
        await loadPayroll(filters, { background: true });
        if (selectedRunDetail?.run.id === run.id) {
          await refreshOpenRun(run.id);
        }
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const resolveRunBusiness = (run: PayrollRunSummary) => {
    if (run.grouping_mode !== 'business') {
      return null;
    }

    if (run.grouping_key && businessesById.has(run.grouping_key)) {
      return businessesById.get(run.grouping_key) ?? null;
    }

    return businesses.find((business) => business.name === run.grouping_label) ?? null;
  };

  const resolveRunUnitLabel = (run: PayrollRunSummary) => {
    if (run.grouping_mode === 'unit') {
      return run.grouping_label || copy.labels.noUnit;
    }

    if (run.grouping_mode === 'business') {
      const matchedBusiness = resolveRunBusiness(run);
      return matchedBusiness?.unitId ? unitsById.get(String(matchedBusiness.unitId)) || copy.labels.noUnit : copy.labels.noUnit;
    }

    return copy.labels.allUnits;
  };

  const resolveRunBusinessLabel = (run: PayrollRunSummary) => {
    if (run.grouping_mode === 'business') {
      return run.grouping_label || copy.labels.noBusiness;
    }

    if (run.grouping_mode === 'unit') {
      return copy.labels.multipleBusinesses;
    }

    return copy.labels.allBusinesses;
  };

  const resolveRunJurisdictionLabel = (run: PayrollRunSummary) => {
    const customJurisdiction = jurisdictionsByRunId[run.id]?.trim();
    if (customJurisdiction) {
      return customJurisdiction;
    }

    return run.grouping_mode === 'single'
      ? copy.labels.automatic
      : copy.labels.noJurisdiction;
  };

  const operationalRuns = runs.map((run) => ({
    ...run,
    jurisdictionLabel: resolveRunJurisdictionLabel(run),
    unitLabel: resolveRunUnitLabel(run),
    businessLabel: resolveRunBusinessLabel(run),
  }));
  const shouldShowSetupGuide = !overview?.preferences && runs.length === 0;
  const resolveOperationalStatus = (run: PayrollRunSummary) => {
    if (run.users_count === 0 && run.status !== 'paid' && run.status !== 'cancelled') {
      return {
        label: copy.operationalStatus.blocked,
        className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300',
      };
    }

    const statusClassNames: Record<PayrollRunSummary['status'], string> = {
      draft: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300',
      processed: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
      approved: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300',
      paid: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
      cancelled: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };

    return {
      label: run.status === 'processed' ? copy.operationalStatus.review : copy.statuses[run.status],
      className: statusClassNames[run.status],
    };
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={Boolean(busyState)}
        title={busyState?.title ?? copy.loading}
        description={busyState?.description}
      />

      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => void loadPayroll(filters, { background: true })}>
              {copy.retry}
            </Button>
          </div>
        </div>
      ) : null}

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />

      <PayrollHeaderBar
        copy={copy.header}
        isBusy={isSaving}
        onOpenPreferences={() => setIsPreferencesDialogOpen(true)}
      />

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[560px] rounded-lg" />
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-5">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">{copy.filterBar.title}</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <SelectField
                label={copy.labels.period}
                value={filters.period_range}
                onChange={(value) => setFilters({ ...filters, period_range: value })}
                options={[
                  { value: 'this_month', label: copy.labels.periodThisMonth },
                  { value: 'last_month', label: copy.labels.periodLastMonth },
                  { value: 'two_months_ago', label: copy.labels.periodTwoMonthsAgo },
                  { value: 'all_year', label: copy.labels.periodAllYear },
                  { value: 'custom', label: copy.labels.periodCustom },
                ]}
              />
              {filters.period_range === 'custom' && (
                <>
                  <DateField
                    label={copy.labels.periodFrom}
                    value={filters.period_from}
                    onChange={(value) => setFilters({ ...filters, period_from: value })}
                  />
                  <DateField
                    label={copy.labels.periodTo}
                    value={filters.period_to}
                    onChange={(value) => setFilters({ ...filters, period_to: value })}
                  />
                </>
              )}
              <SelectField
                label={copy.labels.frequency}
                value={filters.pay_period}
                onChange={(value) => setFilters({ ...filters, pay_period: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  { value: 'weekly', label: copy.frequencies.weekly },
                  { value: 'biweekly', label: copy.frequencies.biweekly },
                  { value: 'monthly', label: copy.frequencies.monthly },
                ]}
              />
              <SelectField
                label={copy.labels.payrollType}
                value={filters.grouping_mode}
                onChange={(value) => setFilters({ ...filters, grouping_mode: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  { value: 'single', label: copy.groupingModes.single },
                  { value: 'unit', label: copy.groupingModes.unit },
                  { value: 'business', label: copy.groupingModes.business },
                ]}
              />
              <SelectField
                label={copy.labels.unit}
                value={filters.unit_id}
                onChange={(value) => setFilters({ ...filters, unit_id: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  ...units.map((unit) => ({ value: String(unit.id), label: unit.name })),
                ]}
              />
              <SelectField
                label={copy.labels.business}
                value={filters.business_id}
                onChange={(value) => setFilters({ ...filters, business_id: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  ...businesses.map((business) => ({ value: String(business.id), label: business.name })),
                ]}
              />
              <SelectField
                label={copy.labels.status}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                options={[
                  { value: '', label: copy.labels.all },
                  { value: 'draft', label: copy.statuses.draft },
                  { value: 'processed', label: copy.statuses.processed },
                  { value: 'approved', label: copy.statuses.approved },
                  { value: 'paid', label: copy.statuses.paid },
                  { value: 'cancelled', label: copy.statuses.cancelled },
                ]}
              />
            </div>
          </section>

          {shouldShowSetupGuide ? (
            <PayrollSetupGuide
              copy={copy.setupGuide}
              isBusy={isSaving}
              onOpenPreferences={() => setIsPreferencesDialogOpen(true)}
            />
          ) : (
            <PayrollOperationsPanel
              copy={copy}
              runs={operationalRuns}
              formatMoney={(value) => formatCurrency(value, currentLanguage.code)}
            />
          )}

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{copy.runLedger.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.runLedger.subtitle}</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {runs.length} {copy.runLedger.currentViewSuffix}
                </div>
              </div>
            </div>

            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
                  <TableHead
                    onClick={() => handleSortColumn('period')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.period}
                    <SortIndicator column="period" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('frequency')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.frequency}
                    <SortIndicator column="frequency" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('payrollType')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.payrollType}
                    <SortIndicator column="payrollType" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('employees')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.employees}
                    <SortIndicator column="employees" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('totalAmount')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.totalAmount}
                    <SortIndicator column="totalAmount" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('jurisdiction')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.jurisdiction}
                    <SortIndicator column="jurisdiction" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('unit')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.unit}
                    <SortIndicator column="unit" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('business')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.business}
                    <SortIndicator column="business" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('status')}
                    className="cursor-pointer px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.status}
                    <SortIndicator column="status" />
                  </TableHead>
                  <TableHead className="px-5 py-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {copy.runLedger.actions}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRuns.length === 0 ? (
                  <TableRow className="border-slate-200 dark:border-slate-700">
                    <TableCell colSpan={10} className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400">
                      {copy.labels.noRuns}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRuns.map((run) => {
                    const operationalStatus = resolveOperationalStatus(run);
                    const runJurisdictionLabel = resolveRunJurisdictionLabel(run);
                    const runCurrencyCode = resolvePayrollCurrencyCode(runJurisdictionLabel);

                    return (
                      <TableRow key={run.id} className="border-slate-200 transition-colors hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-900/40">
                        <TableCell className="px-5 py-5 align-middle">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-950 dark:text-white">
                              {formatDate(run.period_start_date, currentLanguage.code, run.period_start_date)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {copy.runLedger.periodConnector} {formatDate(run.period_end_date, currentLanguage.code, run.period_end_date)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm font-medium text-slate-700 dark:text-slate-200">
                          {copy.frequencies[run.pay_period]}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {copy.groupingModes[run.grouping_mode]}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {run.grouping_label || copy.runLedger.automaticGrouping}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                            {run.users_count}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <p className="text-sm font-bold text-slate-950 dark:text-white">
                            {formatCurrency(run.net_amount, currentLanguage.code, runCurrencyCode)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {copy.runLedger.netPayout} · {runCurrencyCode}
                          </p>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm text-slate-700 dark:text-slate-200">
                          {runJurisdictionLabel}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm text-slate-700 dark:text-slate-200">
                          {resolveRunUnitLabel(run)}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle text-sm text-slate-700 dark:text-slate-200">
                          {resolveRunBusinessLabel(run)}
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${operationalStatus.className}`}>
                            {operationalStatus.label}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-5 align-middle">
                          <PayrollRunActionsMenu
                            copy={copy.runActions}
                            run={run}
                            isBusy={isSaving}
                            onOpen={() => void openRunDetail(run.id)}
                            onEdit={() => void openEditRunModal(run)}
                            onProcess={() => void handleProcessRunFromTable(run)}
                            onApprove={() => void handleApproveRunFromTable(run)}
                            onMarkPaid={() => void handlePayRunFromTable(run)}
                            onExportPdf={() => void handleDownload('pdf', run)}
                            onExportCsv={() => void handleDownload('csv', run)}
                            onCancel={() => void handleCancelRunFromTable(run)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </section>
        </>
      )}

      {isPreferencesDialogOpen ? (
        <PayrollPreferencesDialog
          copy={copy}
          isOpen={isPreferencesDialogOpen}
          isSaving={isSaving}
          form={preferencesForm}
          onClose={() => setIsPreferencesDialogOpen(false)}
          onChange={setPreferencesForm}
          onSave={() => void handleSavePreferences()}
        />
      ) : null}

      {isRunDialogOpen ? (
        <PayrollRunDialog
          copy={copy}
          locale={currentLanguage.code}
          isOpen={isRunDialogOpen}
          isSaving={isSaving}
          activeBusyKind={activeBusyKind}
          notice={runDialogNotice}
          detail={selectedRunDetail}
          selectedLineId={selectedLineId}
          selectedLine={selectedLine}
          lineDraft={lineDraft}
          onClose={() => {
            setIsRunDialogOpen(false);
            setRunDialogNotice(null);
          }}
          onSelectLine={setSelectedLineId}
          onChangeDraft={setLineDraft}
          onSaveLine={() => void handleSaveLine()}
          onProcess={() => void handleRunAction('process')}
          onApprove={() => void handleRunAction('approve')}
          onPay={() => void handleRunAction('pay')}
          onCancel={() => void handleRunAction('cancel')}
          onDownloadCsv={(run) => void handleDownload('csv', run)}
          onDownloadPdf={(run) => void handleDownload('pdf', run)}
        />
      ) : null}

      {isEditRunDialogOpen && editingRun && editRunForm ? (
        <PayrollEditRunDialog
          copy={copy}
          run={editingRun}
          form={editRunForm}
          unitLabel={resolveRunUnitLabel(editingRun)}
          businessLabel={resolveRunBusinessLabel(editingRun)}
          jurisdictionLabel={resolveRunJurisdictionLabel(editingRun)}
          detail={editRunDetail}
          isDetailLoading={isEditRunDetailLoading}
          isOpen={isEditRunDialogOpen}
          isSaving={isSaving}
          onClose={() => {
            setIsEditRunDialogOpen(false);
            setEditRunDetail(null);
            setEditingRun(null);
            setEditRunForm(null);
          }}
          onChange={setEditRunForm}
          onSave={handleSaveEditedRun}
          onPrint={() => void handleDownload('pdf', editingRun)}
          locale={currentLanguage.code}
        />
      ) : null}

      <PayrollRunPrintPortal
        job={printJob}
        onComplete={() => setPrintJob(null)}
      />
    </>
  );
}

function PayrollEditRunDialog({
  copy,
  run,
  form,
  unitLabel,
  businessLabel,
  jurisdictionLabel,
  detail,
  isDetailLoading,
  isOpen,
  isSaving,
  onClose,
  onChange,
  onSave,
  onPrint,
  locale,
}: {
  copy: PayrollCopy;
  run: PayrollRunSummary;
  form: PayrollRunEditForm;
  unitLabel: string;
  businessLabel: string;
  jurisdictionLabel: string;
  detail: PayrollRunDetailResponse | null;
  isDetailLoading: boolean;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onChange: (value: PayrollRunEditForm) => void;
  onSave: () => void;
  onPrint: () => void;
  locale: string;
}) {
  const runLines = detail?.lines ?? [];
  const editCopy = copy.editRun;
  const noRowsLabel = editCopy.noRows;
  const statusLabel = copy.statuses[form.status];
  const payrollTypeLabel = copy.groupingModes[run.grouping_mode];
  const frequencyLabel = copy.frequencies[run.pay_period];
  const rawJurisdictionLabel = (form.jurisdiction.trim() || jurisdictionLabel).trim();
  const fallbackJurisdictionMeta = parsePayrollJurisdictionLabel(rawJurisdictionLabel);
  const unsupportedJurisdictionMeta = fallbackJurisdictionMeta ? null : parseUnsupportedPayrollCountryLabel(rawJurisdictionLabel);
  const isUnsupportedJurisdiction = Boolean(unsupportedJurisdictionMeta);
  const fallbackRunJurisdiction = fallbackJurisdictionMeta?.jurisdiction ?? 'MX';
  const fallbackProvinceLabel = fallbackJurisdictionMeta?.province ?? '';

  const aggregateLineAmount = (
    line: PayrollRunLine,
    category: PayrollLineItem['category'],
  ) => line.items
    .filter((item) => item.category === category)
    .reduce((total, item) => total + item.amount, 0);

  const roundMoney = (value: number) => Math.round(value * 100) / 100;
  const formatAmount = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '—';
    }

    return value.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const [payrollViewMode, setPayrollViewMode] = useState<'simplified' | 'detailed'>('simplified');
  const [sortColumn, setSortColumn] = useState<PayrollEditTableColumnKey>('employee');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [detailedSortColumn, setDetailedSortColumn] = useState<PayrollDetailedColumnKey>('employee');
  const [detailedSortDirection, setDetailedSortDirection] = useState<'asc' | 'desc'>('asc');
  const [breakdownRow, setBreakdownRow] = useState<PayrollRow | null>(null);
  const [variablePayByRow, setVariablePayByRow] = useState<Record<string, VariablePayItem[]>>({});
  const [variablePayEditorRowId, setVariablePayEditorRowId] = useState<string | null>(null);
  const [employeeProfilesById, setEmployeeProfilesById] = useState<Record<number, HrUserDetailsResponse['profile']>>({});
  const runLineEmployeeIds = useMemo(
    () => Array.from(new Set(
      runLines
        .map((line) => line.user_company_id)
        .filter((employeeId): employeeId is number => Number.isFinite(employeeId)),
    )),
    [detail?.lines],
  );

  useEffect(() => {
    let cancelled = false;

    const loadEmployeeProfiles = async () => {
      if (runLineEmployeeIds.length === 0) {
        setEmployeeProfilesById((current) => (Object.keys(current).length === 0 ? current : {}));
        return;
      }

      const resolvedProfiles = await Promise.all(runLineEmployeeIds.map(async (employeeId) => {
        try {
          const details = await humanResourcesApi.getHrUserDetails(employeeId);
          return [employeeId, details.profile] as const;
        } catch {
          return [employeeId, {}] as const;
        }
      }));

      if (cancelled) {
        return;
      }

      setEmployeeProfilesById(Object.fromEntries(resolvedProfiles));
    };

    void loadEmployeeProfiles();

    return () => {
      cancelled = true;
    };
  }, [runLineEmployeeIds]);

  const createVariablePayDefaults = (row: PayrollDetailedRow): VariablePayItem[] => [
    {
      id: `auto-bonus-1-${row.id}`,
      type: 'bonus',
      source: 'automatic',
      name: 'Vacation premium',
      amount: roundMoney(row.vacationPremium),
      taxable: true,
      included: row.vacationPremium !== 0,
      metadata: {
        integratesSBC: true,
        applyToStatutoryPayroll: true,
      },
    },
    {
      id: `auto-bonus-2-${row.id}`,
      type: 'bonus',
      source: 'automatic',
      name: 'Proportional Christmas bonus',
      amount: roundMoney(row.proportionalChristmasBonus),
      taxable: true,
      included: row.proportionalChristmasBonus !== 0,
      metadata: {
        integratesSBC: true,
        applyToStatutoryPayroll: true,
      },
    },
    {
      id: `auto-commission-${row.id}`,
      type: 'commission',
      source: 'automatic',
      name: 'Sales commission',
      amount: roundMoney(row.bonusesCommissions),
      taxable: true,
      included: row.bonusesCommissions !== 0,
      metadata: {
        baseAmount: roundMoney(row.bonusesCommissions),
        commissionRate: row.bonusesCommissions !== 0 ? 100 : 0,
        integratesSBC: true,
        applyToStatutoryPayroll: true,
      },
    },
    {
      id: `auto-adjustment-${row.id}`,
      type: 'adjustment',
      source: 'automatic',
      name: 'Overtime earnings',
      amount: roundMoney(row.overtimeAmount),
      taxable: true,
      included: row.overtimeAmount !== 0,
      metadata: {
        integratesSBC: false,
        applyToStatutoryPayroll: true,
        affectsNetPay: true,
      },
    },
  ];

  const sumVariablePay = (items: VariablePayItem[]) => items
    .filter((item) => item.included)
    .reduce((sum, item) => sum + item.amount, 0);

  const sumTaxableVariablePay = (items: VariablePayItem[]) => items
    .filter((item) => item.included && item.taxable && (item.metadata?.applyToStatutoryPayroll ?? true))
    .reduce((sum, item) => sum + item.amount, 0);

  const parsedEmployeesCount = Number(form.employeesCount);
  const seedRowsTarget = Number.isFinite(parsedEmployeesCount) && parsedEmployeesCount > 0
    ? Math.min(Math.max(Math.trunc(parsedEmployeesCount), 4), 10)
    : 6;

  const seedNames = [
    'Liam Parker',
    'Sofia Bennett',
    'Noah Rivera',
    'Mia Thompson',
    'Ethan Brooks',
    'Emma Collins',
    'Lucas Foster',
    'Ava Ramirez',
    'Oliver Cruz',
    'Isabella Reed',
  ];

  const seedRfcPrefixes = ['AAAB', 'BBBC', 'CCCD', 'DDDE', 'EEEF', 'FFFG', 'GGGX', 'HHHZ', 'IIIY', 'JJJW'];
  const seedContributionTypes: Array<PayrollDetailedRow['contributionType']> = ['Fixed', 'Variable', 'Mixed'];
  const seedInfonavitTypes: Array<PayrollDetailedRow['infonavitType']> = ['Percentage', 'VSM', 'Fixed Amount', 'None'];

  const buildEmployerCosts = (earningsBase: number) => {
    const employerImss = roundMoney(earningsBase * 0.155);
    const employerInfonavit = roundMoney(earningsBase * 0.05);
    const sar = roundMoney(earningsBase * 0.02);
    const payrollStateTax = roundMoney(earningsBase * 0.03);
    const occupationalRisk = roundMoney(earningsBase * 0.012);
    const childcareImss = roundMoney(earningsBase * 0.01);
    const totalEmployerObligations = roundMoney(
      employerImss + employerInfonavit + sar + payrollStateTax + occupationalRisk + childcareImss,
    );
    return {
      employerImss,
      employerInfonavit,
      sar,
      payrollStateTax,
      occupationalRisk,
      childcareImss,
      totalEmployerObligations,
    };
  };

  const seedRunCountry = unsupportedJurisdictionMeta?.country || resolvePayrollJurisdictionCountry(fallbackRunJurisdiction);
  const seedRunProvince = unsupportedJurisdictionMeta?.province || (
    fallbackRunJurisdiction === 'CA_QUEBEC'
      ? QUEBEC_PROVINCE_NAME
      : fallbackRunJurisdiction === 'CA_STANDARD'
        ? fallbackProvinceLabel || 'Ontario'
        : fallbackProvinceLabel
  );

  const resolveEmployeeJurisdictionProfile = (employeeId: number | undefined, index: number) => {
    const profile = employeeId ? employeeProfilesById[employeeId] : undefined;
    const country = (profile?.registration_country || seedRunCountry).trim() || seedRunCountry;
    const rawProvince = (profile?.state_province || seedRunProvince).trim();
    const jurisdiction = resolvePayrollJurisdiction(country, rawProvince);
    const province = jurisdiction === 'CA_QUEBEC'
      ? QUEBEC_PROVINCE_NAME
      : rawProvince;

    return {
      country,
      province,
      jurisdiction,
      taxId: (profile?.tax_id || '').trim(),
      socialSecurityNumber: (profile?.social_security_number || '').trim(),
      sin: (profile?.social_security_number || String(100000000 + index).padStart(9, '0')).replace(/\s+/g, ''),
    };
  };

  const seedEarningBase = run.gross_amount > 0 ? run.gross_amount / seedRowsTarget : 1350;

  const detailedSeedRows: PayrollDetailedRow[] = Array.from({ length: seedRowsTarget }, (_, index) => {
    const jurisdictionProfile = resolveEmployeeJurisdictionProfile(undefined, index);
    const statutoryPayroll = ![1, 4].includes(index);
    const earningVariance = 1 + (((index % 5) - 2) * 0.05);
    const baseSalary = roundMoney(seedEarningBase * earningVariance);
    const daysPaid = 15 - ((run.id + index) % 2);
    const hoursPerDay = 8;
    const overtimeHours = (run.id + index) % 4;
    const totalWorkedHours = (daysPaid * hoursPerDay) + overtimeHours;
    const dailySalary = roundMoney(baseSalary / 30);
    const integratedDailySalary = roundMoney(dailySalary * 1.0452);
    const contributionBaseSalary = roundMoney(integratedDailySalary * 30);
    const periodSalary = roundMoney(baseSalary / 2);
    const overtimeAmount = roundMoney(dailySalary * 0.6 * overtimeHours);
    const bonusesCommissions = roundMoney(periodSalary * 0.04);
    const vacationPremium = roundMoney(periodSalary * 0.018);
    const proportionalChristmasBonus = roundMoney(periodSalary * 0.012);
    const variablePayTotal = roundMoney(overtimeAmount + bonusesCommissions + vacationPremium + proportionalChristmasBonus);
    const vacationPay = roundMoney(periodSalary * 0.04);
    const vacationBonusOneThird = roundMoney(vacationPay / 3);
    const thirteenthSalaryProvision = roundMoney(periodSalary * 0.0833);
    const nightSurcharge = roundMoney(periodSalary * 0.02);
    const sundayHolidaySurcharge = roundMoney(periodSalary * 0.018);
    const transportAllowance = roundMoney(periodSalary * 0.065);
    const nightShiftPremium = roundMoney(periodSalary * 0.025);
    const hazardUnhealthyPremium = roundMoney(periodSalary * 0.018);
    const taxableBenefits = roundMoney(periodSalary * 0.015);
    const isCanadaStandard = jurisdictionProfile.jurisdiction === 'CA_STANDARD';
    const isCanadaQuebec = jurisdictionProfile.jurisdiction === 'CA_QUEBEC';
    const isUnitedStates = jurisdictionProfile.jurisdiction === 'US';
    const isBrazil = jurisdictionProfile.jurisdiction === 'BR';
    const isColombia = jurisdictionProfile.jurisdiction === 'CO';
    const grossPay = isBrazil
      ? roundMoney(
        periodSalary
        + variablePayTotal
        + vacationPay
        + vacationBonusOneThird
        + thirteenthSalaryProvision
        + nightShiftPremium
        + hazardUnhealthyPremium
        + taxableBenefits,
      )
      : isColombia
        ? roundMoney(
          periodSalary
          + overtimeAmount
          + nightSurcharge
          + sundayHolidaySurcharge
          + transportAllowance
          + variablePayTotal,
        )
        : roundMoney(periodSalary + variablePayTotal + taxableBenefits);
    const totalEarnings = grossPay;
    const isrBeforeSubsidy = roundMoney(totalEarnings * 0.09);
    const employmentSubsidy = roundMoney((index % 3 === 0 ? 90 : 45));
    const finalIsr = roundMoney(Math.max(0, isrBeforeSubsidy - employmentSubsidy));
    const employeeImss = roundMoney(totalEarnings * 0.024);
    const infonavitDiscount = roundMoney(totalEarnings * 0.01);
    const loans = (index % 4 === 0) ? roundMoney(180 * earningVariance) : 0;
    const otherDiscounts = (index % 5 === 0) ? roundMoney(60 * earningVariance) : 0;
    const netAdjustment = (index % 6 === 0) ? roundMoney(-15 * earningVariance) : 0;
    const otherDeductions = roundMoney(Math.max(0, loans + otherDiscounts + netAdjustment));
    const employerCosts = buildEmployerCosts(totalEarnings);
    const canadaStandardValues = buildCanadaStandardStatutoryValues(grossPay);
    const canadaQuebecValues = buildCanadaQuebecStatutoryValues(grossPay);
    const usaValues = buildUsaStatutoryValues(grossPay);
    const brazilValues = buildBrazilStatutoryValues(grossPay);
    const colombiaValues = buildColombiaStatutoryValues(grossPay);
    const totalDeductions = isCanadaStandard
      ? roundMoney(
        canadaStandardValues.federalTax
        + canadaStandardValues.provincialTax
        + canadaStandardValues.employeeCpp
        + canadaStandardValues.employeeCpp2
        + canadaStandardValues.employeeEi
        + otherDeductions,
      )
      : isCanadaQuebec
        ? roundMoney(
          canadaQuebecValues.federalTax
          + canadaQuebecValues.quebecProvincialTax
          + canadaQuebecValues.employeeQpp
          + canadaQuebecValues.employeeQpp2
          + canadaQuebecValues.employeeQpip
          + canadaQuebecValues.employeeEi
          + otherDeductions,
        )
        : isUnitedStates
          ? roundMoney(
            usaValues.federalTax
            + usaValues.provincialTax
            + usaValues.employeeCpp
            + usaValues.employeeEi
            + otherDeductions,
          )
        : isBrazil
          ? roundMoney(
            brazilValues.employeeInss
            + brazilValues.irrf
            + brazilValues.transportationVoucher
            + brazilValues.mealBenefitsDeduction
            + otherDeductions,
          )
          : isColombia
            ? roundMoney(
              colombiaValues.employeeHealth
              + colombiaValues.employeePension
              + colombiaValues.withholdingTax
              + otherDeductions,
            )
        : roundMoney(Math.max(0, finalIsr + employeeImss + infonavitDiscount + loans + otherDiscounts + netAdjustment));
    const netPay = roundMoney(Math.max(0, grossPay - totalDeductions));

    return {
      id: `seed-d-${run.id}-${index + 1}`,
      jurisdiction: jurisdictionProfile.jurisdiction,
      country: jurisdictionProfile.country,
      province: jurisdictionProfile.province,
      employee: seedNames[index % seedNames.length],
      rfc: `${seedRfcPrefixes[index % seedRfcPrefixes.length]}${String(800000 + run.id * 10 + index).padStart(6, '0')}`,
      curp: `CURP${String(index + 1).padStart(14, '0')}`,
      nss: String(10000000000 + run.id * 100 + index).padStart(11, '0'),
      sin: jurisdictionProfile.sin,
      cpf: jurisdictionProfile.taxId || String(10000000000 + run.id * 100 + index).padStart(11, '0'),
      pisPasep: jurisdictionProfile.socialSecurityNumber || String(12000000000 + run.id * 100 + index).padStart(11, '0'),
      idNumber: jurisdictionProfile.taxId || String(90000000 + run.id * 10 + index).padStart(8, '0'),
      contractType: index % 4 === 0
        ? 'Apprenticeship'
        : index % 3 === 0
          ? 'Service contract'
          : index % 2 === 0
            ? 'Fixed-term'
            : 'Indefinite',
      unit: unitLabel,
      business: businessLabel,
      statutoryPayroll,
      payrollMode: statutoryPayroll ? 'Statutory' : 'Internal only',
      employmentType: isBrazil
        ? index % 4 === 0
          ? 'Intern'
          : index % 3 === 0
            ? 'Contractor'
            : index % 2 === 0
              ? 'Temporary'
              : 'CLT'
        : isColombia
          ? index % 4 === 0
            ? 'Apprentice'
            : index % 3 === 0
              ? 'Contractor'
              : index % 2 === 0
                ? 'Part-time'
                : 'Full-time'
        : index % 3 === 0
          ? 'Contract'
          : index % 2 === 0
            ? 'Part-time'
            : 'Full-time',
      payType: isBrazil || isColombia ? (index % 2 === 0 ? 'Hourly' : 'Monthly') : (index % 2 === 0 ? 'Hourly' : 'Salary'),
      hourlyRate: roundMoney(dailySalary / 8),
      monthlySalary: baseSalary,
      contributionType: seedContributionTypes[index % seedContributionTypes.length],
      dailyWage: dailySalary,
      integratedDailyWage: integratedDailySalary,
      baseContributionSalary: contributionBaseSalary,
      daysPaid,
      totalWorkedHours,
      hoursPerDay,
      overtimeHours,
      nightSurcharge,
      sundayHolidaySurcharge,
      nightShiftPremium,
      hazardUnhealthyPremium,
      periodSalary,
      overtimeAmount,
      transportAllowance,
      variablePayTotal,
      bonusesCommissions,
      vacationPay,
      vacationBonusOneThird,
      vacationPremium,
      thirteenthSalaryProvision,
      taxableBenefits,
      proportionalChristmasBonus,
      grossPay,
      totalEarnings,
      federalTax: isCanadaStandard
        ? canadaStandardValues.federalTax
        : isCanadaQuebec
          ? canadaQuebecValues.federalTax
          : isUnitedStates
            ? usaValues.federalTax
            : 0,
      provincialTax: isCanadaStandard
        ? canadaStandardValues.provincialTax
        : isUnitedStates
          ? usaValues.provincialTax
          : 0,
      quebecProvincialTax: isCanadaQuebec ? canadaQuebecValues.quebecProvincialTax : 0,
      isrBeforeSubsidy,
      employmentSubsidy,
      finalIsr,
      employeeImss,
      employeeCpp: isCanadaStandard
        ? canadaStandardValues.employeeCpp
        : isUnitedStates
          ? usaValues.employeeCpp
          : 0,
      employeeCpp2: isCanadaStandard ? canadaStandardValues.employeeCpp2 : 0,
      employeeEi: isCanadaStandard
        ? canadaStandardValues.employeeEi
        : isCanadaQuebec
          ? canadaQuebecValues.employeeEi
          : isUnitedStates
            ? usaValues.employeeEi
          : 0,
      employeeHealth: isColombia ? colombiaValues.employeeHealth : 0,
      employeePension: isColombia ? colombiaValues.employeePension : 0,
      withholdingTax: isColombia ? colombiaValues.withholdingTax : 0,
      employeeInss: isBrazil ? brazilValues.employeeInss : 0,
      irrf: isBrazil ? brazilValues.irrf : 0,
      transportationVoucher: isBrazil ? brazilValues.transportationVoucher : 0,
      mealBenefitsDeduction: isBrazil ? brazilValues.mealBenefitsDeduction : 0,
      employeeQpp: isCanadaQuebec ? canadaQuebecValues.employeeQpp : 0,
      employeeQpp2: isCanadaQuebec ? canadaQuebecValues.employeeQpp2 : 0,
      employeeQpip: isCanadaQuebec ? canadaQuebecValues.employeeQpip : 0,
      infonavitType: seedInfonavitTypes[index % seedInfonavitTypes.length],
      infonavitDiscount,
      otherDeductions,
      loans,
      otherDiscounts,
      netAdjustment,
      totalDeductions,
      netPay,
      employerImss: employerCosts.employerImss,
      employerInfonavit: employerCosts.employerInfonavit,
      sar: employerCosts.sar,
      payrollStateTax: isUnitedStates ? usaValues.payrollStateTax : employerCosts.payrollStateTax,
      occupationalRisk: employerCosts.occupationalRisk,
      childcareImss: employerCosts.childcareImss,
      employerCpp: isCanadaStandard
        ? canadaStandardValues.employerCpp
        : isUnitedStates
          ? usaValues.employerCpp
          : 0,
      employerCpp2: isCanadaStandard ? canadaStandardValues.employerCpp2 : 0,
      employerEi: isCanadaStandard
        ? canadaStandardValues.employerEi
        : isCanadaQuebec
          ? canadaQuebecValues.employerEi
          : isUnitedStates
            ? usaValues.employerEi
          : 0,
      employerBenefits: isCanadaStandard || isCanadaQuebec
        ? (isCanadaStandard ? canadaStandardValues.employerBenefits : canadaQuebecValues.employerBenefits)
        : isUnitedStates
          ? usaValues.employerBenefits
        : isBrazil
          ? brazilValues.employerBenefits
        : 0,
      employerQpp: isCanadaQuebec ? canadaQuebecValues.employerQpp : 0,
      employerQpp2: isCanadaQuebec ? canadaQuebecValues.employerQpp2 : 0,
      employerQpip: isCanadaQuebec ? canadaQuebecValues.employerQpip : 0,
      employerHealth: isColombia ? colombiaValues.employerHealth : 0,
      employerPension: isColombia ? colombiaValues.employerPension : 0,
      arl: isColombia ? colombiaValues.arl : 0,
      severance: isColombia ? colombiaValues.severance : 0,
      severanceInterest: isColombia ? colombiaValues.severanceInterest : 0,
      serviceBonus: isColombia ? colombiaValues.serviceBonus : 0,
      vacationProvision: isColombia ? colombiaValues.vacationProvision : 0,
      familyCompensationFund: isColombia ? colombiaValues.familyCompensationFund : 0,
      icbf: isColombia ? colombiaValues.icbf : 0,
      sena: isColombia ? colombiaValues.sena : 0,
      employerInss: isBrazil ? brazilValues.employerInss : 0,
      fgts: isBrazil ? brazilValues.fgts : 0,
      ratWorkAccident: isBrazil ? brazilValues.ratWorkAccident : 0,
      thirdPartyContributions: isBrazil ? brazilValues.thirdPartyContributions : 0,
      totalEmployerObligations: isCanadaStandard
        ? canadaStandardValues.totalEmployerObligations
        : isCanadaQuebec
          ? canadaQuebecValues.totalEmployerObligations
          : isUnitedStates
            ? usaValues.totalEmployerObligations
          : isColombia
            ? colombiaValues.totalEmployerObligations
          : isBrazil
            ? brazilValues.totalEmployerObligations
          : employerCosts.totalEmployerObligations,
      totalPayrollCost: roundMoney(netPay + (
        isCanadaStandard
          ? canadaStandardValues.totalEmployerObligations
          : isCanadaQuebec
            ? canadaQuebecValues.totalEmployerObligations
            : isUnitedStates
              ? usaValues.totalEmployerObligations
            : isColombia
              ? colombiaValues.totalEmployerObligations
            : isBrazil
              ? brazilValues.totalEmployerObligations
            : employerCosts.totalEmployerObligations
      )),
    };
  });

  const detailedDetailRows: PayrollDetailedRow[] = runLines.map((line, index) => {
    const jurisdictionProfile = resolveEmployeeJurisdictionProfile(line.user_company_id, index);
    const statutoryPayroll = index > 1;
    const earnings = aggregateLineAmount(line, 'earning');
    const deductions = aggregateLineAmount(line, 'deduction');
    const dailySalary = line.hourly_rate_amount > 0
      ? roundMoney(line.hourly_rate_amount * 8)
      : roundMoney(line.base_salary_amount / 30);
    const integratedDailySalary = roundMoney(dailySalary * 1.0452);
    const contributionBaseSalary = roundMoney(integratedDailySalary * 30);
    const daysPaid = line.days_payable;
    const hoursPerDay = 8;
    const overtimeHours = line.overtime_hours;
    const totalWorkedHours = (daysPaid * hoursPerDay) + overtimeHours;
    const periodSalary = roundMoney(line.base_salary_amount / 2);
    const overtimeAmount = roundMoney(overtimeHours * dailySalary * 0.6);
    const bonusesCommissions = line.items
      .filter((item) => item.category === 'earning' && /bonus|commission|bono|comision/i.test(`${item.code} ${item.label}`))
      .reduce((total, item) => total + item.amount, 0);
    const vacationPremium = line.items
      .filter((item) => item.category === 'earning' && /vacation|prima vacacional/i.test(`${item.code} ${item.label}`))
      .reduce((total, item) => total + item.amount, 0);
    const proportionalChristmasBonus = line.items
      .filter((item) => item.category === 'earning' && /christmas|aguinaldo/i.test(`${item.code} ${item.label}`))
      .reduce((total, item) => total + item.amount, 0);
    const variablePayTotal = roundMoney(overtimeAmount + bonusesCommissions + vacationPremium + proportionalChristmasBonus);
    const vacationPay = roundMoney(Math.max(vacationPremium, periodSalary * 0.04));
    const vacationBonusOneThird = roundMoney(vacationPay / 3);
    const thirteenthSalaryProvision = roundMoney(periodSalary * 0.0833);
    const nightSurcharge = roundMoney(periodSalary * 0.02);
    const sundayHolidaySurcharge = roundMoney(periodSalary * 0.018);
    const transportAllowance = roundMoney(periodSalary * 0.065);
    const nightShiftPremium = roundMoney(periodSalary * 0.025);
    const hazardUnhealthyPremium = roundMoney(periodSalary * 0.018);
    const taxableBenefits = roundMoney(periodSalary * 0.015);
    const isCanadaStandard = jurisdictionProfile.jurisdiction === 'CA_STANDARD';
    const isCanadaQuebec = jurisdictionProfile.jurisdiction === 'CA_QUEBEC';
    const isUnitedStates = jurisdictionProfile.jurisdiction === 'US';
    const isBrazil = jurisdictionProfile.jurisdiction === 'BR';
    const isColombia = jurisdictionProfile.jurisdiction === 'CO';
    const grossPay = roundMoney(
      earnings || (
        isBrazil
          ? periodSalary
          + variablePayTotal
          + vacationPay
          + vacationBonusOneThird
          + thirteenthSalaryProvision
          + nightShiftPremium
          + hazardUnhealthyPremium
          + taxableBenefits
          : isColombia
            ? periodSalary
            + overtimeAmount
            + nightSurcharge
            + sundayHolidaySurcharge
            + transportAllowance
            + variablePayTotal
          : periodSalary + variablePayTotal + taxableBenefits
      ),
    );
    const totalEarnings = grossPay;
    const isrBeforeSubsidy = line.items.find((item) => item.code === 'ISR')?.amount ?? roundMoney(totalEarnings * 0.09);
    const employmentSubsidy = line.items.find((item) => /subsidy/i.test(`${item.code} ${item.label}`))?.amount ?? 0;
    const finalIsr = roundMoney(Math.max(0, isrBeforeSubsidy - employmentSubsidy));
    const employeeImss = line.items.find((item) => item.code === 'IMSS_EMP')?.amount ?? roundMoney(totalEarnings * 0.024);
    const infonavitDiscount = line.items.find((item) => item.code === 'INFONAVIT')?.amount ?? 0;
    const loans = line.items
      .filter((item) => item.category === 'deduction' && /loan|prestamo/i.test(`${item.code} ${item.label}`))
      .reduce((total, item) => total + item.amount, 0);
    const otherDiscounts = roundMoney(Math.max(0, deductions - finalIsr - employeeImss - infonavitDiscount - loans));
    const netAdjustment = 0;
    const otherDeductions = roundMoney(Math.max(0, loans + otherDiscounts + netAdjustment));
    const employerCosts = buildEmployerCosts(totalEarnings);
    const canadaStandardValues = buildCanadaStandardStatutoryValues(grossPay);
    const canadaQuebecValues = buildCanadaQuebecStatutoryValues(grossPay);
    const usaValues = buildUsaStatutoryValues(grossPay);
    const brazilValues = buildBrazilStatutoryValues(grossPay);
    const colombiaValues = buildColombiaStatutoryValues(grossPay);
    const totalDeductions = isCanadaStandard
      ? roundMoney(
        canadaStandardValues.federalTax
        + canadaStandardValues.provincialTax
        + canadaStandardValues.employeeCpp
        + canadaStandardValues.employeeCpp2
        + canadaStandardValues.employeeEi
        + otherDeductions,
      )
      : isCanadaQuebec
        ? roundMoney(
          canadaQuebecValues.federalTax
          + canadaQuebecValues.quebecProvincialTax
          + canadaQuebecValues.employeeQpp
          + canadaQuebecValues.employeeQpp2
          + canadaQuebecValues.employeeQpip
          + canadaQuebecValues.employeeEi
          + otherDeductions,
        )
        : isUnitedStates
          ? roundMoney(
            usaValues.federalTax
            + usaValues.provincialTax
            + usaValues.employeeCpp
            + usaValues.employeeEi
            + otherDeductions,
          )
        : isBrazil
          ? roundMoney(
            brazilValues.employeeInss
            + brazilValues.irrf
            + brazilValues.transportationVoucher
            + brazilValues.mealBenefitsDeduction
            + otherDeductions,
          )
          : isColombia
            ? roundMoney(
              colombiaValues.employeeHealth
              + colombiaValues.employeePension
              + colombiaValues.withholdingTax
              + otherDeductions,
            )
        : roundMoney(Math.max(0, finalIsr + employeeImss + infonavitDiscount + loans + otherDiscounts + netAdjustment));
    const netPay = roundMoney(Math.max(0, line.net_amount || (grossPay - totalDeductions)));

    return {
      id: line.id,
      jurisdiction: jurisdictionProfile.jurisdiction,
      country: jurisdictionProfile.country,
      province: jurisdictionProfile.province,
      employee: line.user_name,
      rfc: jurisdictionProfile.taxId || `RFC${String(index + 1).padStart(13, '0')}`,
      curp: `CURP${String(index + 1).padStart(14, '0')}`,
      nss: jurisdictionProfile.socialSecurityNumber || String(10000000000 + index).padStart(11, '0'),
      sin: jurisdictionProfile.sin,
      cpf: jurisdictionProfile.taxId || String(10000000000 + index).padStart(11, '0'),
      pisPasep: jurisdictionProfile.socialSecurityNumber || String(12000000000 + index).padStart(11, '0'),
      idNumber: jurisdictionProfile.taxId || String(90000000 + index).padStart(8, '0'),
      contractType: isColombia
        ? line.salary_type === 'hourly'
          ? 'Fixed-term'
          : 'Indefinite'
        : 'Indefinite',
      unit: line.unit_name || unitLabel,
      business: line.business_name || businessLabel,
      statutoryPayroll,
      payrollMode: statutoryPayroll ? 'Statutory' : 'Internal only',
      employmentType: isBrazil
        ? (line.salary_type === 'hourly' ? 'Temporary' : 'CLT')
        : isColombia
          ? (line.salary_type === 'hourly' ? 'Part-time' : 'Full-time')
          : (line.salary_type === 'hourly' ? 'Part-time' : 'Full-time'),
      payType: isBrazil || isColombia ? (line.salary_type === 'hourly' ? 'Hourly' : 'Monthly') : (line.salary_type === 'hourly' ? 'Hourly' : 'Salary'),
      hourlyRate: roundMoney(line.hourly_rate_amount ?? (dailySalary / 8)),
      monthlySalary: line.base_salary_amount,
      contributionType: 'Fixed',
      dailyWage: dailySalary,
      integratedDailyWage: integratedDailySalary,
      baseContributionSalary: contributionBaseSalary,
      daysPaid,
      totalWorkedHours,
      hoursPerDay,
      overtimeHours,
      nightSurcharge,
      sundayHolidaySurcharge,
      nightShiftPremium,
      hazardUnhealthyPremium,
      periodSalary,
      overtimeAmount,
      transportAllowance,
      variablePayTotal,
      bonusesCommissions,
      vacationPay,
      vacationBonusOneThird,
      vacationPremium,
      thirteenthSalaryProvision,
      taxableBenefits,
      proportionalChristmasBonus,
      grossPay,
      totalEarnings,
      federalTax: isCanadaStandard
        ? canadaStandardValues.federalTax
        : isCanadaQuebec
          ? canadaQuebecValues.federalTax
          : isUnitedStates
            ? usaValues.federalTax
            : 0,
      provincialTax: isCanadaStandard
        ? canadaStandardValues.provincialTax
        : isUnitedStates
          ? usaValues.provincialTax
          : 0,
      quebecProvincialTax: isCanadaQuebec ? canadaQuebecValues.quebecProvincialTax : 0,
      isrBeforeSubsidy,
      employmentSubsidy,
      finalIsr,
      employeeImss,
      employeeCpp: isCanadaStandard
        ? canadaStandardValues.employeeCpp
        : isUnitedStates
          ? usaValues.employeeCpp
          : 0,
      employeeCpp2: isCanadaStandard ? canadaStandardValues.employeeCpp2 : 0,
      employeeEi: isCanadaStandard
        ? canadaStandardValues.employeeEi
        : isCanadaQuebec
          ? canadaQuebecValues.employeeEi
          : isUnitedStates
            ? usaValues.employeeEi
          : 0,
      employeeHealth: isColombia ? colombiaValues.employeeHealth : 0,
      employeePension: isColombia ? colombiaValues.employeePension : 0,
      withholdingTax: isColombia ? colombiaValues.withholdingTax : 0,
      employeeInss: isBrazil ? brazilValues.employeeInss : 0,
      irrf: isBrazil ? brazilValues.irrf : 0,
      transportationVoucher: isBrazil ? brazilValues.transportationVoucher : 0,
      mealBenefitsDeduction: isBrazil ? brazilValues.mealBenefitsDeduction : 0,
      employeeQpp: isCanadaQuebec ? canadaQuebecValues.employeeQpp : 0,
      employeeQpp2: isCanadaQuebec ? canadaQuebecValues.employeeQpp2 : 0,
      employeeQpip: isCanadaQuebec ? canadaQuebecValues.employeeQpip : 0,
      infonavitType: infonavitDiscount > 0 ? 'Fixed Amount' : 'None',
      infonavitDiscount,
      otherDeductions,
      loans,
      otherDiscounts,
      netAdjustment,
      totalDeductions,
      netPay,
      employerImss: employerCosts.employerImss,
      employerInfonavit: employerCosts.employerInfonavit,
      sar: employerCosts.sar,
      payrollStateTax: isUnitedStates ? usaValues.payrollStateTax : employerCosts.payrollStateTax,
      occupationalRisk: employerCosts.occupationalRisk,
      childcareImss: employerCosts.childcareImss,
      employerCpp: isCanadaStandard
        ? canadaStandardValues.employerCpp
        : isUnitedStates
          ? usaValues.employerCpp
          : 0,
      employerCpp2: isCanadaStandard ? canadaStandardValues.employerCpp2 : 0,
      employerEi: isCanadaStandard
        ? canadaStandardValues.employerEi
        : isCanadaQuebec
          ? canadaQuebecValues.employerEi
          : isUnitedStates
            ? usaValues.employerEi
          : 0,
      employerBenefits: isCanadaStandard || isCanadaQuebec
        ? (isCanadaStandard ? canadaStandardValues.employerBenefits : canadaQuebecValues.employerBenefits)
        : isUnitedStates
          ? usaValues.employerBenefits
        : isBrazil
          ? brazilValues.employerBenefits
        : 0,
      employerQpp: isCanadaQuebec ? canadaQuebecValues.employerQpp : 0,
      employerQpp2: isCanadaQuebec ? canadaQuebecValues.employerQpp2 : 0,
      employerQpip: isCanadaQuebec ? canadaQuebecValues.employerQpip : 0,
      employerHealth: isColombia ? colombiaValues.employerHealth : 0,
      employerPension: isColombia ? colombiaValues.employerPension : 0,
      arl: isColombia ? colombiaValues.arl : 0,
      severance: isColombia ? colombiaValues.severance : 0,
      severanceInterest: isColombia ? colombiaValues.severanceInterest : 0,
      serviceBonus: isColombia ? colombiaValues.serviceBonus : 0,
      vacationProvision: isColombia ? colombiaValues.vacationProvision : 0,
      familyCompensationFund: isColombia ? colombiaValues.familyCompensationFund : 0,
      icbf: isColombia ? colombiaValues.icbf : 0,
      sena: isColombia ? colombiaValues.sena : 0,
      employerInss: isBrazil ? brazilValues.employerInss : 0,
      fgts: isBrazil ? brazilValues.fgts : 0,
      ratWorkAccident: isBrazil ? brazilValues.ratWorkAccident : 0,
      thirdPartyContributions: isBrazil ? brazilValues.thirdPartyContributions : 0,
      totalEmployerObligations: isCanadaStandard
        ? canadaStandardValues.totalEmployerObligations
        : isCanadaQuebec
          ? canadaQuebecValues.totalEmployerObligations
          : isUnitedStates
            ? usaValues.totalEmployerObligations
          : isColombia
            ? colombiaValues.totalEmployerObligations
          : isBrazil
            ? brazilValues.totalEmployerObligations
          : employerCosts.totalEmployerObligations,
      totalPayrollCost: roundMoney(netPay + (
        isCanadaStandard
          ? canadaStandardValues.totalEmployerObligations
          : isCanadaQuebec
            ? canadaQuebecValues.totalEmployerObligations
            : isUnitedStates
              ? usaValues.totalEmployerObligations
            : isColombia
              ? colombiaValues.totalEmployerObligations
            : isBrazil
              ? brazilValues.totalEmployerObligations
            : employerCosts.totalEmployerObligations
      )),
    };
  });

  const baseDetailedRows = detailedDetailRows.length > 0 ? detailedDetailRows : detailedSeedRows;

  const [detailedAttendanceSelection, setDetailedAttendanceSelection] = useState<Record<string, Partial<Record<PayrollEditableAttendanceField, number>>>>({});
  const [simplifiedAttendanceSelection, setSimplifiedAttendanceSelection] = useState<Record<string, Partial<Record<PayrollEditableAttendanceField, number>>>>({});

  useEffect(() => {
    setDetailedAttendanceSelection((current) => {
      let hasChanges = false;
      const next = { ...current };
      baseDetailedRows.forEach((row) => {
        const rowId = String(row.id);
        if (!next[rowId]) {
          next[rowId] = {
            daysPaid: row.daysPaid,
            overtimeHours: row.overtimeHours,
          };
          hasChanges = true;
        }
      });
      return hasChanges ? next : current;
    });
  }, [baseDetailedRows]);

  const detailedRows = useMemo(
    () => baseDetailedRows.map((row) => {
      const selected = detailedAttendanceSelection[String(row.id)];
      const daysPaid = selected?.daysPaid ?? row.daysPaid;
      const overtimeHours = selected?.overtimeHours ?? row.overtimeHours;
      const totalWorkedHours = (daysPaid * row.hoursPerDay) + overtimeHours;
      return {
        ...row,
        daysPaid,
        overtimeHours,
        totalWorkedHours,
      };
    }),
    [baseDetailedRows, detailedAttendanceSelection],
  );

  const [statutorySelection, setStatutorySelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setStatutorySelection((current) => {
      let hasChanges = false;
      const next = { ...current };
      detailedRows.forEach((row) => {
        const rowId = String(row.id);
        if (next[rowId] === undefined) {
          next[rowId] = row.statutoryPayroll;
          hasChanges = true;
        }
      });
      return hasChanges ? next : current;
    });
  }, [detailedRows]);

  const detailedRowsWithMode = useMemo(
    () => detailedRows.map((row) => {
      const statutoryPayroll = statutorySelection[String(row.id)] ?? row.statutoryPayroll;
      const payrollMode: PayrollDetailedRow['payrollMode'] = statutoryPayroll ? 'Statutory' : 'Internal only';
      return {
        ...row,
        statutoryPayroll,
        payrollMode,
      };
    }),
    [detailedRows, statutorySelection],
  );

  useEffect(() => {
    setVariablePayByRow((current) => {
      let hasChanges = false;
      const next = { ...current };
      detailedRowsWithMode.forEach((row) => {
        const rowId = String(row.id);
        if (!next[rowId]) {
          next[rowId] = createVariablePayDefaults(row);
          hasChanges = true;
        }
      });
      return hasChanges ? next : current;
    });
  }, [detailedRowsWithMode]);

  const detailedRowsWithVariable = useMemo(
    () => detailedRowsWithMode.map((row) => {
      const rowId = String(row.id);
      const items = variablePayByRow[rowId] ?? createVariablePayDefaults(row);
      const variablePayTotal = roundMoney(sumVariablePay(items));
      const taxableVariablePay = roundMoney(sumTaxableVariablePay(items));
      const grossPay = roundMoney(Math.max(0, row.grossPay - row.variablePayTotal + variablePayTotal));
      const taxableGrossPay = roundMoney(Math.max(0, row.grossPay - row.variablePayTotal + taxableVariablePay));
      const totalEarnings = row.jurisdiction === 'CA_STANDARD'
        || row.jurisdiction === 'CA_QUEBEC'
        || row.jurisdiction === 'BR'
        || row.jurisdiction === 'CO'
        ? grossPay
        : roundMoney(Math.max(0, row.totalEarnings - row.variablePayTotal + variablePayTotal));
      const internalDeductions = roundMoney(row.otherDeductions || (row.loans + row.otherDiscounts + row.netAdjustment));

      if (!row.statutoryPayroll) {
        const netPay = roundMoney(grossPay - internalDeductions);
        return {
          ...row,
          variablePayTotal,
          grossPay,
          totalEarnings,
          totalDeductions: internalDeductions,
          netPay,
          totalPayrollCost: netPay,
        };
      }

      if (row.jurisdiction === 'CA_STANDARD') {
        const canadaValues = buildCanadaStandardStatutoryValues(taxableGrossPay);
        const totalDeductions = roundMoney(
          canadaValues.federalTax
          + canadaValues.provincialTax
          + canadaValues.employeeCpp
          + canadaValues.employeeCpp2
          + canadaValues.employeeEi
          + internalDeductions,
        );
        const netPay = roundMoney(grossPay - totalDeductions);

        return {
          ...row,
          variablePayTotal,
          grossPay,
          totalEarnings,
          federalTax: canadaValues.federalTax,
          provincialTax: canadaValues.provincialTax,
          quebecProvincialTax: 0,
          employeeCpp: canadaValues.employeeCpp,
          employeeCpp2: canadaValues.employeeCpp2,
          employeeEi: canadaValues.employeeEi,
          employeeQpp: 0,
          employeeQpp2: 0,
          employeeQpip: 0,
          otherDeductions: internalDeductions,
          totalDeductions,
          netPay,
          employerCpp: canadaValues.employerCpp,
          employerCpp2: canadaValues.employerCpp2,
          employerEi: canadaValues.employerEi,
          employerBenefits: canadaValues.employerBenefits,
          employerQpp: 0,
          employerQpp2: 0,
          employerQpip: 0,
          totalEmployerObligations: canadaValues.totalEmployerObligations,
          totalPayrollCost: roundMoney(netPay + canadaValues.totalEmployerObligations),
        };
      }

      if (row.jurisdiction === 'CA_QUEBEC') {
        const quebecValues = buildCanadaQuebecStatutoryValues(taxableGrossPay);
        const totalDeductions = roundMoney(
          quebecValues.federalTax
          + quebecValues.quebecProvincialTax
          + quebecValues.employeeQpp
          + quebecValues.employeeQpp2
          + quebecValues.employeeQpip
          + quebecValues.employeeEi
          + internalDeductions,
        );
        const netPay = roundMoney(grossPay - totalDeductions);

        return {
          ...row,
          variablePayTotal,
          grossPay,
          totalEarnings,
          federalTax: quebecValues.federalTax,
          provincialTax: 0,
          quebecProvincialTax: quebecValues.quebecProvincialTax,
          employeeCpp: 0,
          employeeCpp2: 0,
          employeeEi: quebecValues.employeeEi,
          employeeQpp: quebecValues.employeeQpp,
          employeeQpp2: quebecValues.employeeQpp2,
          employeeQpip: quebecValues.employeeQpip,
          otherDeductions: internalDeductions,
          totalDeductions,
          netPay,
          employerCpp: 0,
          employerCpp2: 0,
          employerEi: quebecValues.employerEi,
          employerBenefits: quebecValues.employerBenefits,
          employerQpp: quebecValues.employerQpp,
          employerQpp2: quebecValues.employerQpp2,
          employerQpip: quebecValues.employerQpip,
          totalEmployerObligations: quebecValues.totalEmployerObligations,
          totalPayrollCost: roundMoney(netPay + quebecValues.totalEmployerObligations),
        };
      }

      if (row.jurisdiction === 'US') {
        const usaValues = buildUsaStatutoryValues(taxableGrossPay);
        const totalDeductions = roundMoney(
          usaValues.federalTax
          + usaValues.provincialTax
          + usaValues.employeeCpp
          + usaValues.employeeEi
          + internalDeductions,
        );
        const netPay = roundMoney(grossPay - totalDeductions);

        return {
          ...row,
          variablePayTotal,
          grossPay,
          totalEarnings,
          federalTax: usaValues.federalTax,
          provincialTax: usaValues.provincialTax,
          employeeCpp: usaValues.employeeCpp,
          employeeCpp2: 0,
          employeeEi: usaValues.employeeEi,
          otherDeductions: internalDeductions,
          totalDeductions,
          netPay,
          employerCpp: usaValues.employerCpp,
          employerCpp2: 0,
          employerEi: usaValues.employerEi,
          payrollStateTax: usaValues.payrollStateTax,
          employerBenefits: usaValues.employerBenefits,
          totalEmployerObligations: usaValues.totalEmployerObligations,
          totalPayrollCost: roundMoney(netPay + usaValues.totalEmployerObligations),
        };
      }

      if (row.jurisdiction === 'CO') {
        const colombiaValues = buildColombiaStatutoryValues(taxableGrossPay);
        const totalDeductions = roundMoney(
          colombiaValues.employeeHealth
          + colombiaValues.employeePension
          + colombiaValues.withholdingTax
          + internalDeductions,
        );
        const netPay = roundMoney(grossPay - totalDeductions);

        return {
          ...row,
          variablePayTotal,
          grossPay,
          totalEarnings,
          employeeHealth: colombiaValues.employeeHealth,
          employeePension: colombiaValues.employeePension,
          withholdingTax: colombiaValues.withholdingTax,
          otherDeductions: internalDeductions,
          totalDeductions,
          netPay,
          employerHealth: colombiaValues.employerHealth,
          employerPension: colombiaValues.employerPension,
          arl: colombiaValues.arl,
          severance: colombiaValues.severance,
          severanceInterest: colombiaValues.severanceInterest,
          serviceBonus: colombiaValues.serviceBonus,
          vacationProvision: colombiaValues.vacationProvision,
          familyCompensationFund: colombiaValues.familyCompensationFund,
          icbf: colombiaValues.icbf,
          sena: colombiaValues.sena,
          totalEmployerObligations: colombiaValues.totalEmployerObligations,
          totalPayrollCost: roundMoney(netPay + colombiaValues.totalEmployerObligations),
        };
      }

      if (row.jurisdiction === 'BR') {
        const brazilValues = buildBrazilStatutoryValues(taxableGrossPay);
        const totalDeductions = roundMoney(
          brazilValues.employeeInss
          + brazilValues.irrf
          + brazilValues.transportationVoucher
          + brazilValues.mealBenefitsDeduction
          + internalDeductions,
        );
        const netPay = roundMoney(grossPay - totalDeductions);

        return {
          ...row,
          variablePayTotal,
          grossPay,
          totalEarnings,
          employeeInss: brazilValues.employeeInss,
          irrf: brazilValues.irrf,
          transportationVoucher: brazilValues.transportationVoucher,
          mealBenefitsDeduction: brazilValues.mealBenefitsDeduction,
          otherDeductions: internalDeductions,
          totalDeductions,
          netPay,
          employerInss: brazilValues.employerInss,
          fgts: brazilValues.fgts,
          ratWorkAccident: brazilValues.ratWorkAccident,
          thirdPartyContributions: brazilValues.thirdPartyContributions,
          employerBenefits: brazilValues.employerBenefits,
          totalEmployerObligations: brazilValues.totalEmployerObligations,
          totalPayrollCost: roundMoney(netPay + brazilValues.totalEmployerObligations),
        };
      }

      const taxableEarnings = roundMoney(Math.max(0, row.totalEarnings - row.variablePayTotal + taxableVariablePay));
      const isrBeforeSubsidy = roundMoney(taxableEarnings * 0.09);
      const finalIsr = roundMoney(Math.max(0, isrBeforeSubsidy - row.employmentSubsidy));
      const employeeImss = roundMoney(taxableEarnings * 0.024);
      const infonavitDiscount = row.infonavitType === 'None' ? 0 : roundMoney(taxableEarnings * 0.01);
      const employerCosts = buildEmployerCosts(taxableEarnings);
      const totalDeductions = roundMoney(
        finalIsr + employeeImss + infonavitDiscount + row.loans + row.otherDiscounts + row.netAdjustment,
      );
      const netPay = roundMoney(totalEarnings - totalDeductions);

      return {
        ...row,
        variablePayTotal,
        grossPay,
        totalEarnings,
        isrBeforeSubsidy,
        finalIsr,
        employeeImss,
        infonavitDiscount,
        otherDeductions: internalDeductions,
        totalDeductions,
        netPay,
        employerImss: employerCosts.employerImss,
        employerInfonavit: employerCosts.employerInfonavit,
        sar: employerCosts.sar,
        payrollStateTax: employerCosts.payrollStateTax,
        occupationalRisk: employerCosts.occupationalRisk,
        childcareImss: employerCosts.childcareImss,
        totalEmployerObligations: employerCosts.totalEmployerObligations,
        totalPayrollCost: roundMoney(netPay + employerCosts.totalEmployerObligations),
      };
    }),
    [detailedRowsWithMode, variablePayByRow],
  );

  const effectiveDetailedRows = useMemo(
    () => detailedRowsWithVariable.map((row) => getEffectivePayrollValues(row)),
    [detailedRowsWithVariable],
  );

  const detailedRowsByJurisdiction = useMemo(
    () => groupPayrollEntitiesByJurisdiction(effectiveDetailedRows),
    [effectiveDetailedRows],
  );

  const availableJurisdictions = useMemo(
    () => Object.entries(detailedRowsByJurisdiction)
      .flatMap(([jurisdiction, rows]) => rows.length > 0 ? [jurisdiction as PayrollJurisdiction] : []),
    [detailedRowsByJurisdiction],
  );

  const activeRunJurisdiction = useMemo(
    () => resolveRunJurisdiction(availableJurisdictions, fallbackRunJurisdiction),
    [availableJurisdictions, fallbackRunJurisdiction],
  );

  const visibleDetailedRows = useMemo(
    () => filterPayrollItemsByJurisdiction(effectiveDetailedRows, activeRunJurisdiction),
    [activeRunJurisdiction, effectiveDetailedRows],
  );

  const activeProvinceLabel = useMemo(
    () => resolveJurisdictionProvinceLabel(
      visibleDetailedRows.map((row) => row.province),
      fallbackProvinceLabel,
      activeRunJurisdiction,
    ),
    [activeRunJurisdiction, fallbackProvinceLabel, visibleDetailedRows],
  );

  const derivedJurisdiction = useMemo(
    () => formatPayrollJurisdictionLabel(activeRunJurisdiction, activeProvinceLabel),
    [activeProvinceLabel, activeRunJurisdiction],
  );
  const displayJurisdictionLabel = isUnsupportedJurisdiction
    ? rawJurisdictionLabel || unsupportedJurisdictionMeta?.country || editCopy.unsupportedBadge
    : derivedJurisdiction;

  const baseSimplifiedRows: PayrollEditTableRow[] = visibleDetailedRows.map((row) => {
    const rowId = String(row.id);
    const variablePayItems = variablePayByRow[rowId] ?? createVariablePayDefaults(row);
    const variablePayTotal = roundMoney(sumVariablePay(variablePayItems));
    const statutoryPayroll = row.statutoryPayroll;
    const payrollMode: PayrollEditTableRow['payrollMode'] = row.payrollMode;
    const grossPay = row.jurisdiction === 'CA_STANDARD'
      || row.jurisdiction === 'CA_QUEBEC'
      || row.jurisdiction === 'BR'
      || row.jurisdiction === 'CO'
      ? row.grossPay
      : roundMoney(row.periodSalary + variablePayTotal);
    const internalDeductions = roundMoney(row.otherDeductions || (row.loans + row.otherDiscounts + row.netAdjustment));
    const statutoryDeductions = row.jurisdiction === 'CA_STANDARD'
      ? roundMoney(row.federalTax + row.provincialTax + row.employeeCpp + row.employeeCpp2 + row.employeeEi)
      : row.jurisdiction === 'CA_QUEBEC'
        ? roundMoney(
          row.federalTax
          + row.quebecProvincialTax
          + row.employeeQpp
          + row.employeeQpp2
          + row.employeeQpip
          + row.employeeEi,
        )
        : row.jurisdiction === 'BR'
          ? roundMoney(
            row.employeeInss
            + row.irrf
            + row.transportationVoucher
            + row.mealBenefitsDeduction,
          )
          : row.jurisdiction === 'US'
            ? roundMoney(
              row.federalTax
              + row.provincialTax
              + row.employeeCpp
              + row.employeeEi,
            )
          : row.jurisdiction === 'CO'
            ? roundMoney(
              row.employeeHealth
              + row.employeePension
              + row.withholdingTax,
            )
        : roundMoney(row.finalIsr + row.employeeImss + row.infonavitDiscount);
    const totalDeductions = statutoryPayroll ? row.totalDeductions : internalDeductions;

    const normalizedStatus: PayrollEditTableRow['status'] = run.status === 'processed'
      ? 'Processed'
      : run.status === 'draft'
        ? 'Draft'
        : 'Review';

    return {
      id: row.id,
      jurisdiction: row.jurisdiction,
      statutoryPayroll,
      payrollMode,
      employee: row.employee,
      unit: row.unit,
      business: row.business,
      employmentType: row.employmentType,
      province: row.province,
      daysWorked: row.daysPaid,
      daysAbsent: Math.max(0, 15 - row.daysPaid),
      periodSalary: row.periodSalary,
      transportAllowance: row.transportAllowance,
      variablePayTotal,
      variablePayItems,
      grossPay,
      internalDeductions,
      statutoryDeductions,
      totalDeductions,
      netPay: row.netPay,
      status: statutoryPayroll ? normalizedStatus : 'Internal only',
    };
  });

  useEffect(() => {
    setSimplifiedAttendanceSelection((current) => {
      let hasChanges = false;
      const next = { ...current };
      baseSimplifiedRows.forEach((row) => {
        const rowId = String(row.id);
        if (!next[rowId]) {
          next[rowId] = {
            daysWorked: row.daysWorked,
            daysAbsent: row.daysAbsent,
          };
          hasChanges = true;
        }
      });
      return hasChanges ? next : current;
    });
  }, [baseSimplifiedRows]);

  const simplifiedRows = useMemo(
    () => baseSimplifiedRows.map((row) => ({
      ...row,
      daysWorked: simplifiedAttendanceSelection[String(row.id)]?.daysWorked ?? row.daysWorked,
      daysAbsent: simplifiedAttendanceSelection[String(row.id)]?.daysAbsent ?? row.daysAbsent,
    })),
    [baseSimplifiedRows, simplifiedAttendanceSelection],
  );

  const simplifiedColumns = payrollSimplifiedColumnsByJurisdiction[activeRunJurisdiction];
  const detailedColumns = payrollDetailedColumnsByJurisdiction[activeRunJurisdiction];
  const activeEmployerSummaryConfig = payrollEmployerSummaryConfigByJurisdiction[activeRunJurisdiction];
  const activeDetailedStatutoryColumns = payrollStatutoryColumnKeysByJurisdiction[activeRunJurisdiction];

  const sortedSimplifiedRows = useMemo(() => {
    const rows = [...simplifiedRows];
    rows.sort((a, b) => {
      const av = a[sortColumn];
      const bv = b[sortColumn];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDirection === 'asc' ? av - bv : bv - av;
      }
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return sortDirection === 'asc'
          ? Number(av) - Number(bv)
          : Number(bv) - Number(av);
      }
      return sortDirection === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [simplifiedRows, sortColumn, sortDirection]);

  const sortedDetailedRows = useMemo(() => {
    const rows = [...visibleDetailedRows];
    rows.sort((a, b) => {
      const av = a[detailedSortColumn];
      const bv = b[detailedSortColumn];
      if (typeof av === 'number' && typeof bv === 'number') {
        return detailedSortDirection === 'asc' ? av - bv : bv - av;
      }
      return detailedSortDirection === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [visibleDetailedRows, detailedSortColumn, detailedSortDirection]);

  const totalSimplifiedNetPay = sortedSimplifiedRows.reduce((sum, row) => sum + row.netPay, 0);
  const totalDetailedNetPay = sortedDetailedRows.reduce((sum, row) => sum + row.netPay, 0);

  const employerSummary = useMemo(() => {
    const statutoryTotals = sortedDetailedRows.reduce((totals, row) => {
      if (!row.statutoryPayroll) {
        return totals;
      }

      return {
        employerImss: totals.employerImss + row.employerImss,
        employerInfonavit: totals.employerInfonavit + row.employerInfonavit,
        sar: totals.sar + row.sar,
        payrollStateTax: totals.payrollStateTax + row.payrollStateTax,
        occupationalRisk: totals.occupationalRisk + row.occupationalRisk,
        childcareImss: totals.childcareImss + row.childcareImss,
        employerCpp: totals.employerCpp + row.employerCpp,
        employerCpp2: totals.employerCpp2 + row.employerCpp2,
        employerEi: totals.employerEi + row.employerEi,
        employerBenefits: totals.employerBenefits + row.employerBenefits,
        employerQpp: totals.employerQpp + row.employerQpp,
        employerQpp2: totals.employerQpp2 + row.employerQpp2,
        employerQpip: totals.employerQpip + row.employerQpip,
        employerHealth: totals.employerHealth + row.employerHealth,
        employerPension: totals.employerPension + row.employerPension,
        arl: totals.arl + row.arl,
        severance: totals.severance + row.severance,
        severanceInterest: totals.severanceInterest + row.severanceInterest,
        serviceBonus: totals.serviceBonus + row.serviceBonus,
        vacationProvision: totals.vacationProvision + row.vacationProvision,
        familyCompensationFund: totals.familyCompensationFund + row.familyCompensationFund,
        icbf: totals.icbf + row.icbf,
        sena: totals.sena + row.sena,
        employerInss: totals.employerInss + row.employerInss,
        fgts: totals.fgts + row.fgts,
        ratWorkAccident: totals.ratWorkAccident + row.ratWorkAccident,
        thirdPartyContributions: totals.thirdPartyContributions + row.thirdPartyContributions,
        totalEmployerObligations: totals.totalEmployerObligations + row.totalEmployerObligations,
        totalPayrollCost: totals.totalPayrollCost,
      };
    }, emptyEmployerSummary());

    return {
      ...statutoryTotals,
      totalPayrollCost: roundMoney(sortedDetailedRows.reduce((sum, row) => sum + row.totalPayrollCost, 0)),
    };
  }, [sortedDetailedRows]);

  const totalPayrollCost = employerSummary.totalPayrollCost;

  const runSummaryCards: Array<{ label: string; value: string; key?: 'status' }> = [
    { label: copy.labels.frequency, value: frequencyLabel },
    { label: copy.labels.payrollType, value: payrollTypeLabel },
    { label: copy.labels.employees, value: String(visibleDetailedRows.length || run.users_count) },
    { label: copy.labels.jurisdiction, value: displayJurisdictionLabel },
    { label: copy.labels.status, value: statusLabel, key: 'status' as const },
  ];

  const attendanceMaxByField: Record<PayrollEditableAttendanceField, number> = {
    daysWorked: 31,
    daysAbsent: 31,
    daysPaid: 31,
    overtimeHours: 24,
    vacationDays: 31,
    paidHolidays: 31,
  };

  const simplifiedNonNumericColumns = new Set<PayrollEditTableColumnKey>([
    'statutoryPayroll',
    'employee',
    'unit',
    'business',
    'employmentType',
    'province',
    'status',
    'breakdown',
  ]);

  const detailedTextColumns = new Set<PayrollDetailedColumnKey>([
    'employee',
    'rfc',
    'curp',
    'nss',
    'sin',
    'cpf',
    'pisPasep',
    'idNumber',
    'contractType',
    'province',
    'unit',
    'business',
    'employmentType',
    'payType',
    'contributionType',
    'infonavitType',
    'breakdown',
  ]);

  const detailedStatutoryColumnsForPrint = new Set<PayrollDetailedColumnKey>(activeDetailedStatutoryColumns);
  const simplifiedStatusLabels: Record<PayrollEditTableRow['status'], string> = {
    Processed: copy.statuses.processed,
    Draft: copy.statuses.draft,
    Review: copy.operationalStatus.review,
    'Internal only': editCopy.internalOnly,
  };

  const renderAttendanceSelect = (
    value: number,
    onChangeValue: (nextValue: number) => void,
    field: PayrollEditableAttendanceField,
    alignCenter = false,
  ) => (
    <select
      value={value}
      onChange={(event) => onChangeValue(Number(event.target.value))}
      disabled={isSaving}
      className={`h-8 w-full min-w-[84px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-[#59C3A5] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${alignCenter ? 'text-center' : ''}`}
    >
      {Array.from({ length: attendanceMaxByField[field] + 1 }, (_, option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );

  const renderSimplifiedCell = (row: PayrollEditTableRow, key: PayrollEditTableColumnKey) => {
    const rowId = String(row.id);
    switch (key) {
      case 'statutoryPayroll':
        return (
          <TableCell className="sticky left-0 z-20 border-r border-slate-200 bg-white px-4 py-3 align-top dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={row.statutoryPayroll}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setStatutorySelection((current) => ({
                    ...current,
                    [rowId]: checked,
                  }));
                }}
                disabled={isSaving}
                className="h-4 w-4 rounded border-slate-300 text-[#59C3A5] focus:ring-[#59C3A5]"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {row.statutoryPayroll ? 'Statutory' : 'Internal only'}
              </span>
            </div>
          </TableCell>
        );
      case 'employee':
        return <TableCell className="px-4 py-3 align-top font-medium text-slate-900 dark:text-white">{row.employee}</TableCell>;
      case 'employmentType':
        return <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{row.employmentType}</TableCell>;
      case 'province':
        return <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{row.province || '—'}</TableCell>;
      case 'unit':
      case 'business':
        return <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{row[key]}</TableCell>;
      case 'daysWorked':
        return (
          <TableCell className="px-4 py-3 align-top">
            {renderAttendanceSelect(
              row.daysWorked,
              (nextValue) => setSimplifiedAttendanceSelection((current) => ({
                ...current,
                [rowId]: { ...current[rowId], daysWorked: nextValue },
              })),
              'daysWorked',
            )}
          </TableCell>
        );
      case 'daysAbsent':
        return (
          <TableCell className="px-4 py-3 align-top">
            {renderAttendanceSelect(
              row.daysAbsent,
              (nextValue) => setSimplifiedAttendanceSelection((current) => ({
                ...current,
                [rowId]: { ...current[rowId], daysAbsent: nextValue },
              })),
              'daysAbsent',
            )}
          </TableCell>
        );
      case 'variablePay': {
        const bonusCount = row.variablePayItems.filter((item) => item.included && item.type === 'bonus').length;
        const commissionCount = row.variablePayItems.filter((item) => item.included && item.type === 'commission').length;
        const adjustmentCount = row.variablePayItems.filter((item) => item.included && item.type === 'adjustment').length;
        const summaryPieces = [
          bonusCount > 0 ? `${bonusCount} ${editCopy.bonuses}` : '',
          commissionCount > 0 ? `${commissionCount} ${editCopy.commissions}` : '',
          adjustmentCount > 0 ? `${adjustmentCount} ${editCopy.adjustments}` : '',
        ].filter(Boolean);

        return (
          <TableCell className="px-4 py-3 align-top">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatAmount(row.variablePayTotal)}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{summaryPieces.length > 0 ? summaryPieces.join(' · ') : editCopy.noVariableItems}</span>
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg px-2.5"
                  onClick={() => setVariablePayEditorRowId(rowId)}
                >
                  {editCopy.manage}
                </Button>
              </div>
            </div>
          </TableCell>
        );
      }
      case 'grossPay':
        return <TableCell className="px-4 py-3 align-top font-medium text-slate-900 dark:text-slate-100">{formatAmount(row.grossPay)}</TableCell>;
      case 'transportAllowance':
        return <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{formatAmount(row.transportAllowance)}</TableCell>;
      case 'totalDeductions':
        return (
          <TableCell className="px-4 py-3 align-top font-medium text-rose-700 dark:text-rose-300">
            <div className="flex flex-col">
              <span>{formatAmount(row.totalDeductions)}</span>
              {!row.statutoryPayroll && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400" title={editCopy.internalOnlyDeductionsHint}>
                  {editCopy.internalOnlyDeductions}
                </span>
              )}
            </div>
          </TableCell>
        );
      case 'netPay':
        return <TableCell className="px-4 py-3 align-top font-semibold text-[#59C3A5] dark:text-blue-300">{formatAmount(row.netPay)}</TableCell>;
      case 'status':
        return (
          <TableCell className="px-4 py-3 align-top">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'Processed'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : row.status === 'Internal only'
                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
            >
              {simplifiedStatusLabels[row.status]}
            </span>
          </TableCell>
        );
      case 'breakdown':
        return (
          <TableCell className="px-4 py-3 align-top text-right">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const detail = visibleDetailedRows.find((item) => String(item.id) === rowId);
                if (!detail) return;
                setBreakdownRow({
                  ...detail,
                  periodStartDate: run.period_start_date,
                  periodEndDate: run.period_end_date,
                });
              }}
              className="h-8 rounded-lg px-2.5"
            >
              <Info className="mr-1 h-3.5 w-3.5" />
              {editCopy.breakdown}
            </Button>
          </TableCell>
        );
      default:
        return <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{formatAmount(row[key] as number)}</TableCell>;
    }
  };

  const renderDetailedCell = (row: PayrollDetailedRow, key: PayrollDetailedColumnKey) => {
    const rowId = String(row.id);
    const effectiveRow = getEffectivePayrollValues(row);
    const isStatutoryField = activeDetailedStatutoryColumns.includes(key);

    if (isStatutoryField && !effectiveRow.statutoryPayroll) {
      return (
        <TableCell className="px-3 py-3 align-top text-right text-slate-400 dark:text-slate-500" title={editCopy.disabledInternalControl}>
          —
        </TableCell>
      );
    }

    switch (key) {
      case 'employee':
        return <TableCell className="px-3 py-3 align-top font-medium text-slate-900 whitespace-nowrap dark:text-white">{effectiveRow.employee}</TableCell>;
      case 'rfc':
      case 'curp':
      case 'nss':
      case 'sin':
      case 'cpf':
      case 'pisPasep':
      case 'idNumber':
        return <TableCell className="px-3 py-3 align-top font-mono text-xs text-slate-700 whitespace-nowrap dark:text-slate-200">{effectiveRow[key]}</TableCell>;
      case 'unit':
      case 'business':
      case 'province':
      case 'employmentType':
      case 'payType':
      case 'contractType':
      case 'contributionType':
      case 'infonavitType':
        return <TableCell className="px-3 py-3 align-top text-slate-700 whitespace-nowrap dark:text-slate-200">{effectiveRow[key]}</TableCell>;
      case 'daysPaid':
        return (
          <TableCell className="px-3 py-3 align-top">
            {renderAttendanceSelect(
              effectiveRow.daysPaid,
              (nextValue) => setDetailedAttendanceSelection((current) => ({
                ...current,
                [rowId]: { ...current[rowId], daysPaid: nextValue },
              })),
              'daysPaid',
              true,
            )}
          </TableCell>
        );
      case 'overtimeHours':
        return (
          <TableCell className="px-3 py-3 align-top">
            {renderAttendanceSelect(
              effectiveRow.overtimeHours,
              (nextValue) => setDetailedAttendanceSelection((current) => ({
                ...current,
                [rowId]: { ...current[rowId], overtimeHours: nextValue },
              })),
              'overtimeHours',
              true,
            )}
          </TableCell>
        );
      case 'totalEarnings':
      case 'employmentSubsidy':
        return <TableCell className="px-3 py-3 align-top text-right font-medium text-emerald-700 dark:text-emerald-300">{formatAmount(effectiveRow[key])}</TableCell>;
      case 'federalTax':
      case 'provincialTax':
      case 'quebecProvincialTax':
      case 'isrBeforeSubsidy':
      case 'finalIsr':
      case 'employeeImss':
      case 'employeeCpp':
      case 'employeeCpp2':
      case 'employeeEi':
      case 'employeeInss':
      case 'irrf':
      case 'transportationVoucher':
      case 'mealBenefitsDeduction':
      case 'employeeQpp':
      case 'employeeQpp2':
      case 'employeeQpip':
      case 'employeeHealth':
      case 'employeePension':
      case 'withholdingTax':
      case 'infonavitDiscount':
      case 'employerImss':
      case 'employerInfonavit':
      case 'sar':
      case 'payrollStateTax':
      case 'occupationalRisk':
      case 'childcareImss':
      case 'employerCpp':
      case 'employerCpp2':
      case 'employerEi':
      case 'employerQpp':
      case 'employerQpp2':
      case 'employerQpip':
      case 'loans':
      case 'otherDeductions':
      case 'otherDiscounts':
      case 'netAdjustment':
      case 'totalDeductions':
        return <TableCell className="px-3 py-3 align-top text-right font-medium text-rose-700 dark:text-rose-300">{formatAmount(effectiveRow[key] as number)}</TableCell>;
      case 'employerBenefits':
      case 'employerHealth':
      case 'employerPension':
      case 'arl':
      case 'severance':
      case 'severanceInterest':
      case 'serviceBonus':
      case 'vacationProvision':
      case 'familyCompensationFund':
      case 'icbf':
      case 'sena':
      case 'employerInss':
      case 'fgts':
      case 'ratWorkAccident':
      case 'thirdPartyContributions':
      case 'totalEmployerObligations':
        return <TableCell className="px-3 py-3 align-top text-right font-medium text-slate-900 dark:text-slate-100">{formatAmount(effectiveRow[key] as number)}</TableCell>;
      case 'netPay':
        return <TableCell className="px-3 py-3 align-top text-right font-semibold text-[#59C3A5] dark:text-blue-300">{formatAmount(effectiveRow.netPay)}</TableCell>;
      case 'totalPayrollCost':
        return <TableCell className="px-3 py-3 align-top text-right font-semibold text-[#59C3A5] dark:text-blue-300">{formatAmount(effectiveRow.totalPayrollCost)}</TableCell>;
      case 'breakdown':
        return (
          <TableCell className="px-3 py-3 align-top text-right">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setBreakdownRow({
                ...effectiveRow,
                periodStartDate: run.period_start_date,
                periodEndDate: run.period_end_date,
              })}
              className="h-8 rounded-lg px-2.5"
            >
              <Info className="mr-1 h-3.5 w-3.5" />
              {editCopy.breakdown}
            </Button>
          </TableCell>
        );
      default:
        return <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(effectiveRow[key] as number)}</TableCell>;
    }
  };

  const formatSimplifiedPrintValue = (row: PayrollEditTableRow, key: PayrollEditTableColumnKey) => {
    switch (key) {
      case 'statutoryPayroll':
        return row.statutoryPayroll ? editCopy.statutory : editCopy.internalOnly;
      case 'employee':
      case 'unit':
      case 'business':
      case 'employmentType':
      case 'province':
        return row[key] ? String(row[key]) : '—';
      case 'status':
        return simplifiedStatusLabels[row.status];
      case 'daysWorked':
      case 'daysAbsent':
        return String(row[key]);
      case 'variablePay': {
        const bonusCount = row.variablePayItems.filter((item) => item.included && item.type === 'bonus').length;
        const commissionCount = row.variablePayItems.filter((item) => item.included && item.type === 'commission').length;
        const adjustmentCount = row.variablePayItems.filter((item) => item.included && item.type === 'adjustment').length;
        const summaryParts = [
          `${bonusCount} ${editCopy.bonuses}`,
          `${commissionCount} ${editCopy.commissions}`,
          `${adjustmentCount} ${editCopy.adjustments}`,
        ].filter((entry) => !entry.startsWith('0 '));
        return `${formatAmount(row.variablePayTotal)}${summaryParts.length ? ` (${summaryParts.join(' · ')})` : ''}`;
      }
      case 'breakdown':
        return editCopy.availableInApp;
      default:
        return formatAmount(row[key] as number);
    }
  };

  const formatDetailedPrintValue = (row: PayrollDetailedRow, key: PayrollDetailedColumnKey) => {
    const effectiveRow = getEffectivePayrollValues(row);
    if (detailedStatutoryColumnsForPrint.has(key) && !effectiveRow.statutoryPayroll) {
      return '—';
    }

    if (key === 'breakdown') {
      return editCopy.availableInApp;
    }

    const value = effectiveRow[key];
    if (value === undefined || value === null || value === '') {
      return '—';
    }

    if (typeof value === 'number') {
      if (key === 'daysPaid' || key === 'totalWorkedHours' || key === 'hoursPerDay' || key === 'overtimeHours') {
        return String(value);
      }
      return formatAmount(value);
    }

    return String(value);
  };

  const handlePrintMainPdf = () => {
    if (isUnsupportedJurisdiction) {
      return;
    }

    const printTitle = editCopy.printTitle(run.id, payrollViewMode === 'simplified' ? editCopy.printSimplified : editCopy.printDetailed);
    const headerHtml = `
      <div class="header">
        <h1>${escapePrintHtml(printTitle)}</h1>
        <p class="meta">${escapePrintHtml(editCopy.period)}: ${escapePrintHtml(formatDate(run.period_start_date, locale, run.period_start_date))} - ${escapePrintHtml(formatDate(run.period_end_date, locale, run.period_end_date))}</p>
        <p class="meta">${escapePrintHtml(editCopy.unit)}: ${escapePrintHtml(unitLabel)} | ${escapePrintHtml(editCopy.business)}: ${escapePrintHtml(businessLabel)} | ${escapePrintHtml(editCopy.jurisdiction)}: ${escapePrintHtml(displayJurisdictionLabel)}</p>
        <p class="meta">${escapePrintHtml(editCopy.status)}: ${escapePrintHtml(copy.statuses[form.status])}</p>
      </div>
    `;

    const tableHtml = payrollViewMode === 'simplified'
      ? `
        <div class="section">
          <h2>${escapePrintHtml(editCopy.simplifiedEmployees)}</h2>
          <table>
            <thead>
              <tr>${simplifiedColumns.map((column) => `<th>${escapePrintHtml(column.label)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${sortedSimplifiedRows.map((row) => `<tr>${simplifiedColumns.map((column) => {
        const value = formatSimplifiedPrintValue(row, column.key);
        const isNumeric = !simplifiedNonNumericColumns.has(column.key);
        return `<td class="${isNumeric ? 'num' : ''}">${escapePrintHtml(value)}</td>`;
      }).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <p class="meta" style="margin-top:8px;">${escapePrintHtml(editCopy.totalNetPay)}: ${escapePrintHtml(formatAmount(totalSimplifiedNetPay))}</p>
        </div>
      `
      : `
        <div class="section">
          <h2>${escapePrintHtml(editCopy.detailedEmployees)}</h2>
          <table>
            <thead>
              <tr>${detailedColumns.map((column) => `<th>${escapePrintHtml(column.label)}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${sortedDetailedRows.map((row) => `<tr>${detailedColumns.map((column) => {
        const value = formatDetailedPrintValue(row, column.key);
        const isNumeric = !detailedTextColumns.has(column.key);
        return `<td class="${isNumeric ? 'num' : ''} ${value === '—' ? 'muted' : ''}">${escapePrintHtml(value)}</td>`;
      }).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <p class="meta" style="margin-top:8px;">${escapePrintHtml(editCopy.totalNetPay)}: ${escapePrintHtml(formatAmount(totalDetailedNetPay))}</p>
        </div>
      `;

    const summaryHtml = `
      <div class="section">
        <h2>${escapePrintHtml(editCopy.employerCostSummary)}</h2>
        <p class="meta">${escapePrintHtml(activeEmployerSummaryConfig.helperText)}</p>
        <div class="grid" style="margin-top:8px;">
          ${activeEmployerSummaryConfig.metrics.map((metric) => `
            <div class="card" style="${metric.accent === 'primary' ? 'border-color:#59C3A5;background:#eef4ff;' : ''}">
              <p class="card-title" style="${metric.accent === 'primary' ? 'color:#59C3A5;' : ''}">${escapePrintHtml(metric.label)}</p>
              <p class="card-value" style="${metric.accent === 'primary' ? 'color:#59C3A5;' : ''}">${escapePrintHtml(formatAmount(employerSummary[metric.key]))}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const printed = printHtmlDocument({
      title: printTitle,
      orientation: 'landscape',
      bodyHtml: `${headerHtml}${tableHtml}${summaryHtml}`,
    });

    if (!printed) {
      onPrint();
    }
  };

  const toggleSort = (column: PayrollEditTableColumnKey) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('asc');
  };

  const toggleDetailedSort = (column: PayrollDetailedColumnKey) => {
    if (detailedSortColumn === column) {
      setDetailedSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setDetailedSortColumn(column);
    setDetailedSortDirection('asc');
  };

  const variablePayEditorRow = variablePayEditorRowId
    ? effectiveDetailedRows.find((row) => String(row.id) === variablePayEditorRowId) ?? null
    : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}>
        <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 z-[85] flex h-screen !w-screen max-h-none !max-w-none sm:!max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none dark:bg-slate-900 [&>button]:hidden">
          <header className="border-b border-white/20 bg-[#59C3A5] px-6 py-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-semibold tracking-tight">
                  {copy.labels.edit} #{run.id} · {displayJurisdictionLabel}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-blue-100">
                  {copy.labels.period}: {formatDate(run.period_start_date, locale, run.period_start_date)} - {formatDate(run.period_end_date, locale, run.period_end_date)}
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/50 bg-white/10 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={copy.labels.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/40">
            <div className="space-y-5 px-6 py-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {runSummaryCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{card.label}</p>
                      {card.key === 'status' ? (
                        <select
                          value={form.status}
                          onChange={(event) => onChange({
                            ...form,
                            status: event.target.value as PayrollRunSummary['status'],
                          })}
                          disabled={isSaving}
                          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-[#59C3A5] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                          aria-label={copy.labels.status}
                        >
                          <option value="draft">{copy.statuses.draft}</option>
                          <option value="processed">{copy.statuses.processed}</option>
                          <option value="approved">{copy.statuses.approved}</option>
                          <option value="paid">{copy.statuses.paid}</option>
                          <option value="cancelled">{copy.statuses.cancelled}</option>
                        </select>
                      ) : (
                        <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white" title={String(card.value)}>{card.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {isUnsupportedJurisdiction ? (
                <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900/50 dark:bg-slate-900/70">
                  <div className="max-w-3xl space-y-3">
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                      {editCopy.unsupportedBadge}
                    </span>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {editCopy.unsupportedTitle(displayJurisdictionLabel)}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {editCopy.unsupportedDescription}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {editCopy.unsupportedAction}
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {editCopy.tableTitle}
                        </h4>
                        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              if (payrollViewMode !== 'simplified') {
                                setPayrollViewMode('simplified');
                              }
                            }}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${payrollViewMode === 'simplified'
                              ? 'bg-[#59C3A5] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                              }`}
                          >
                            {editCopy.simplifiedMode}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (payrollViewMode !== 'detailed') {
                                setPayrollViewMode('detailed');
                              }
                            }}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${payrollViewMode === 'detailed'
                              ? 'bg-[#59C3A5] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                              }`}
                          >
                            {editCopy.detailedMode}
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {editCopy.tableHint}
                      </p>
                    </div>

                    {isDetailLoading ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        <LoaderCircle className="mx-auto mb-3 h-5 w-5 animate-spin" />
                        {copy.loading}
                      </div>
                    ) : payrollViewMode === 'simplified' ? (
                      <div className="overflow-x-auto">
                        <Table className="min-w-[2050px]">
                          <TableHeader>
                            <TableRow className="border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/70">
                              {simplifiedColumns.map((column) => (
                                <TableHead
                                  key={column.key}
                                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap ${column.key === 'statutoryPayroll' ? 'sticky left-0 z-30 border-r border-slate-200 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-900/95' : ''}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleSort(column.key)}
                                    className="inline-flex items-center gap-1 text-left"
                                  >
                                    <span>{column.label}</span>
                                    {sortColumn === column.key ? (
                                      sortDirection === 'asc' ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      )
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 opacity-30" />
                                    )}
                                  </button>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedSimplifiedRows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={simplifiedColumns.length} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                  {noRowsLabel}
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {sortedSimplifiedRows.map((row) => (
                                  <TableRow key={row.id} className="border-slate-200 dark:border-slate-700">
                                    {simplifiedColumns.map((column) => (
                                      <Fragment key={column.key}>{renderSimplifiedCell(row, column.key)}</Fragment>
                                    ))}
                                  </TableRow>
                                ))}
                                <TableRow className="border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70">
                                  {simplifiedColumns.map((column, index) => {
                                    if (column.key === 'netPay') {
                                      return (
                                        <TableCell key={column.key} className="px-4 py-3 align-top font-bold text-[#59C3A5] dark:text-blue-300">
                                          {formatAmount(totalSimplifiedNetPay)}
                                        </TableCell>
                                      );
                                    }
                                    if (index === 0) {
                                      return (
                                        <TableCell key={column.key} className="sticky left-0 z-20 border-r border-slate-300 bg-slate-100/95 px-4 py-3 align-top text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-300">
                                          {editCopy.total}
                                        </TableCell>
                                      );
                                    }
                                    return <TableCell key={column.key} className="px-4 py-3 align-top" />;
                                  })}
                                </TableRow>
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-[3500px]">
                          <TableHeader>
                            <TableRow className="border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/70">
                              {detailedColumns.map((column) => (
                                <TableHead key={column.key} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => toggleDetailedSort(column.key)}
                                    className="inline-flex items-center gap-1 text-left"
                                  >
                                    <span>{column.label}</span>
                                    {detailedSortColumn === column.key ? (
                                      detailedSortDirection === 'asc' ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      )
                                    ) : (
                                      <ChevronDown className="h-3.5 w-3.5 opacity-30" />
                                    )}
                                  </button>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedDetailedRows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={detailedColumns.length} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                  {noRowsLabel}
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {sortedDetailedRows.map((row) => (
                                  <TableRow key={row.id} className="border-slate-200 dark:border-slate-700">
                                    {detailedColumns.map((column) => (
                                      <Fragment key={column.key}>{renderDetailedCell(row, column.key)}</Fragment>
                                    ))}
                                  </TableRow>
                                ))}
                                <TableRow className="border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70">
                                  {detailedColumns.map((column, index) => {
                                    if (column.key === 'netPay') {
                                      return (
                                        <TableCell key={column.key} className="px-3 py-3 align-top text-right font-bold text-[#59C3A5] dark:text-blue-300">
                                          {formatAmount(totalDetailedNetPay)}
                                        </TableCell>
                                      );
                                    }
                                    if (index === 0) {
                                      return (
                                        <TableCell key={column.key} className="px-3 py-3 align-top text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                          {editCopy.total}
                                        </TableCell>
                                      );
                                    }
                                    return <TableCell key={column.key} className="px-3 py-3 align-top" />;
                                  })}
                                </TableRow>
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{editCopy.employerCostSummary}</h4>
                      <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{editCopy.readOnly}</span>
                    </div>
                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                      {activeEmployerSummaryConfig.helperText}
                    </p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {activeEmployerSummaryConfig.metrics.map((metric) => (
                        <div
                          key={metric.key}
                          className={metric.accent === 'primary'
                            ? 'rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/5 px-3 py-2 dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/20'
                            : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60'}
                        >
                          <p className={metric.accent === 'primary'
                            ? 'text-xs font-semibold uppercase tracking-wide text-[#59C3A5] dark:text-blue-300'
                            : 'text-xs font-semibold uppercase tracking-wide text-slate-500'}
                          >
                            {metric.label}
                          </p>
                          <p className={metric.accent === 'primary'
                            ? 'mt-1 text-sm font-bold text-[#59C3A5] dark:text-blue-300'
                            : 'mt-1 text-sm font-semibold text-slate-900 dark:text-white'}
                          >
                            {formatAmount(employerSummary[metric.key])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl"
            >
              {copy.labels.cancel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintMainPdf}
              disabled={isSaving || isUnsupportedJurisdiction}
              className="gap-2 rounded-xl"
            >
              <Printer className="h-4 w-4" />
              {copy.labels.print}
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="gap-2 rounded-xl bg-[#59C3A5] text-white hover:bg-[#3AAE90]"
            >
              <Save className="h-4 w-4" />
              {copy.labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PayrollBreakdownModal
        isOpen={Boolean(breakdownRow)}
        onClose={() => setBreakdownRow(null)}
        employee={breakdownRow}
        copy={copy.breakdown}
      />

      <VariablePayModal
        copy={copy.variablePay}
        isOpen={Boolean(variablePayEditorRow)}
        employeeName={variablePayEditorRow?.employee || copy.labels.employee}
        items={variablePayEditorRow ? (variablePayByRow[String(variablePayEditorRow.id)] ?? createVariablePayDefaults(variablePayEditorRow)) : []}
        onClose={() => setVariablePayEditorRowId(null)}
        onSave={(nextItems) => {
          if (!variablePayEditorRow) {
            return;
          }
          setVariablePayByRow((current) => ({
            ...current,
            [String(variablePayEditorRow.id)]: nextItems,
          }));
          setVariablePayEditorRowId(null);
        }}
      />
    </>
  );
}

function PayrollBreakdownModal({
  isOpen,
  onClose,
  employee,
  copy,
}: PayrollBreakdownModalProps) {
  const formatCurrency = (value: number): string => value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatNumber = (value: number): string => value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  type BreakdownValueRow = {
    label: string;
    value: number | string;
    tone?: 'positive' | 'negative' | 'primary' | 'neutral';
  };
  const rowsCopy = copy.rows;

  const formatBreakdownValue = (value: number | string) => (
    typeof value === 'number' ? formatCurrency(value) : value
  );

  const toneClassName = (tone: BreakdownValueRow['tone']) => {
    switch (tone) {
      case 'positive':
        return 'text-emerald-700 dark:text-emerald-300';
      case 'negative':
        return 'text-rose-700 dark:text-rose-300';
      case 'primary':
        return 'text-[#59C3A5] dark:text-blue-300';
      default:
        return 'text-slate-700 dark:text-slate-200';
    }
  };

  const renderValueRows = (rows: BreakdownValueRow[]) => (
    <div className="mt-3 space-y-2 text-sm">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className={`flex items-center justify-between ${index === rows.length - 1 ? 'border-t border-slate-200 pt-2 font-semibold dark:border-slate-700' : ''}`}
        >
          <span>{row.label}</span>
          <span className={toneClassName(row.tone)}>{formatBreakdownValue(row.value)}</span>
        </div>
      ))}
    </div>
  );

  const buildPrintRows = (rows: BreakdownValueRow[]) => rows
    .map((row) => `<tr><th>${escapePrintHtml(row.label)}</th><td class="${typeof row.value === 'number' ? 'num' : ''}">${escapePrintHtml(formatBreakdownValue(row.value))}</td></tr>`)
    .join('');

  const buildPrintSection = (title: string, rows: BreakdownValueRow[], note?: string) => `
    <div class="section">
      <h2>${escapePrintHtml(title)}</h2>
      <table>
        <tbody>${buildPrintRows(rows)}</tbody>
      </table>
      ${note ? `<p class="note">${escapePrintHtml(note)}</p>` : ''}
    </div>
  `;

  const getImssBreakdown = (row: PayrollRow): ImssBreakdownRow[] => {
    const employer = row.employerImss;
    const employeeImss = row.employeeImss;

    return [
      {
        concept: 'Disability and life',
        employer: employer * 0.16,
        employee: employeeImss * 0.2,
      },
      {
        concept: 'Retirement / cesantia y vejez',
        employer: employer * 0.22,
        employee: employeeImss * 0.32,
      },
      {
        concept: 'General sickness',
        employer: employer * 0.21,
        employee: employeeImss * 0.22,
      },
      {
        concept: 'Excess over 3 UMA',
        employer: employer * 0.08,
        employee: employeeImss * 0.1,
      },
      {
        concept: 'Medical expenses',
        employer: employer * 0.14,
        employee: employeeImss * 0.16,
      },
      {
        concept: 'Childcare',
        employer: row.childcareImss,
        employee: 0,
      },
      {
        concept: 'Occupational risk',
        employer: row.occupationalRisk,
        employee: 0,
      },
      {
        concept: 'Total IMSS',
        employer,
        employee: employeeImss,
      },
    ].map((item, index, arr) => {
      if (index === arr.length - 1) {
        return item;
      }

      return {
        ...item,
        employer: Math.round(item.employer * 100) / 100,
        employee: Math.round(item.employee * 100) / 100,
      };
    });
  };

  const getJurisdictionContributionBreakdown = (row: PayrollRow): ImssBreakdownRow[] => {
    if (row.jurisdiction === 'CA_STANDARD') {
      return [
        { concept: 'CPP', employer: row.employerCpp, employee: row.employeeCpp },
        { concept: 'CPP2', employer: row.employerCpp2, employee: row.employeeCpp2 },
        { concept: 'EI', employer: row.employerEi, employee: row.employeeEi },
        { concept: 'Employer benefits', employer: row.employerBenefits, employee: 0 },
        {
          concept: 'Total statutory contributions',
          employer: row.totalEmployerObligations,
          employee: row.employeeCpp + row.employeeCpp2 + row.employeeEi,
        },
      ];
    }

    if (row.jurisdiction === 'CA_QUEBEC') {
      return [
        { concept: 'QPP', employer: row.employerQpp, employee: row.employeeQpp },
        { concept: 'QPP2', employer: row.employerQpp2, employee: row.employeeQpp2 },
        { concept: 'QPIP', employer: row.employerQpip, employee: row.employeeQpip },
        { concept: 'EI', employer: row.employerEi, employee: row.employeeEi },
        { concept: 'Employer benefits', employer: row.employerBenefits, employee: 0 },
        {
          concept: 'Total statutory contributions',
          employer: row.totalEmployerObligations,
          employee: row.employeeQpp + row.employeeQpp2 + row.employeeQpip + row.employeeEi,
        },
      ];
    }

    if (row.jurisdiction === 'US') {
      return [
        { concept: 'Social Security', employer: row.employerCpp, employee: row.employeeCpp },
        { concept: 'Medicare', employer: row.employerEi, employee: row.employeeEi },
        { concept: 'FUTA / SUTA', employer: row.payrollStateTax, employee: 0 },
        { concept: 'Employer benefits', employer: row.employerBenefits, employee: 0 },
      ];
    }

    if (row.jurisdiction === 'BR') {
      return [
        { concept: 'INSS', employer: row.employerInss, employee: row.employeeInss },
        { concept: 'IRRF', employer: 0, employee: row.irrf },
        { concept: 'FGTS', employer: row.fgts, employee: 0 },
        { concept: 'RAT / Work Accident', employer: row.ratWorkAccident, employee: 0 },
        { concept: 'Third-party Contributions', employer: row.thirdPartyContributions, employee: 0 },
      ];
    }

    if (row.jurisdiction === 'CO') {
      return [
        { concept: 'Health', employer: row.employerHealth, employee: row.employeeHealth },
        { concept: 'Pension', employer: row.employerPension, employee: row.employeePension },
        { concept: 'ARL', employer: row.arl, employee: 0 },
        { concept: 'Family Compensation Fund', employer: row.familyCompensationFund, employee: 0 },
        { concept: 'ICBF', employer: row.icbf, employee: 0 },
        { concept: 'SENA', employer: row.sena, employee: 0 },
      ];
    }

    return getImssBreakdown(row);
  };

  const periodLabel = employee
    ? `${formatDate(employee.periodStartDate, 'en-US', employee.periodStartDate)} - ${formatDate(employee.periodEndDate, 'en-US', employee.periodEndDate)}`
    : '';

  const effectiveEmployee = employee ? getEffectivePayrollValues(employee) : null;
  const activeJurisdiction = effectiveEmployee?.jurisdiction ?? 'MX';
  const breakdownConfig = payrollBreakdownConfigByJurisdiction[activeJurisdiction];
  const isCanadaStandard = activeJurisdiction === 'CA_STANDARD';
  const isCanadaQuebec = activeJurisdiction === 'CA_QUEBEC';
  const isUsaPayroll = activeJurisdiction === 'US';
  const isBrazilPayroll = activeJurisdiction === 'BR';
  const isColombiaPayroll = activeJurisdiction === 'CO';
  const isCanadaPayroll = isCanadaStandard || isCanadaQuebec;
  const usesGrossPayModel = isCanadaPayroll || isUsaPayroll || isBrazilPayroll || isColombiaPayroll;
  const jurisdictionLabel = effectiveEmployee
    ? formatPayrollJurisdictionLabel(activeJurisdiction, effectiveEmployee.province)
    : '';
  const contributionBreakdown = effectiveEmployee ? getJurisdictionContributionBreakdown(effectiveEmployee) : [];

  const summaryRows: BreakdownValueRow[] = !effectiveEmployee
    ? []
    : [
      { label: rowsCopy.hrUserName, value: effectiveEmployee.employee },
      { label: copy.jurisdiction, value: jurisdictionLabel || '—' },
      { label: rowsCopy.unit, value: effectiveEmployee.unit || '—' },
      { label: rowsCopy.business, value: effectiveEmployee.business || '—' },
      ...(isCanadaPayroll
        ? [
          { label: copy.identity.sin, value: effectiveEmployee.sin || '—' },
          { label: copy.identity.province, value: effectiveEmployee.province || '—' },
          { label: rowsCopy.employmentType, value: effectiveEmployee.employmentType },
          { label: rowsCopy.payType, value: effectiveEmployee.payType },
          { label: rowsCopy.dailySalary, value: effectiveEmployee.dailyWage },
          { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay },
        ]
        : isUsaPayroll
          ? [
            { label: copy.identity.ssnTaxId, value: effectiveEmployee.sin || '—' },
            { label: copy.identity.state, value: effectiveEmployee.province || '—' },
            { label: rowsCopy.employmentType, value: effectiveEmployee.employmentType },
            { label: rowsCopy.payType, value: effectiveEmployee.payType },
            { label: rowsCopy.dailySalary, value: effectiveEmployee.dailyWage },
            { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay },
          ]
        : isColombiaPayroll
          ? [
            { label: copy.identity.idNumber, value: effectiveEmployee.idNumber || '—' },
            { label: copy.identity.contractType, value: effectiveEmployee.contractType },
            { label: rowsCopy.employmentType, value: effectiveEmployee.employmentType },
            { label: rowsCopy.payType, value: effectiveEmployee.payType },
            { label: rowsCopy.monthlySalary, value: effectiveEmployee.monthlySalary },
            { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay },
          ]
        : isBrazilPayroll
          ? [
            { label: copy.identity.cpf, value: effectiveEmployee.cpf || '—' },
            { label: copy.identity.pisPasep, value: effectiveEmployee.pisPasep || '—' },
            { label: rowsCopy.employmentType, value: effectiveEmployee.employmentType },
            { label: rowsCopy.payType, value: effectiveEmployee.payType },
            { label: rowsCopy.monthlySalary, value: effectiveEmployee.monthlySalary },
            { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay },
          ]
        : [
          { label: copy.identity.rfc, value: effectiveEmployee.rfc },
          { label: copy.identity.curp, value: effectiveEmployee.curp },
          { label: copy.identity.nss, value: effectiveEmployee.nss },
          { label: rowsCopy.dailySalary, value: effectiveEmployee.dailyWage },
          { label: rowsCopy.sdi, value: effectiveEmployee.integratedDailyWage },
          { label: rowsCopy.sbc, value: effectiveEmployee.baseContributionSalary },
        ]),
      { label: rowsCopy.daysPaid, value: String(effectiveEmployee.daysPaid) },
      { label: rowsCopy.netPay, value: effectiveEmployee.netPay, tone: 'primary' },
    ];

  const earningsRows: BreakdownValueRow[] = !effectiveEmployee
    ? []
    : isCanadaPayroll
      ? [
        { label: rowsCopy.periodSalary, value: effectiveEmployee.periodSalary },
        { label: rowsCopy.overtimeAmount, value: effectiveEmployee.overtimeAmount },
        { label: rowsCopy.variablePay, value: effectiveEmployee.variablePayTotal },
        { label: rowsCopy.vacationPay, value: effectiveEmployee.vacationPay },
        { label: rowsCopy.taxableBenefits, value: effectiveEmployee.taxableBenefits },
        { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay, tone: 'positive' },
      ]
      : isUsaPayroll
        ? [
          { label: rowsCopy.periodSalary, value: effectiveEmployee.periodSalary },
          { label: rowsCopy.overtimeAmount, value: effectiveEmployee.overtimeAmount },
          { label: rowsCopy.variablePay, value: effectiveEmployee.variablePayTotal },
          { label: rowsCopy.taxableBenefits, value: effectiveEmployee.taxableBenefits },
          { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay, tone: 'positive' },
        ]
      : isColombiaPayroll
        ? [
          { label: rowsCopy.periodSalary, value: effectiveEmployee.periodSalary },
          { label: rowsCopy.overtimeAmount, value: effectiveEmployee.overtimeAmount },
          { label: rowsCopy.nightSurcharge, value: effectiveEmployee.nightSurcharge },
          { label: rowsCopy.sundayHolidaySurcharge, value: effectiveEmployee.sundayHolidaySurcharge },
          { label: rowsCopy.transportAllowance, value: effectiveEmployee.transportAllowance },
          { label: rowsCopy.variablePay, value: effectiveEmployee.variablePayTotal },
          { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay, tone: 'positive' },
        ]
      : isBrazilPayroll
        ? [
          { label: rowsCopy.periodSalary, value: effectiveEmployee.periodSalary },
          { label: rowsCopy.overtimeAmount, value: effectiveEmployee.overtimeAmount },
          { label: rowsCopy.variablePay, value: effectiveEmployee.variablePayTotal },
          { label: rowsCopy.vacationPay, value: effectiveEmployee.vacationPay },
          { label: rowsCopy.vacationBonusOneThird, value: effectiveEmployee.vacationBonusOneThird },
          { label: rowsCopy.thirteenthSalaryProvision, value: effectiveEmployee.thirteenthSalaryProvision },
          { label: rowsCopy.taxableBenefits, value: effectiveEmployee.taxableBenefits },
          { label: rowsCopy.grossPay, value: effectiveEmployee.grossPay, tone: 'positive' },
        ]
      : [
        { label: rowsCopy.periodSalary, value: effectiveEmployee.periodSalary },
        { label: rowsCopy.overtimeAmount, value: effectiveEmployee.overtimeAmount },
        { label: rowsCopy.bonusesCommissions, value: effectiveEmployee.bonusesCommissions },
        { label: rowsCopy.vacationPremium, value: effectiveEmployee.vacationPremium },
        { label: rowsCopy.proportionalChristmasBonus, value: effectiveEmployee.proportionalChristmasBonus },
        { label: rowsCopy.totalEarnings, value: effectiveEmployee.totalEarnings, tone: 'positive' },
      ];

  const taxRows: BreakdownValueRow[] = !effectiveEmployee || !effectiveEmployee.statutoryPayroll
    ? []
    : isCanadaStandard
      ? [
        { label: rowsCopy.federalTax, value: effectiveEmployee.federalTax, tone: 'negative' },
        { label: rowsCopy.provincialTax, value: effectiveEmployee.provincialTax, tone: 'negative' },
      ]
      : isUsaPayroll
        ? [
          { label: rowsCopy.federalWithholding, value: effectiveEmployee.federalTax, tone: 'negative' },
          { label: rowsCopy.stateWithholding, value: effectiveEmployee.provincialTax, tone: 'negative' },
        ]
      : isCanadaQuebec
        ? [
          { label: rowsCopy.federalTax, value: effectiveEmployee.federalTax, tone: 'negative' },
          { label: rowsCopy.quebecProvincialTax, value: effectiveEmployee.quebecProvincialTax, tone: 'negative' },
        ]
        : isColombiaPayroll
          ? []
        : [
          { label: rowsCopy.isrBeforeSubsidy, value: effectiveEmployee.isrBeforeSubsidy, tone: 'negative' },
          { label: rowsCopy.employmentSubsidy, value: effectiveEmployee.employmentSubsidy, tone: 'positive' },
          { label: rowsCopy.finalIsr, value: effectiveEmployee.finalIsr, tone: 'negative' },
        ];

  const employeeDeductionRows: BreakdownValueRow[] = !effectiveEmployee || !effectiveEmployee.statutoryPayroll
    ? []
    : isCanadaStandard
      ? [
        { label: rowsCopy.employeeCpp, value: effectiveEmployee.employeeCpp, tone: 'negative' },
        { label: rowsCopy.employeeCpp2, value: effectiveEmployee.employeeCpp2, tone: 'negative' },
        { label: rowsCopy.employeeEi, value: effectiveEmployee.employeeEi, tone: 'negative' },
        { label: rowsCopy.otherDeductions, value: effectiveEmployee.otherDeductions, tone: 'negative' },
        { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
      ]
      : isUsaPayroll
        ? [
          { label: rowsCopy.employeeSocialSecurity, value: effectiveEmployee.employeeCpp, tone: 'negative' },
          { label: rowsCopy.employeeMedicare, value: effectiveEmployee.employeeEi, tone: 'negative' },
          { label: rowsCopy.otherDeductions, value: effectiveEmployee.otherDeductions, tone: 'negative' },
          { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
        ]
      : isCanadaQuebec
        ? [
          { label: rowsCopy.employeeQpp, value: effectiveEmployee.employeeQpp, tone: 'negative' },
          { label: rowsCopy.employeeQpp2, value: effectiveEmployee.employeeQpp2, tone: 'negative' },
          { label: rowsCopy.employeeQpip, value: effectiveEmployee.employeeQpip, tone: 'negative' },
          { label: rowsCopy.employeeEi, value: effectiveEmployee.employeeEi, tone: 'negative' },
          { label: rowsCopy.otherDeductions, value: effectiveEmployee.otherDeductions, tone: 'negative' },
          { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
        ]
        : isColombiaPayroll
          ? [
            { label: rowsCopy.employeeHealth, value: effectiveEmployee.employeeHealth, tone: 'negative' },
            { label: rowsCopy.employeePension, value: effectiveEmployee.employeePension, tone: 'negative' },
            { label: rowsCopy.withholdingTax, value: effectiveEmployee.withholdingTax, tone: 'negative' },
            { label: rowsCopy.otherDeductions, value: effectiveEmployee.otherDeductions, tone: 'negative' },
            { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
          ]
        : isBrazilPayroll
          ? [
            { label: rowsCopy.employeeInss, value: effectiveEmployee.employeeInss, tone: 'negative' },
            { label: rowsCopy.irrf, value: effectiveEmployee.irrf, tone: 'negative' },
            { label: rowsCopy.transportationVoucher, value: effectiveEmployee.transportationVoucher, tone: 'negative' },
            { label: rowsCopy.mealBenefitsDeduction, value: effectiveEmployee.mealBenefitsDeduction, tone: 'negative' },
            { label: rowsCopy.otherDeductions, value: effectiveEmployee.otherDeductions, tone: 'negative' },
            { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
          ]
        : [
          { label: rowsCopy.employeeImss, value: effectiveEmployee.employeeImss, tone: 'negative' },
          { label: rowsCopy.infonavitType, value: effectiveEmployee.infonavitType },
          { label: rowsCopy.infonavitDiscount, value: effectiveEmployee.infonavitDiscount, tone: 'negative' },
          { label: rowsCopy.loans, value: effectiveEmployee.loans, tone: 'negative' },
          { label: rowsCopy.otherDiscounts, value: effectiveEmployee.otherDiscounts, tone: 'negative' },
          { label: rowsCopy.netAdjustment, value: effectiveEmployee.netAdjustment, tone: effectiveEmployee.netAdjustment < 0 ? 'negative' : 'neutral' },
          { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
        ];

  const employerObligationRows: BreakdownValueRow[] = !effectiveEmployee || !effectiveEmployee.statutoryPayroll
    ? []
    : isCanadaStandard
      ? [
        { label: rowsCopy.employerCpp, value: effectiveEmployee.employerCpp },
        { label: rowsCopy.employerCpp2, value: effectiveEmployee.employerCpp2 },
        { label: rowsCopy.employerEi, value: effectiveEmployee.employerEi },
        { label: rowsCopy.employerBenefits, value: effectiveEmployee.employerBenefits },
        { label: rowsCopy.totalEmployerObligations, value: effectiveEmployee.totalEmployerObligations, tone: 'primary' },
      ]
      : isUsaPayroll
        ? [
          { label: rowsCopy.employerSocialSecurity, value: effectiveEmployee.employerCpp },
          { label: rowsCopy.employerMedicare, value: effectiveEmployee.employerEi },
          { label: rowsCopy.futaSuta, value: effectiveEmployee.payrollStateTax },
          { label: rowsCopy.employerBenefits, value: effectiveEmployee.employerBenefits },
          { label: rowsCopy.totalEmployerObligations, value: effectiveEmployee.totalEmployerObligations, tone: 'primary' },
        ]
      : isCanadaQuebec
        ? [
          { label: rowsCopy.employerQpp, value: effectiveEmployee.employerQpp },
          { label: rowsCopy.employerQpp2, value: effectiveEmployee.employerQpp2 },
          { label: rowsCopy.employerQpip, value: effectiveEmployee.employerQpip },
          { label: rowsCopy.employerEi, value: effectiveEmployee.employerEi },
          { label: rowsCopy.employerBenefits, value: effectiveEmployee.employerBenefits },
          { label: rowsCopy.totalEmployerObligations, value: effectiveEmployee.totalEmployerObligations, tone: 'primary' },
        ]
        : isColombiaPayroll
          ? [
            { label: rowsCopy.employerHealth, value: effectiveEmployee.employerHealth },
            { label: rowsCopy.employerPension, value: effectiveEmployee.employerPension },
            { label: rowsCopy.arl, value: effectiveEmployee.arl },
            { label: rowsCopy.familyCompensationFund, value: effectiveEmployee.familyCompensationFund },
            { label: rowsCopy.icbf, value: effectiveEmployee.icbf },
            { label: rowsCopy.sena, value: effectiveEmployee.sena },
            { label: rowsCopy.totalEmployerObligations, value: effectiveEmployee.totalEmployerObligations, tone: 'primary' },
          ]
        : isBrazilPayroll
          ? [
            { label: rowsCopy.employerInss, value: effectiveEmployee.employerInss },
            { label: rowsCopy.fgts, value: effectiveEmployee.fgts },
            { label: rowsCopy.ratWorkAccident, value: effectiveEmployee.ratWorkAccident },
            { label: rowsCopy.thirdPartyContributions, value: effectiveEmployee.thirdPartyContributions },
            { label: rowsCopy.employerBenefits, value: effectiveEmployee.employerBenefits },
            { label: rowsCopy.totalEmployerObligations, value: effectiveEmployee.totalEmployerObligations, tone: 'primary' },
          ]
        : [
          { label: rowsCopy.employerImss, value: effectiveEmployee.employerImss },
          { label: rowsCopy.employerInfonavit, value: effectiveEmployee.employerInfonavit },
          { label: rowsCopy.sar2, value: effectiveEmployee.sar },
          { label: rowsCopy.payrollTaxStateTax, value: effectiveEmployee.payrollStateTax },
          { label: rowsCopy.occupationalRisk, value: effectiveEmployee.occupationalRisk },
          { label: rowsCopy.childcareImss, value: effectiveEmployee.childcareImss },
          { label: rowsCopy.totalEmployerObligations, value: effectiveEmployee.totalEmployerObligations, tone: 'primary' },
        ];

  const internalOnlyRows: BreakdownValueRow[] = !effectiveEmployee
    ? []
    : isColombiaPayroll || isCanadaPayroll || isUsaPayroll || isBrazilPayroll
      ? [
        { label: rowsCopy.otherDeductions, value: effectiveEmployee.otherDeductions, tone: 'negative' },
        { label: rowsCopy.totalInternalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
      ]
      : [
        { label: rowsCopy.loans, value: effectiveEmployee.loans, tone: 'negative' },
        { label: rowsCopy.otherDeductions, value: effectiveEmployee.otherDiscounts, tone: 'negative' },
        { label: rowsCopy.netAdjustment, value: effectiveEmployee.netAdjustment, tone: effectiveEmployee.netAdjustment < 0 ? 'negative' : 'neutral' },
        { label: rowsCopy.totalInternalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
      ];

  const benefitsRows: BreakdownValueRow[] = !effectiveEmployee || !effectiveEmployee.statutoryPayroll
    ? []
    : isColombiaPayroll
      ? [
        { label: rowsCopy.severance, value: effectiveEmployee.severance },
        { label: rowsCopy.severanceInterest, value: effectiveEmployee.severanceInterest },
        { label: rowsCopy.serviceBonus, value: effectiveEmployee.serviceBonus },
        { label: rowsCopy.vacationProvision, value: effectiveEmployee.vacationProvision },
      ]
      : isBrazilPayroll
        ? [
          { label: rowsCopy.transportationVoucher, value: effectiveEmployee.transportationVoucher, tone: 'negative' },
          { label: rowsCopy.mealBenefitsDeduction, value: effectiveEmployee.mealBenefitsDeduction, tone: 'negative' },
          { label: rowsCopy.employerBenefits, value: effectiveEmployee.employerBenefits },
        ]
        : [];

  const finalCalculationRows: BreakdownValueRow[] = !effectiveEmployee
    ? []
    : [
      {
        label: usesGrossPayModel ? rowsCopy.grossPay : rowsCopy.totalEarnings,
        value: usesGrossPayModel ? effectiveEmployee.grossPay : effectiveEmployee.totalEarnings,
        tone: 'positive',
      },
      { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
      { label: rowsCopy.netPay, value: effectiveEmployee.netPay, tone: 'primary' },
      {
        label: effectiveEmployee.statutoryPayroll
          ? copy.formulas.costWithEmployer
          : copy.formulas.costInternal,
        value: effectiveEmployee.totalPayrollCost,
        tone: 'primary',
      },
    ];

  const headerIdentityLine = !effectiveEmployee
    ? ''
    : isCanadaPayroll
      ? `${copy.identity.sin}: ${effectiveEmployee.sin || '—'} | ${copy.identity.province}: ${effectiveEmployee.province || '—'}`
      : isUsaPayroll
        ? `${copy.identity.ssnTaxId}: ${effectiveEmployee.sin || '—'} | ${copy.identity.state}: ${effectiveEmployee.province || '—'}`
      : isColombiaPayroll
        ? `${copy.identity.idNumber}: ${effectiveEmployee.idNumber || '—'} | ${copy.identity.contractType}: ${effectiveEmployee.contractType}`
      : isBrazilPayroll
        ? `${copy.identity.cpf}: ${effectiveEmployee.cpf || '—'} | ${copy.identity.pisPasep}: ${effectiveEmployee.pisPasep || '—'}`
      : `RFC: ${effectiveEmployee.rfc} | CURP: ${effectiveEmployee.curp} | NSS: ${effectiveEmployee.nss}`;

  const handlePrintBreakdownPdf = () => {
    if (!effectiveEmployee) {
      return;
    }

    const title = copy.printTitle(effectiveEmployee.employee);
    const headerHtml = `
      <div class="header">
        <h1>${escapePrintHtml(title)}</h1>
        <p class="meta">${escapePrintHtml(copy.period)}: ${escapePrintHtml(periodLabel)}</p>
        <p class="meta">${escapePrintHtml(copy.jurisdiction)}: ${escapePrintHtml(jurisdictionLabel || '—')}</p>
        <p class="meta">${escapePrintHtml(headerIdentityLine)}</p>
        <p class="meta"><span class="badge">${escapePrintHtml(effectiveEmployee.statutoryPayroll ? copy.statutoryPayroll : copy.internalOnlyPayroll)}</span></p>
      </div>
    `;

    const earningsHtml = buildPrintSection(copy.earnings, earningsRows);
    const taxHtml = effectiveEmployee.statutoryPayroll && taxRows.length > 0
      ? buildPrintSection(breakdownConfig.taxSectionTitle, taxRows)
      : '';
    const deductionsHtml = effectiveEmployee.statutoryPayroll
      ? buildPrintSection(breakdownConfig.employeeDeductionsTitle, employeeDeductionRows)
      : buildPrintSection(copy.internalDeductions, internalOnlyRows, breakdownConfig.internalOnlyNotice);
    const employerHtml = effectiveEmployee.statutoryPayroll
      ? buildPrintSection(
        breakdownConfig.employerObligationsTitle,
        employerObligationRows,
        breakdownConfig.employerObligationsDescription,
      )
      : '';
    const benefitsHtml = effectiveEmployee.statutoryPayroll && benefitsRows.length > 0
      ? buildPrintSection(breakdownConfig.benefitsSectionTitle || copy.benefitsVouchers, benefitsRows)
      : '';
    const contributionHtml = effectiveEmployee.statutoryPayroll
      ? `
        <div class="section">
          <h2>${escapePrintHtml(breakdownConfig.contributionBreakdownTitle)}</h2>
          <table>
            <thead><tr><th>${escapePrintHtml(copy.concept)}</th><th class="num">${escapePrintHtml(copy.employer)}</th><th class="num">${escapePrintHtml(copy.employee)}</th></tr></thead>
            <tbody>
              ${contributionBreakdown.map((row) => `<tr><td>${escapePrintHtml(row.concept)}</td><td class="num">${escapePrintHtml(formatNumber(row.employer))}</td><td class="num">${escapePrintHtml(formatNumber(row.employee))}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      `
      : '';
    const finalHtml = buildPrintSection(breakdownConfig.finalCalculationTitle, finalCalculationRows);

    printHtmlDocument({
      title,
      orientation: 'portrait',
      bodyHtml: `${headerHtml}${earningsHtml}${taxHtml}${deductionsHtml}${employerHtml}${contributionHtml}${benefitsHtml}${finalHtml}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="z-[130] !flex h-[min(90vh,920px)] max-h-[calc(100vh-3rem)] max-w-[900px] flex-col gap-0 overflow-hidden rounded-[30px] border border-slate-200 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900 [&>button]:hidden">
        <DialogHeader className="shrink-0 bg-[#59C3A5] px-5 py-4 text-left text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-semibold">{copy.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-blue-100">
                {employee ? `${employee.employee} · ${periodLabel}` : copy.noRowSelected}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/10 transition-colors hover:bg-white/20"
              aria-label={copy.closeLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        {!effectiveEmployee ? (
          <div className="flex flex-1 items-center justify-center px-6 text-sm text-slate-500 dark:text-slate-400">
            {copy.noRowSelected}
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-950/40 sm:px-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-[#59C3A5]/20 bg-[#59C3A5]/10 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:border-[#59C3A5]/40 dark:text-blue-300">
                  {jurisdictionLabel}
                </span>
                {!isCanadaPayroll && !isUsaPayroll && !isBrazilPayroll && !isColombiaPayroll && (
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    {effectiveEmployee.contributionType}
                  </span>
                )}
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${effectiveEmployee.statutoryPayroll
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'}`}
                >
                  {effectiveEmployee.statutoryPayroll ? copy.calculated : copy.internalOnly}
                </span>
              </div>
              {!effectiveEmployee.statutoryPayroll && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  {breakdownConfig.internalOnlyNotice}
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summaryRows.map((row) => (
                  <div key={row.label}>
                    <p className="text-xs text-slate-500">{row.label}</p>
                    <p className={`text-sm font-medium ${row.tone === 'primary' ? 'text-[#59C3A5] dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                      {formatBreakdownValue(row.value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.earnings}</h4>
                {renderValueRows(earningsRows)}
              </section>

              {effectiveEmployee.statutoryPayroll ? (
                <>
                  {taxRows.length > 0 && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{breakdownConfig.taxSectionTitle}</h4>
                      {!isCanadaPayroll && !isUsaPayroll && !isBrazilPayroll && !isColombiaPayroll && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {copy.isrHint}
                        </p>
                      )}
                      {renderValueRows(taxRows)}
                    </section>
                  )}

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{breakdownConfig.employeeDeductionsTitle}</h4>
                    {renderValueRows(employeeDeductionRows)}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{breakdownConfig.employerObligationsTitle}</h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{breakdownConfig.employerObligationsDescription}</p>
                    {renderValueRows(employerObligationRows)}
                  </section>

                </>
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.internalDeductions}</h4>
                  {renderValueRows(internalOnlyRows)}
                </section>
              )}
            </div>

            {effectiveEmployee.statutoryPayroll && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{breakdownConfig.contributionBreakdownTitle}</h4>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                          <th className="py-2 pr-3">{copy.concept}</th>
                          <th className="py-2 px-3 text-right">{copy.employer}</th>
                          <th className="py-2 pl-3 text-right">{copy.employee}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contributionBreakdown.map((row) => (
                          <tr key={row.concept} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-2 pr-3 text-slate-700 dark:text-slate-200">{row.concept}</td>
                            <td className="py-2 px-3 text-right text-slate-900 dark:text-slate-100">{formatNumber(row.employer)}</td>
                            <td className="py-2 pl-3 text-right text-slate-900 dark:text-slate-100">{formatNumber(row.employee)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {benefitsRows.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{breakdownConfig.benefitsSectionTitle || copy.benefitsVouchers}</h4>
                    {renderValueRows(benefitsRows)}
                  </section>
                )}
              </>
            )}

            <section className="rounded-2xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-4 shadow-sm dark:border-[#59C3A5]/35 dark:bg-[#59C3A5]/20">
              <h4 className="text-sm font-semibold text-[#59C3A5] dark:text-blue-300">{breakdownConfig.finalCalculationTitle}</h4>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#59C3A5]/20 bg-white px-3 py-3 dark:border-[#59C3A5]/40 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {usesGrossPayModel ? copy.formulas.netFromGross : copy.formulas.netFromEarnings}
                  </p>
                  {renderValueRows([
                    {
                      label: usesGrossPayModel ? rowsCopy.grossPay : rowsCopy.totalEarnings,
                      value: usesGrossPayModel ? effectiveEmployee.grossPay : effectiveEmployee.totalEarnings,
                      tone: 'positive',
                    },
                    { label: rowsCopy.totalDeductions, value: effectiveEmployee.totalDeductions, tone: 'negative' },
                    { label: rowsCopy.netPay, value: effectiveEmployee.netPay, tone: 'primary' },
                  ])}
                </div>
                <div className="rounded-xl border border-[#59C3A5]/20 bg-white px-3 py-3 dark:border-[#59C3A5]/40 dark:bg-slate-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {effectiveEmployee.statutoryPayroll
                      ? copy.formulas.costWithEmployer
                      : copy.formulas.costInternal}
                  </p>
                  {renderValueRows([
                    { label: rowsCopy.netPay, value: effectiveEmployee.netPay },
                    ...(effectiveEmployee.statutoryPayroll
                      ? [{ label: rowsCopy.employerObligations, value: effectiveEmployee.totalEmployerObligations }]
                      : []),
                    { label: rowsCopy.totalPayrollCost, value: effectiveEmployee.totalPayrollCost, tone: 'primary' },
                  ])}
                </div>
              </div>
            </section>
          </div>
        )}

        <DialogFooter className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">{copy.closeLabel}</Button>
          <Button type="button" onClick={handlePrintBreakdownPdf} className="gap-2 rounded-xl bg-[#59C3A5] text-white hover:bg-[#3AAE90]">
            <Printer className="h-4 w-4" />
            {copy.printBreakdown}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollPreferencesDialog({
  copy,
  isOpen,
  isSaving,
  form,
  onClose,
  onChange,
  onSave,
}: {
  copy: PayrollCopy;
  isOpen: boolean;
  isSaving: boolean;
  form: PayrollPreferences;
  onClose: () => void;
  onChange: (value: PayrollPreferences) => void;
  onSave: () => void;
}) {
  const preferenceCopy = copy.preferencesDialog;
  const groupingOptions = [
    { key: 'single', ...preferenceCopy.groupingOptions.single },
    { key: 'unit', ...preferenceCopy.groupingOptions.unit },
    { key: 'business', ...preferenceCopy.groupingOptions.business },
  ] as const;

  const selectedOption = groupingOptions.find((option) => option.key === form.grouping_mode) ?? groupingOptions[0];
  const optionIconMap = {
    single: Globe2,
    unit: MapPinned,
    business: Landmark,
  } as const;
  const automaticSeparatorCards = [
    {
      title: preferenceCopy.separators.frequency.title,
      description: preferenceCopy.separators.frequency.description,
      Icon: CreditCard,
    },
    {
      title: preferenceCopy.separators.workforce.title,
      description: preferenceCopy.separators.workforce.description,
      Icon: ShieldCheck,
    },
    {
      title: preferenceCopy.separators.jurisdiction.title,
      description: preferenceCopy.separators.jurisdiction.description,
      Icon: Globe2,
    },
  ];
  const preferenceSteps = [
    { number: '1', label: preferenceCopy.steps.organization },
    { number: '2', label: preferenceCopy.steps.automaticSeparation },
    { number: '3', label: preferenceCopy.steps.defaults },
  ];
  const paidLeaveValueLabel = form.pay_leave_days
    ? preferenceCopy.yes
    : preferenceCopy.no;
  const dailyHoursHelper = preferenceCopy.dailyHoursHelper;
  const leaveDaysHelper = preferenceCopy.leaveDaysHelper;
  const impactMessage = preferenceCopy.impactMessage;
  const saveButtonLabel = isSaving
    ? preferenceCopy.saving
    : copy.labels.savePreferences;
  const [currentPreferenceStep, setCurrentPreferenceStep] = useState(0);
  const isFinalPreferenceStep = currentPreferenceStep === preferenceSteps.length - 1;

  useEffect(() => {
    if (isOpen) {
      setCurrentPreferenceStep(0);
    }
  }, [isOpen]);

  const goToPreviousPreferenceStep = () => {
    setCurrentPreferenceStep((currentStep) => Math.max(currentStep - 1, 0));
  };

  const goToNextPreferenceStep = () => {
    setCurrentPreferenceStep((currentStep) => Math.min(currentStep + 1, preferenceSteps.length - 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="!flex h-[min(720px,calc(100vh-2rem))] w-[min(1040px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border border-[#59C3A5]/25 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.26)] dark:border-[#59C3A5]/30 dark:bg-slate-900 [&>button]:hidden">
        <DialogHeader className="shrink-0 bg-[#59C3A5] px-6 py-5 text-left text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 text-white shadow-sm ring-1 ring-white/10">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-xl font-bold leading-tight text-white">
                  {copy.labels.preferences}
                </DialogTitle>
                <DialogDescription className="max-w-2xl text-sm leading-6 text-blue-100">
                  {preferenceCopy.subtitle}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                disabled={isSaving}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={copy.labels.close}
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-3 gap-2">
            {preferenceSteps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                disabled={isSaving}
                onClick={() => setCurrentPreferenceStep(index)}
                className={`flex min-w-0 items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${currentPreferenceStep === index
                  ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#59C3A5] shadow-sm dark:border-blue-400/50 dark:bg-blue-400/10 dark:text-blue-200'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#59C3A5]/30 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300'
                  }`}
                aria-current={currentPreferenceStep === index ? 'step' : undefined}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${currentPreferenceStep >= index
                  ? 'bg-[#59C3A5] text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'
                  }`}>
                  {step.number}
                </span>
                <span className="truncate text-sm font-semibold">{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-6 dark:bg-slate-950/40">
          <section className={`${currentPreferenceStep === 0 ? 'block' : 'hidden'}`}>
            <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#59C3A5] text-sm font-bold text-white shadow-sm">
                    1
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-blue-300">
                      {preferenceCopy.steps.stepLabel('1')}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{preferenceCopy.organizationTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {preferenceCopy.organizationSubtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">{preferenceCopy.selectedOrganization}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#59C3A5] shadow-sm ring-1 ring-[#59C3A5]/10 dark:bg-slate-900 dark:text-blue-200">
                      {selectedOption.title}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedOption.examples.map((example) => (
                      <p key={example} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {example}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {groupingOptions.map((option) => {
                  const isSelected = form.grouping_mode === option.key;
                  const Icon = optionIconMap[option.key];

                  return (
                    <button
                      key={option.key}
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (form.grouping_mode !== option.key) {
                          onChange({ ...form, grouping_mode: option.key as PayrollPreferences['grouping_mode'] });
                        }
                      }}
                      className={`group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${isSelected
                        ? 'border-[#59C3A5] bg-[#59C3A5]/5 shadow-sm ring-2 ring-[#59C3A5]/10 dark:border-blue-400/60 dark:bg-[#59C3A5]/20'
                        : 'border-slate-200 bg-white hover:border-[#59C3A5]/35 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400/40'
                        }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSelected
                        ? 'bg-[#59C3A5] text-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">{option.title}</h4>
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isSelected
                            ? 'border-[#59C3A5] bg-white text-[#59C3A5]'
                            : 'border-slate-300 bg-white text-slate-300 dark:border-slate-600 dark:bg-slate-900'
                            }`}>
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={`${currentPreferenceStep === 1 ? 'block' : 'hidden'}`}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 text-sm font-bold text-[#59C3A5] dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-200">
                  2
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-blue-300">{preferenceCopy.steps.stepLabel('2')}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{preferenceCopy.separationTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{preferenceCopy.separationSubtitle}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {automaticSeparatorCards.map(({ title, description, Icon }) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#59C3A5] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="mt-4">
                      <p className="text-base font-bold text-slate-900 dark:text-white">{title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-5 py-4 text-sm leading-6 text-[#59C3A5] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
                {preferenceCopy.separationNotice}
              </div>
            </div>
          </section>

          <section className={`${currentPreferenceStep === 2 ? 'block' : 'hidden'}`}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#59C3A5]/20 bg-white text-sm font-bold text-[#59C3A5] dark:border-blue-400/25 dark:bg-slate-900 dark:text-blue-200">
                  3
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59C3A5] dark:text-blue-300">
                    {preferenceCopy.steps.stepLabel('3')}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{preferenceCopy.defaultsTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {preferenceCopy.defaultsSubtitle}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {copy.labels.defaultDailyHours}
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="number"
                      min="0.5"
                      step="0.25"
                      disabled={isSaving}
                      value={form.default_daily_hours}
                      onChange={(event) => onChange({ ...form, default_daily_hours: Number(event.target.value) })}
                      className="h-12 w-32 rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60"
                    />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{preferenceCopy.hoursPerDay}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{dailyHoursHelper}</p>
                </div>

                <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-[#59C3A5]/35 dark:border-slate-700 dark:bg-slate-800/70">
                  <input
                    type="checkbox"
                    checked={form.pay_leave_days}
                    disabled={isSaving}
                    onChange={(event) => onChange({ ...form, pay_leave_days: event.target.checked })}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-[#59C3A5] focus:ring-[#59C3A5] disabled:cursor-not-allowed"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.labels.payLeaveDays}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${form.pay_leave_days
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        }`}>
                        {paidLeaveValueLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">{leaveDaysHelper}</p>
                  </div>
                </label>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-white/15 bg-[#59C3A5] px-6 py-4 text-white">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{preferenceCopy.footerTitle}</p>
              <p className="max-w-[540px] truncate text-xs text-blue-100">{impactMessage}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                disabled={isSaving}
                className="h-11 rounded-xl border-white/50 bg-transparent px-5 text-sm font-semibold text-white shadow-none hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onClose}
              >
                {copy.labels.cancel}
              </Button>
              {currentPreferenceStep > 0 ? (
                <Button
                  variant="outline"
                  disabled={isSaving}
                  className="h-11 rounded-xl border-white/50 bg-transparent px-5 text-sm font-semibold text-white shadow-none hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={goToPreviousPreferenceStep}
                >
                  {preferenceCopy.previous}
                </Button>
              ) : null}
              {isFinalPreferenceStep ? (
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="h-11 gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[#59C3A5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  {saveButtonLabel}
                </Button>
              ) : (
                <Button
                  onClick={goToNextPreferenceStep}
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-white px-5 text-sm font-semibold text-[#59C3A5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {preferenceCopy.next}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollRatesDialog({
  copy,
  isOpen,
  isSaving,
  selectedProfile,
  values,
  onClose,
  onSelectProfile,
  onChangeValue,
  onSave,
}: {
  copy: PayrollCopy;
  isOpen: boolean;
  isSaving: boolean;
  selectedProfile: PayrollRateProfileKey;
  values: PayrollRateValues;
  onClose: () => void;
  onSelectProfile: (value: PayrollRateProfileKey) => void;
  onChangeValue: (field: PayrollRateFieldKey, value: number) => void;
  onSave: () => void;
}) {
  const fieldLabels = copy.rateConfiguration.fieldLabels[selectedProfile];
  const [editorMode, setEditorMode] = useState<PayrollRateEditorMode>('preset');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setEditorMode('preset');
  }, [isOpen, selectedProfile]);

  const isCustomProfile = selectedProfile === 'custom';
  const isAdvancedMode = editorMode === 'advanced';
  const activeProfileName = copy.rateConfiguration.profiles[selectedProfile];
  const activeProfileFlag = payrollRateProfileFlags[selectedProfile];
  const headerTitle = `${copy.rateConfiguration.title} — ${activeProfileName}`;
  const infoBlockText = copy.rateConfiguration.infoBlocks[selectedProfile];

  const summaryStatus = isCustomProfile
    ? copy.rateConfiguration.statusBadges.customProfile
    : isAdvancedMode
      ? copy.rateDialog.companyAdjusted
      : copy.rateConfiguration.statusBadges.officialPreset;

  const summaryTone: 'success' | 'warning' | 'info' = isCustomProfile
    ? 'warning'
    : isAdvancedMode
      ? 'info'
      : 'success';

  const iconByField: Record<PayrollRateFieldKey, typeof Wallet> = {
    isr_rate: Wallet,
    imss_user_rate: ShieldCheck,
    infonavit_user_rate: CreditCard,
    imss_employer_rate: ShieldCheck,
    infonavit_employer_rate: CreditCard,
    sar_employer_rate: Landmark,
  };

  const automaticFields: PayrollRateFieldKey[] = ['isr_rate', 'imss_user_rate', 'imss_employer_rate'];
  const fixedByLawFields: PayrollRateFieldKey[] = ['infonavit_employer_rate'];
  const adjustableFields: PayrollRateFieldKey[] = ['infonavit_user_rate', 'sar_employer_rate'];

  const handlePercentInputChange = (field: PayrollRateFieldKey, nextValue: string) => {
    onChangeValue(field, parseRateInputPercent(nextValue));
  };

  const renderPercentInput = (field: PayrollRateFieldKey) => (
    <div className="w-32">
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={formatRateInputPercent(values[field])}
          onChange={(event) => handlePercentInputChange(field, event.target.value)}
          className="h-11 w-full rounded-xl border border-amber-200 bg-white pl-3 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#59C3A5] dark:border-amber-700/40 dark:bg-slate-800 dark:text-slate-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400 dark:text-slate-500">
          %
        </span>
      </div>
    </div>
  );

  const renderStatusBadge = (label: string, tone: 'success' | 'warning' | 'info') => {
    const toneClasses = {
      success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
      warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300',
      info: 'border-[#59C3A5]/20 bg-[#59C3A5]/10 text-[#59C3A5] dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/20 dark:text-[#9fbeff]',
    } as const;

    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
        {tone === 'success' ? '🟢' : tone === 'warning' ? '🟡' : '🔵'}
        <span className="ml-1.5">{label}</span>
      </span>
    );
  };

  const renderBreakdownButton = () => (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#59C3A5] transition hover:border-[#59C3A5]/30 hover:bg-[#59C3A5]/5 dark:border-slate-600 dark:text-[#9fbeff] dark:hover:bg-[#59C3A5]/15"
    >
      {copy.rateConfiguration.viewBreakdown}
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );

  const componentCardClassName = 'rounded-2xl border bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:px-5';

  const renderAutomaticCard = (field: PayrollRateFieldKey, description: string) => {
    const Icon = iconByField[field];
    return (
      <article key={field} className={`${componentCardClassName} border-emerald-100 dark:border-emerald-800/30`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{fieldLabels[field]}</h4>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {renderStatusBadge(copy.rateConfiguration.statusBadges.automatic, 'success')}
            {renderBreakdownButton()}
          </div>
        </div>
      </article>
    );
  };

  const renderFixedCard = (field: PayrollRateFieldKey, description: string) => {
    const Icon = iconByField[field];
    return (
      <article key={field} className={`${componentCardClassName} border-emerald-100 dark:border-emerald-800/30`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{fieldLabels[field]}</h4>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {renderStatusBadge(copy.rateConfiguration.statusBadges.fixedByLaw, 'success')}
            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRateInputPercent(values[field])}%</p>
          </div>
        </div>
      </article>
    );
  };

  const renderAdjustableCard = (field: PayrollRateFieldKey, description: string) => {
    const Icon = iconByField[field];
    const hasValue = values[field] > 0;
    const notConfiguredLabel = copy.rateDialog.notConfigured;

    return (
      <article key={field} className={`${componentCardClassName} border-amber-100 dark:border-amber-800/30`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{fieldLabels[field]}</h4>
              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {renderStatusBadge(copy.rateDialog.adjustable, 'warning')}
            {isAdvancedMode || isCustomProfile ? (
              renderPercentInput(field)
            ) : (
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {hasValue ? `${formatRateInputPercent(values[field])}%` : notConfiguredLabel}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  };

  const mexicoOverviewText = copy.rateDialog.mexicoOverview;
  const automaticDescription = copy.rateDialog.automaticDescription;
  const fixedDescription = copy.rateDialog.fixedDescription;
  const adjustableDescription = copy.rateDialog.adjustableDescription;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="!flex h-[min(88vh,940px)] max-h-[calc(100vh-3rem)] max-w-[980px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="shrink-0 bg-[#59C3A5] px-5 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="text-[1.1rem] font-normal leading-tight text-white sm:text-[1.2rem]">
                {headerTitle}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-900/60">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">{activeProfileFlag}</span>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{activeProfileName}</h3>
                      {renderStatusBadge(summaryStatus, summaryTone)}
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {copy.rateDialog.profileIntro}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <select
                      value={selectedProfile}
                      onChange={(event) => onSelectProfile(event.target.value as PayrollRateProfileKey)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#59C3A5] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    >
                      {payrollRateProfileKeys.map((profileKey) => (
                        <option key={profileKey} value={profileKey}>
                          {payrollRateProfileFlags[profileKey]} {copy.rateConfiguration.profiles[profileKey]}
                        </option>
                      ))}
                    </select>
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/90 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          if (editorMode !== 'preset') {
                            setEditorMode('preset');
                          }
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!isAdvancedMode
                          ? 'bg-white text-[#59C3A5] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                          }`}
                      >
                        {copy.rateDialog.overview}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editorMode !== 'advanced') {
                            setEditorMode('advanced');
                          }
                        }}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${isAdvancedMode
                          ? 'bg-white text-[#59C3A5] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                          }`}
                      >
                        {copy.rateConfiguration.modeLabels.advanced}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#59C3A5]/12 bg-[#59C3A5]/5 p-5 shadow-sm dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#59C3A5] shadow-sm dark:bg-slate-800 dark:text-[#9fbeff]">
                    <Info className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {selectedProfile === 'mexico' ? mexicoOverviewText : infoBlockText}
                  </p>
                </div>
              </section>

              {isAdvancedMode ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                  {copy.rateDialog.advancedWarning}
                </section>
              ) : null}

              <section className="space-y-3">
                {automaticFields.map((field) => renderAutomaticCard(field, automaticDescription))}
                {fixedByLawFields.map((field) => renderFixedCard(field, fixedDescription))}
                {adjustableFields.map((field) => renderAdjustableCard(field, adjustableDescription))}
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#59C3A5]/20 dark:text-[#8fb2ff]">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {copy.rateDialog.profileHelp}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800 sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white px-5 text-base font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                onClick={onClose}
              >
                {copy.labels.cancel}
              </Button>
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="h-11 gap-2 rounded-2xl bg-[#59C3A5] px-5 text-base font-semibold text-white hover:bg-[#3AAE90]"
              >
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
                {copy.rateConfiguration.saveAction}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayrollRunDialog({
  copy,
  locale,
  isOpen,
  isSaving,
  activeBusyKind,
  notice,
  detail,
  selectedLineId,
  selectedLine,
  lineDraft,
  onClose,
  onSelectLine,
  onChangeDraft,
  onSaveLine,
  onProcess,
  onApprove,
  onPay,
  onCancel,
  onDownloadCsv,
  onDownloadPdf,
}: {
  copy: PayrollCopy;
  locale: string;
  isOpen: boolean;
  isSaving: boolean;
  activeBusyKind: PayrollBusyKind | null;
  notice: PayrollDialogNotice | null;
  detail: PayrollRunDetailResponse | null;
  selectedLineId: number | null;
  selectedLine: PayrollRunLine | null;
  lineDraft: {
    include_in_fiscal: boolean;
    notes: string;
    manual_items: PayrollManualItemPayload[];
  };
  onClose: () => void;
  onSelectLine: (value: number | null) => void;
  onChangeDraft: (value: {
    include_in_fiscal: boolean;
    notes: string;
    manual_items: PayrollManualItemPayload[];
  }) => void;
  onSaveLine: () => void;
  onProcess: () => void;
  onApprove: () => void;
  onPay: () => void;
  onCancel: () => void;
  onDownloadCsv: (run: PayrollRunSummary) => void;
  onDownloadPdf: (run: PayrollRunSummary) => void;
}) {
  const isDraft = detail?.run.status === 'draft';
  const canProcess = detail?.run.status === 'draft';
  const canApprove = detail?.run.status === 'processed';
  const canPay = detail?.run.status === 'approved';
  const canCancel = detail && detail.run.status !== 'paid' && detail.run.status !== 'cancelled';

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-[2px]">
      <div className="flex min-h-full items-start justify-center">
        <div
          className="relative w-full max-w-[96vw] rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:bg-slate-950"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={copy.labels.close}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 pr-10">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
              {detail ? `${copy.labels.detail} #${detail.run.id}` : copy.labels.detail}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {detail
                ? `${formatDate(detail.run.period_start_date, locale, detail.run.period_start_date)} → ${formatDate(detail.run.period_end_date, locale, detail.run.period_end_date)}`
                : copy.labels.currentRun}
            </p>
          </div>

          {notice ? (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${notice.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300'
                }`}
            >
              {notice.message}
            </div>
          ) : null}

          {detail ? (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {copy.statuses[detail.run.status]}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {detail.run.grouping_label || copy.groupingModes[detail.run.grouping_mode]}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {copy.frequencies[detail.run.pay_period]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <DetailMetric label={copy.labels.employees} value={String(detail.run.users_count)} />
                    <DetailMetric label={copy.labels.gross} value={formatCurrency(detail.run.gross_amount, locale)} />
                    <DetailMetric label={copy.labels.deductions} value={formatCurrency(detail.run.deductions_amount, locale)} />
                    <DetailMetric label={copy.labels.net} value={formatCurrency(detail.run.net_amount, locale)} />
                  </div>
                </div>

                <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {detail.lines.map((line) => (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => onSelectLine(line.id)}
                      className={`w-full rounded-lg border px-4 py-4 text-left transition-all ${selectedLineId === line.id
                        ? 'border-blue-700 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-950/20'
                        : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{line.user_name}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {line.position_title || '—'} · {line.department || '—'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(line.net_amount, locale)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {selectedLine ? (
                  <>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{copy.labels.employee}</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedLine.user_name}</p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {selectedLine.position_title || '—'} · {selectedLine.department || '—'}
                          </p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {copy.labels.currentRun}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <DetailMetric label={copy.labels.salaryType} value={selectedLine.salary_type === 'daily' ? copy.labels.daily : copy.labels.hourly} />
                        <DetailMetric label={copy.labels.daysPayable} value={String(selectedLine.days_payable)} />
                        <DetailMetric label={copy.labels.leaveDays} value={String(selectedLine.leave_days)} />
                        <DetailMetric label={copy.labels.absenceDays} value={String(selectedLine.absence_days)} />
                        <DetailMetric label={copy.labels.regularHours} value={String(selectedLine.regular_hours)} />
                        <DetailMetric label={copy.labels.overtimeHours} value={String(selectedLine.overtime_hours)} />
                        <DetailMetric label={copy.labels.lateCount} value={String(selectedLine.late_count)} />
                        <DetailMetric label={copy.labels.net} value={formatCurrency(selectedLine.net_amount, locale)} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.lineEditor}</h4>

                      <div className="mt-4 space-y-4">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={lineDraft.include_in_fiscal}
                            disabled={!isDraft}
                            onChange={(event) => onChangeDraft({ ...lineDraft, include_in_fiscal: event.target.checked })}
                          />
                          {copy.labels.includeFiscal}
                        </label>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.notes}</label>
                          <textarea
                            value={lineDraft.notes}
                            disabled={!isDraft}
                            onChange={(event) => onChangeDraft({ ...lineDraft, notes: event.target.value })}
                            className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-700 focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.manualItems}</label>
                            {isDraft ? (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onChangeDraft({
                                    ...lineDraft,
                                    manual_items: [...lineDraft.manual_items, { category: 'earning', label: '', amount: 0 }],
                                  })}
                                >
                                  {copy.labels.addManualEarning}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onChangeDraft({
                                    ...lineDraft,
                                    manual_items: [...lineDraft.manual_items, { category: 'deduction', label: '', amount: 0 }],
                                  })}
                                >
                                  {copy.labels.addManualDeduction}
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            {lineDraft.manual_items.length > 0 ? (
                              lineDraft.manual_items.map((item, index) => (
                                <div key={`${item.category}-${index}`} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/70 md:grid-cols-[160px_1fr_140px_auto]">
                                  <select
                                    value={item.category}
                                    disabled={!isDraft}
                                    onChange={(event) => {
                                      const manualItems = lineDraft.manual_items.map((currentItem, currentIndex) =>
                                        currentIndex === index
                                          ? { ...currentItem, category: event.target.value as 'earning' | 'deduction' }
                                          : currentItem,
                                      );
                                      onChangeDraft({ ...lineDraft, manual_items: manualItems });
                                    }}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  >
                                    <option value="earning">{copy.itemCategories.earning}</option>
                                    <option value="deduction">{copy.itemCategories.deduction}</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={item.label}
                                    disabled={!isDraft}
                                    placeholder={copy.labels.description}
                                    onChange={(event) => {
                                      const manualItems = lineDraft.manual_items.map((currentItem, currentIndex) =>
                                        currentIndex === index
                                          ? { ...currentItem, label: event.target.value }
                                          : currentItem,
                                      );
                                      onChangeDraft({ ...lineDraft, manual_items: manualItems });
                                    }}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.amount}
                                    disabled={!isDraft}
                                    onChange={(event) => {
                                      const manualItems = lineDraft.manual_items.map((currentItem, currentIndex) =>
                                        currentIndex === index
                                          ? { ...currentItem, amount: Number(event.target.value) }
                                          : currentItem,
                                      );
                                      onChangeDraft({ ...lineDraft, manual_items: manualItems });
                                    }}
                                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                  />
                                  {isDraft ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onChangeDraft({
                                        ...lineDraft,
                                        manual_items: lineDraft.manual_items.filter((_, currentIndex) => currentIndex !== index),
                                      })}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              ))
                            ) : (
                              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-400">
                                {copy.labels.noItems}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{copy.labels.detail}</h5>
                          <div className="mt-3 space-y-2">
                            {selectedLine.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {copy.itemCategories[item.category]} · {item.code}
                                  </p>
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(item.amount, locale)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                    {copy.labels.noLineSelected}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              {copy.loading}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-700">
            {detail ? (
              <>
                <div className="flex flex-wrap gap-2 sm:mr-auto">
                  <Button variant="outline" onClick={() => onDownloadCsv(detail.run)} className="gap-2 rounded-xl" disabled={isSaving}>
                    {activeBusyKind === 'download-csv' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {copy.labels.exportCsv}
                  </Button>
                  <Button variant="outline" onClick={() => onDownloadPdf(detail.run)} className="gap-2 rounded-xl" disabled={isSaving}>
                    {activeBusyKind === 'download-pdf' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {copy.labels.exportPdf}
                  </Button>
                  {canProcess ? (
                    <Button onClick={onProcess} disabled={isSaving} className="gap-2 rounded-xl">
                      {activeBusyKind === 'process-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                      {copy.labels.process}
                    </Button>
                  ) : null}
                  {canApprove ? (
                    <Button onClick={onApprove} disabled={isSaving} className="gap-2 rounded-xl">
                      {activeBusyKind === 'approve-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {copy.labels.approve}
                    </Button>
                  ) : null}
                  {canPay ? (
                    <Button onClick={onPay} disabled={isSaving} className="gap-2 rounded-xl">
                      {activeBusyKind === 'mark-paid' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {copy.labels.pay}
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <Button variant="outline" onClick={onCancel} disabled={isSaving} className="gap-2 rounded-xl">
                      {activeBusyKind === 'cancel-run' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      {copy.labels.cancelRun}
                    </Button>
                  ) : null}
                </div>
                {isDraft ? (
                  <Button onClick={onSaveLine} disabled={isSaving || !selectedLine} className="gap-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100">
                    {activeBusyKind === 'save-line' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {copy.labels.saveLine}
                  </Button>
                ) : null}
                <Button variant="outline" className="rounded-xl" onClick={onClose}>{copy.labels.closeDetail}</Button>
              </>
            ) : (
              <Button variant="outline" className="rounded-xl" onClick={onClose}>{copy.labels.close}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
