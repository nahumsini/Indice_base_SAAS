import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  CreditCard,
  Download,
  FileSpreadsheet,
  Filter,
  LoaderCircle,
  Pencil,
  PlayCircle,
  Printer,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { ApiClientError, buildApiUrl } from '../../../lib/apiClient';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../api/dashboard';
import {
  humanResourcesApi,
  type PayrollCreateRunsPayload,
  type PayrollLineItem,
  type PayrollManualItemPayload,
  type PayrollOverviewResponse,
  type PayrollPreferences,
  type PayrollRunDetailResponse,
  type PayrollRunLine,
  type PayrollRunSummary,
} from '../../../api/humanResources';
import { useLanguage } from '../../../shared/context';
import {
  PayrollRunPrintPortal,
} from './PayrollRunPrintPortal';
import type { PayrollRunPdfDocumentProps } from './PayrollRunPdfDocument';

const padDatePart = (value: number) => `${value}`.padStart(2, '0');
const localDateString = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
const todayIsoDate = () => localDateString(new Date());
const firstDayOfMonth = () => `${todayIsoDate().slice(0, 8)}01`;
const PAYROLL_PRINT_REPORT_ID_PREFIX = 'IDX-PR';

const parseIsoDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const endOfMonthIso = (value: string) => {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }

  const lastDay = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0);
  return localDateString(lastDay);
};

const addDaysIso = (value: string, days: number) => {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }

  const next = new Date(parsed);
  next.setDate(next.getDate() + days);
  return localDateString(next);
};

const computePayrollPeriodEndDate = (
  payPeriod: PayrollCreateRunsPayload['pay_period'],
  periodStartDate: string,
) => {
  if (!periodStartDate) {
    return '';
  }

  const monthEnd = endOfMonthIso(periodStartDate);
  const maxEnd = payPeriod === 'weekly'
    ? addDaysIso(periodStartDate, 6)
    : payPeriod === 'biweekly'
      ? addDaysIso(periodStartDate, 13)
      : monthEnd;

  return maxEnd > monthEnd ? monthEnd : maxEnd;
};

const payrollCopy = {
  en: {
    title: 'Payroll',
    subtitle: 'Generate, review, approve, pay, and export payroll runs using real employee and attendance data.',
    refresh: 'Refresh',
    retry: 'Retry',
    loading: 'Loading payroll',
    unauthorized: 'Your session is no longer authenticated. Sign in again and reload the module.',
    notFound: 'The running backend does not expose the payroll API yet. Restart the Spring server on the latest branch.',
    genericError: 'Unable to load payroll.',
    success: {
      preferences: 'Payroll preferences saved successfully.',
      runsCreated: 'Payroll runs generated successfully.',
      lineSaved: 'Payroll line updated successfully.',
      processed: 'Payroll run processed successfully.',
      approved: 'Payroll run approved successfully.',
      paid: 'Payroll run marked as paid.',
      cancelled: 'Payroll run cancelled successfully.',
    },
    busy: {
      refreshTitle: 'Refreshing payroll',
      refreshDescription: 'Reloading payroll runs, preferences, and generated totals.',
      openRunTitle: 'Opening payroll run',
      openRunDescription: 'Loading the complete run detail and employee lines.',
      preferencesTitle: 'Saving payroll preferences',
      preferencesDescription: 'Persisting payroll defaults and statutory rates.',
      generateTitle: 'Generating payroll',
      generateDescription: 'Building payroll runs from employees, attendance, and current preferences.',
      saveLineTitle: 'Saving payroll line',
      saveLineDescription: 'Recalculating the selected line and updating totals.',
      processTitle: 'Processing payroll run',
      processDescription: 'Freezing draft values and preparing the run for approval.',
      approveTitle: 'Approving payroll run',
      approveDescription: 'Locking the run for finance sign-off and payment.',
      payTitle: 'Marking payroll as paid',
      payDescription: 'Recording the payroll run as paid and updating its status.',
      cancelTitle: 'Cancelling payroll run',
      cancelDescription: 'Cancelling the run and refreshing the payroll ledger.',
      csvTitle: 'Exporting CSV',
      csvDescription: 'Preparing the payroll ledger for spreadsheet export.',
      pdfTitle: 'Preparing payroll PDF',
      pdfDescription: 'Building a printable payroll report with the current run data.',
    },
    statuses: {
      draft: 'Draft',
      processed: 'Processed',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled',
    },
    labels: {
      preferences: 'Payroll preferences',
      groupingMode: 'Grouping mode',
      defaultDailyHours: 'Default daily hours',
      payLeaveDays: 'Pay leave days',
      rates: 'Rates',
      controlPanel: 'Generate payroll',
      frequency: 'Frequency',
      periodStart: 'Period start',
      periodEnd: 'Period end',
      periodFrom: 'Period from',
      periodTo: 'Period to',
      filters: 'Run filters',
      status: 'Status',
      unit: 'Unit',
      business: 'Business',
      all: 'All',
      runs: 'Payroll runs',
      noRuns: 'No payroll runs match the current filters.',
      employees: 'Employees',
      gross: 'Gross',
      deductions: 'Deductions',
      employerContributions: 'Employer contributions',
      net: 'Net',
      employee: 'Employee',
      role: 'Role',
      department: 'Department',
      lineEditor: 'Line editor',
      noLineSelected: 'Select a payroll line to inspect and edit it.',
      includeFiscal: 'Apply fiscal deductions and employer contributions',
      notes: 'Notes',
      manualItems: 'Manual adjustments',
      category: 'Category',
      description: 'Description',
      amount: 'Amount',
      addManualEarning: 'Add earning',
      addManualDeduction: 'Add deduction',
      detail: 'Run detail',
      noItems: 'No detail items for this line.',
      exportCsv: 'Export CSV',
      exportPdf: 'Export PDF',
      process: 'Process',
      approve: 'Approve',
      pay: 'Mark paid',
      cancelRun: 'Cancel run',
      saveLine: 'Save line',
      close: 'Close',
      generatedRuns: 'Generated runs',
      currentRun: 'Current run',
      payPeriod: 'Pay period',
      noUnit: 'No unit',
      noBusiness: 'No business',
      salaryType: 'Salary type',
      daily: 'Daily',
      hourly: 'Hourly',
      derivedEndDateHint: 'The end date is calculated automatically from the selected frequency.',
      regularHours: 'Regular hours',
      overtimeHours: 'Overtime hours',
      daysPayable: 'Payable days',
      leaveDays: 'Leave days',
      absenceDays: 'Absence days',
      lateCount: 'Late count',
      selectedRun: 'Selected run',
      generate: 'Generate payroll',
      save: 'Save',
      closeDetail: 'Close detail',
      employerCosts: 'Employer costs',
      openPreferences: 'Preferences',
      openRun: 'Open',
      editDraft: 'Edit draft',
      filterStatus: 'Status',
    },
    summary: {
      runs: 'Runs',
      draft: 'Draft',
      processed: 'Processed',
      approved: 'Approved',
      paid: 'Paid',
      cancelled: 'Cancelled',
      totalGross: 'Total gross',
      totalNet: 'Total net',
    },
    groupingModes: {
      single: 'Single payroll',
      unit: 'By unit',
      business: 'By business',
    },
    frequencies: {
      weekly: 'Weekly',
      biweekly: 'Biweekly',
      monthly: 'Monthly',
    },
    itemCategories: {
      earning: 'Earning',
      deduction: 'Deduction',
      employer_contribution: 'Employer contribution',
    },
  },
  es: {
    title: 'Nómina',
    subtitle: 'Genera, revisa, aprueba, paga y exporta corridas de nómina con datos reales de colaboradores y asistencia.',
    refresh: 'Actualizar',
    retry: 'Reintentar',
    loading: 'Cargando nómina',
    unauthorized: 'Tu sesión ya no está autenticada. Inicia sesión de nuevo y vuelve a cargar el módulo.',
    notFound: 'El backend en ejecución todavía no expone la API de nómina. Reinicia Spring con la versión más reciente.',
    genericError: 'No se pudo cargar la nómina.',
    success: {
      preferences: 'Preferencias de nómina guardadas correctamente.',
      runsCreated: 'Corridas de nómina generadas correctamente.',
      lineSaved: 'Línea de nómina actualizada correctamente.',
      processed: 'Corrida de nómina procesada correctamente.',
      approved: 'Corrida de nómina aprobada correctamente.',
      paid: 'Corrida de nómina marcada como pagada.',
      cancelled: 'Corrida de nómina cancelada correctamente.',
    },
    busy: {
      refreshTitle: 'Actualizando nómina',
      refreshDescription: 'Recargando corridas, preferencias y totales de nómina.',
      openRunTitle: 'Abriendo corrida',
      openRunDescription: 'Cargando el detalle completo de la corrida y sus líneas.',
      preferencesTitle: 'Guardando preferencias',
      preferencesDescription: 'Persistiendo los valores por defecto y las tasas estatutarias.',
      generateTitle: 'Generando nómina',
      generateDescription: 'Construyendo corridas con colaboradores, asistencia y preferencias actuales.',
      saveLineTitle: 'Guardando línea de nómina',
      saveLineDescription: 'Recalculando la línea seleccionada y actualizando sus totales.',
      processTitle: 'Procesando corrida',
      processDescription: 'Congelando los valores del borrador para enviarlos a aprobación.',
      approveTitle: 'Aprobando corrida',
      approveDescription: 'Bloqueando la corrida para visto bueno financiero y pago.',
      payTitle: 'Marcando nómina como pagada',
      payDescription: 'Registrando la corrida como pagada y actualizando su estatus.',
      cancelTitle: 'Cancelando corrida',
      cancelDescription: 'Cancelando la corrida y refrescando el libro de nómina.',
      csvTitle: 'Exportando CSV',
      csvDescription: 'Preparando el libro de nómina para exportarlo a hoja de cálculo.',
      pdfTitle: 'Preparando PDF de nómina',
      pdfDescription: 'Generando un reporte imprimible de la corrida actual.',
    },
    statuses: {
      draft: 'Borrador',
      processed: 'Procesada',
      approved: 'Aprobada',
      paid: 'Pagada',
      cancelled: 'Cancelada',
    },
    labels: {
      preferences: 'Preferencias de nómina',
      groupingMode: 'Modo de agrupación',
      defaultDailyHours: 'Horas diarias por defecto',
      payLeaveDays: 'Pagar días de permiso',
      rates: 'Tasas',
      controlPanel: 'Generar nómina',
      frequency: 'Frecuencia',
      periodStart: 'Inicio del período',
      periodEnd: 'Fin del período',
      periodFrom: 'Período desde',
      periodTo: 'Período hasta',
      filters: 'Filtros de corridas',
      status: 'Estado',
      unit: 'Unidad',
      business: 'Negocio',
      all: 'Todos',
      runs: 'Corridas de nómina',
      noRuns: 'No hay corridas que coincidan con los filtros actuales.',
      employees: 'Colaboradores',
      gross: 'Bruto',
      deductions: 'Deducciones',
      employerContributions: 'Aportaciones patronales',
      net: 'Neto',
      employee: 'Colaborador',
      role: 'Puesto',
      department: 'Departamento',
      lineEditor: 'Editor de línea',
      noLineSelected: 'Selecciona una línea de nómina para inspeccionarla y editarla.',
      includeFiscal: 'Aplicar deducciones fiscales y aportaciones patronales',
      notes: 'Notas',
      manualItems: 'Ajustes manuales',
      category: 'Categoría',
      description: 'Descripción',
      amount: 'Monto',
      addManualEarning: 'Agregar percepción',
      addManualDeduction: 'Agregar deducción',
      detail: 'Detalle de corrida',
      noItems: 'No hay conceptos detallados en esta línea.',
      exportCsv: 'Exportar CSV',
      exportPdf: 'Exportar PDF',
      process: 'Procesar',
      approve: 'Aprobar',
      pay: 'Marcar pagada',
      cancelRun: 'Cancelar corrida',
      saveLine: 'Guardar línea',
      close: 'Cerrar',
      generatedRuns: 'Corridas generadas',
      currentRun: 'Corrida actual',
      payPeriod: 'Período de pago',
      noUnit: 'Sin unidad',
      noBusiness: 'Sin negocio',
      salaryType: 'Tipo salarial',
      daily: 'Diario',
      hourly: 'Por hora',
      derivedEndDateHint: 'La fecha final se calcula automáticamente según la frecuencia seleccionada.',
      regularHours: 'Horas regulares',
      overtimeHours: 'Horas extra',
      daysPayable: 'Días pagables',
      leaveDays: 'Días de permiso',
      absenceDays: 'Días de ausencia',
      lateCount: 'Retardos',
      selectedRun: 'Corrida seleccionada',
      generate: 'Generar nómina',
      save: 'Guardar',
      closeDetail: 'Cerrar detalle',
      employerCosts: 'Costos patronales',
      openPreferences: 'Preferencias',
      openRun: 'Abrir',
      editDraft: 'Editar borrador',
      filterStatus: 'Estado',
    },
    summary: {
      runs: 'Corridas',
      draft: 'Borradores',
      processed: 'Procesadas',
      approved: 'Aprobadas',
      paid: 'Pagadas',
      cancelled: 'Canceladas',
      totalGross: 'Bruto total',
      totalNet: 'Neto total',
    },
    groupingModes: {
      single: 'Nómina única',
      unit: 'Por unidad',
      business: 'Por negocio',
    },
    frequencies: {
      weekly: 'Semanal',
      biweekly: 'Quincenal',
      monthly: 'Mensual',
    },
    itemCategories: {
      earning: 'Percepción',
      deduction: 'Deducción',
      employer_contribution: 'Aportación patronal',
    },
  },
} as const;

const formatCurrency = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

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

const toErrorMessage = (error: unknown, copy: typeof payrollCopy.en | typeof payrollCopy.es) => {
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

const createPayrollPrintReportId = (runId: number) => (
  `${PAYROLL_PRINT_REPORT_ID_PREFIX}-${String(runId).padStart(4, '0')}`
);

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

export default function Nomina() {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? payrollCopy.es : payrollCopy.en;

  const [overview, setOverview] = useState<PayrollOverviewResponse | null>(null);
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
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
  const [printJob, setPrintJob] = useState<PayrollRunPdfDocumentProps | null>(null);
  const [runDialogNotice, setRunDialogNotice] = useState<PayrollDialogNotice | null>(null);
  const [preferencesForm, setPreferencesForm] = useState<PayrollPreferences>({
    grouping_mode: 'single',
    default_daily_hours: 8,
    pay_leave_days: true,
    isr_rate: 0.1,
    imss_employee_rate: 0.04,
    infonavit_employee_rate: 0.03,
    imss_employer_rate: 0.07,
    infonavit_employer_rate: 0.05,
    sar_employer_rate: 0.02,
  });
  const [generationForm, setGenerationForm] = useState<PayrollCreateRunsPayload>({
    pay_period: 'weekly',
    grouping_mode: 'single',
    period_start_date: firstDayOfMonth(),
    period_end_date: computePayrollPeriodEndDate('weekly', firstDayOfMonth()),
  });
  const [filters, setFilters] = useState({
    status: '',
    pay_period: '',
    grouping_mode: '',
    period_from: '',
    period_to: '',
    unit_id: '',
    business_id: '',
  });
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
      setGenerationForm((current) => ({
        ...current,
        grouping_mode: current.grouping_mode || overviewResponse.preferences.grouping_mode,
      }));
      setRuns(runsResponse.items);
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

  useEffect(() => {
    const expectedPeriodEndDate = computePayrollPeriodEndDate(
      generationForm.pay_period,
      generationForm.period_start_date,
    );

    setGenerationForm((current) => (
      current.period_end_date === expectedPeriodEndDate
        ? current
        : {
            ...current,
            period_end_date: expectedPeriodEndDate,
          }
    ));
  }, [generationForm.pay_period, generationForm.period_start_date]);

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

  const summaryCards = overview
    ? [
        { label: copy.summary.runs, value: overview.summary.runs_count },
        { label: copy.summary.draft, value: overview.summary.draft_count },
        { label: copy.summary.processed, value: overview.summary.processed_count },
        { label: copy.summary.approved, value: overview.summary.approved_count },
        { label: copy.summary.paid, value: overview.summary.paid_count },
        { label: copy.summary.cancelled, value: overview.summary.cancelled_count },
        { label: copy.summary.totalGross, value: formatCurrency(overview.summary.total_gross_amount, currentLanguage.code) },
        { label: copy.summary.totalNet, value: formatCurrency(overview.summary.total_net_amount, currentLanguage.code) },
      ]
    : [];

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

  const handleGenerateRuns = async () => {
    try {
      await runBusyTask({
        kind: 'generate-runs',
        title: copy.busy.generateTitle,
        description: copy.busy.generateDescription,
      }, async () => {
        const response = await humanResourcesApi.createPayrollRuns(generationForm);
        setSuccessMessage(copy.success.runsCreated);
        await loadPayroll(filters, { background: true });
        const firstRun = response.items[0];
        if (firstRun) {
          await fetchRunDetail(firstRun.id);
          setIsRunDialogOpen(true);
        }
      }, 1100);
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

  const applyFilters = async () => {
    try {
      await runBusyTask({
        kind: 'refresh',
        title: copy.busy.refreshTitle,
        description: copy.busy.refreshDescription,
      }, async () => {
        await loadPayroll(filters, { background: true });
      }, 700);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

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
            <Button variant="outline" size="sm" onClick={() => void applyFilters()}>
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

      <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
        <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_36%),linear-gradient(135deg,#10203c_0%,#14325d_55%,#155e75_100%)] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                Payroll command center
              </div>
              <h2 className="mb-2 flex items-center gap-3 text-3xl font-semibold tracking-[-0.03em] text-white">
                <span className="text-3xl">💰</span>
                {copy.title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-white/78">{copy.subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-end">
              <Button
                variant="outline"
                className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setIsPreferencesDialogOpen(true)}
              >
                <Settings className="h-4 w-4" />
                {copy.labels.openPreferences}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => void applyFilters()}
                disabled={isSaving}
              >
                {activeBusyKind === 'refresh' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {copy.refresh}
              </Button>
            </div>
          </div>
        </div>

        {overview?.recent_runs?.length ? (
          <div className="grid gap-4 border-t border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8 lg:grid-cols-3 dark:border-slate-700 dark:bg-slate-900/80">
            {overview.recent_runs.slice(0, 3).map((run) => (
              <button
                key={`hero-run-${run.id}`}
                type="button"
                onClick={() => void openRunDetail(run.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-950/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    #{run.id}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {copy.statuses[run.status]}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                  {run.grouping_label || copy.groupingModes[run.grouping_mode]}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(run.period_start_date, currentLanguage.code, run.period_start_date)} → {formatDate(run.period_end_date, currentLanguage.code, run.period_end_date)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{copy.labels.employees}</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{run.employees_count}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{copy.labels.net}</p>
                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{formatCurrency(run.net_amount, currentLanguage.code)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <Skeleton className="mb-3 h-4 w-28" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-[220px] rounded-lg" />
          <Skeleton className="h-[560px] rounded-lg" />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card, index) => {
              const icons = [Wallet, PlayCircle, Calculator, ShieldCheck, CreditCard, XCircle, FileSpreadsheet, Wallet] as const;
              const Icon = icons[index];
              const accentTones = [
                'from-sky-500/15 to-blue-600/5 border-sky-200',
                'from-amber-500/15 to-orange-500/5 border-amber-200',
                'from-emerald-500/15 to-teal-500/5 border-emerald-200',
                'from-indigo-500/15 to-blue-500/5 border-indigo-200',
                'from-cyan-500/15 to-sky-500/5 border-cyan-200',
                'from-rose-500/15 to-red-500/5 border-rose-200',
                'from-violet-500/15 to-fuchsia-500/5 border-violet-200',
                'from-slate-500/15 to-slate-700/5 border-slate-200',
              ] as const;
              return (
                <div
                  key={card.label}
                  className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-transform hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-900 ${accentTones[index]}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                    <div className="rounded-full bg-white/80 p-2 text-slate-900 shadow-sm dark:bg-slate-800/80 dark:text-slate-100">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold tracking-[-0.03em] text-slate-950 dark:text-white">{card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Run creation</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">{copy.labels.controlPanel}</h3>
                </div>
                <div className="rounded-2xl bg-sky-50 px-3 py-2 text-right dark:bg-sky-950/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">{copy.labels.groupingMode}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{copy.groupingModes[generationForm.grouping_mode]}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label={copy.labels.frequency}
                  value={generationForm.pay_period}
                  onChange={(value) => setGenerationForm({ ...generationForm, pay_period: value as PayrollCreateRunsPayload['pay_period'] })}
                  options={[
                    { value: 'weekly', label: copy.frequencies.weekly },
                    { value: 'biweekly', label: copy.frequencies.biweekly },
                    { value: 'monthly', label: copy.frequencies.monthly },
                  ]}
                />
                <SelectField
                  label={copy.labels.groupingMode}
                  value={generationForm.grouping_mode}
                  onChange={(value) => setGenerationForm({ ...generationForm, grouping_mode: value as PayrollCreateRunsPayload['grouping_mode'] })}
                  options={[
                    { value: 'single', label: copy.groupingModes.single },
                    { value: 'unit', label: copy.groupingModes.unit },
                    { value: 'business', label: copy.groupingModes.business },
                  ]}
                />
                <DateField
                  label={copy.labels.periodStart}
                  value={generationForm.period_start_date}
                  onChange={(value) => setGenerationForm({ ...generationForm, period_start_date: value })}
                />
                <DateField
                  label={copy.labels.periodEnd}
                  value={generationForm.period_end_date}
                  onChange={() => {}}
                  disabled
                  helperText={copy.labels.derivedEndDateHint}
                />
              </div>
              <div className="mt-5">
                <Button
                  onClick={() => void handleGenerateRuns()}
                  disabled={isSaving}
                  className="gap-2 rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  {activeBusyKind === 'generate-runs' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  {copy.labels.generate}
                </Button>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{copy.labels.filters}</h3>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SelectField
                  label={copy.labels.filterStatus}
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
                  label={copy.labels.groupingMode}
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
              </div>
              <div className="mt-5">
                <Button variant="outline" onClick={() => void applyFilters()} disabled={isSaving} className="gap-2 rounded-xl">
                  {activeBusyKind === 'refresh' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {copy.refresh}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{copy.labels.runs}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review generated runs, open a draft, and export the final ledger.</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {runs.length} active view
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <HeaderCell>{copy.labels.currentRun}</HeaderCell>
                    <HeaderCell>{copy.labels.groupingMode}</HeaderCell>
                    <HeaderCell>{copy.labels.payPeriod}</HeaderCell>
                    <HeaderCell>{copy.labels.employees}</HeaderCell>
                    <HeaderCell>{copy.labels.gross}</HeaderCell>
                    <HeaderCell>{copy.labels.net}</HeaderCell>
                    <HeaderCell>{copy.labels.status}</HeaderCell>
                    <HeaderCell>{copy.labels.detail}</HeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        {copy.labels.noRuns}
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <BodyCell>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatDate(run.period_start_date, currentLanguage.code, run.period_start_date)} → {formatDate(run.period_end_date, currentLanguage.code, run.period_end_date)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">#{run.id}</div>
                        </BodyCell>
                        <BodyCell>{run.grouping_label || copy.groupingModes[run.grouping_mode]}</BodyCell>
                        <BodyCell>{copy.frequencies[run.pay_period]}</BodyCell>
                        <BodyCell>{run.employees_count}</BodyCell>
                        <BodyCell>{formatCurrency(run.gross_amount, currentLanguage.code)}</BodyCell>
                        <BodyCell>{formatCurrency(run.net_amount, currentLanguage.code)}</BodyCell>
                        <BodyCell>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            run.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : run.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                : run.status === 'approved'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                                  : run.status === 'processed'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {copy.statuses[run.status]}
                          </span>
                        </BodyCell>
                        <BodyCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" disabled={isSaving} onClick={() => void openRunDetail(run.id)}>
                              {run.status === 'draft' ? <Pencil className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" disabled={isSaving} onClick={() => void handleDownload('csv', run)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" disabled={isSaving} onClick={() => void handleDownload('pdf', run)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </BodyCell>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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

      <PayrollRunPrintPortal
        job={printJob}
        onComplete={() => setPrintJob(null)}
      />
    </>
  );
}

function HeaderCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {children}
    </th>
  );
}

function BodyCell({ children }: { children: ReactNode }) {
  return <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{children}</td>;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  disabled = false,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
      />
      {helperText ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
      ) : null}
    </div>
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
  copy: typeof payrollCopy.en | typeof payrollCopy.es;
  isOpen: boolean;
  isSaving: boolean;
  form: PayrollPreferences;
  onClose: () => void;
  onChange: (value: PayrollPreferences) => void;
  onSave: () => void;
}) {
  const rateFields = [
    { key: 'isr_rate', label: 'ISR' },
    { key: 'imss_employee_rate', label: 'IMSS employee' },
    { key: 'infonavit_employee_rate', label: 'INFONAVIT employee' },
    { key: 'imss_employer_rate', label: 'IMSS employer' },
    { key: 'infonavit_employer_rate', label: 'INFONAVIT employer' },
    { key: 'sar_employer_rate', label: 'SAR employer' },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.labels.preferences}</DialogTitle>
          <DialogDescription>{copy.labels.rates}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField
              label={copy.labels.groupingMode}
              value={form.grouping_mode}
              onChange={(value) => onChange({ ...form, grouping_mode: value as PayrollPreferences['grouping_mode'] })}
              options={[
                { value: 'single', label: copy.groupingModes.single },
                { value: 'unit', label: copy.groupingModes.unit },
                { value: 'business', label: copy.groupingModes.business },
              ]}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{copy.labels.defaultDailyHours}</label>
              <input
                type="number"
                min="0.5"
                step="0.25"
                value={form.default_daily_hours}
                onChange={(event) => onChange({ ...form, default_daily_hours: Number(event.target.value) })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.pay_leave_days}
                  onChange={(event) => onChange({ ...form, pay_leave_days: event.target.checked })}
                />
                {copy.labels.payLeaveDays}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rateFields.map((field) => (
              <div key={field.key}>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.00001"
                  value={form[field.key]}
                  onChange={(event) => onChange({ ...form, [field.key]: Number(event.target.value) })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-700 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>{copy.labels.close}</Button>
          <Button onClick={onSave} disabled={isSaving} className="gap-2 rounded-xl">
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {copy.labels.save}
          </Button>
        </DialogFooter>
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
  copy: typeof payrollCopy.en | typeof payrollCopy.es;
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
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                notice.tone === 'success'
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
                    <DetailMetric label={copy.labels.employees} value={String(detail.run.employees_count)} />
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
                      className={`w-full rounded-lg border px-4 py-4 text-left transition-all ${
                        selectedLineId === line.id
                          ? 'border-blue-700 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-950/20'
                          : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{line.employee_name}</p>
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
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedLine.employee_name}</p>
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

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
