import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  CreditCard,
  Download,
  Filter,
  Globe2,
  Info,
  Landmark,
  LoaderCircle,
  MapPinned,
  Pencil,
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
  type BackendEmployee,
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
import { SelectField, DateField } from './components/PayrollFormFields';
import { PayrollTableActionButton } from './components/PayrollTableActionButton';
import { DetailMetric } from './components/DetailMetric';
import { PayrollGenerateModal, type PayrollGenerationDraft } from './components/PayrollGenerateModal';

const PAYROLL_PRINT_REPORT_ID_PREFIX = 'IDX-PR';
const payrollRateFieldKeys = [
  'isr_rate',
  'imss_employee_rate',
  'infonavit_employee_rate',
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

const payrollCopy = {
  en: {
    title: 'Payroll',
    subtitle: 'Review, process, approve, pay, and export payroll runs using real employee and attendance data.',
    refresh: 'Refresh',
    applyFilters: 'Apply filters',
    retry: 'Retry',
    loading: 'Loading payroll',
    unauthorized: 'Your session is no longer authenticated. Sign in again and reload the module.',
    notFound: 'The running backend does not expose the payroll API yet. Restart the Spring server on the latest branch.',
    genericError: 'Unable to load payroll.',
    success: {
      preferences: 'Payroll preferences saved successfully.',
      rates: 'Payroll rates saved successfully.',
      runsCreated: 'Payroll runs generated successfully.',
      lineSaved: 'Payroll line updated successfully.',
      runEdited: 'Payroll run updated successfully.',
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
      ratesTitle: 'Saving payroll rates',
      ratesDescription: 'Applying the active country profile and persisting the configured rates.',
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
      period: 'Period',
      periodStart: 'Period start',
      periodEnd: 'Period end',
      periodFrom: 'Period from',
      periodTo: 'Period to',
      periodThisMonth: 'This month',
      periodLastMonth: 'Last month',
      periodTwoMonthsAgo: 'Two months ago',
      periodAllYear: 'All year',
      periodCustom: 'Custom',
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
      paidBreaks: 'Paid breaks',
      vacationDays: 'Vacation days',
      lateCount: 'Late count',
      selectedRun: 'Selected run',
      generate: 'Generate payroll',
      save: 'Save',
      savePreferences: 'Save preferences',
      saveRates: 'Save rates',
      cancel: 'Cancel',
      closeDetail: 'Close detail',
      employerCosts: 'Employer costs',
      openPreferences: 'Preferences',
      openRates: 'Rate configuration',
      openRun: 'Open',
      edit: 'Edit',
      print: 'Print',
      editDraft: 'Edit draft',
      filterStatus: 'Status',
      payrollType: 'Payroll type',
      totalAmount: 'Total amount',
      salary: 'Salary',
      holidays: 'Holidays',
      totalToPay: 'Total to pay',
      taxCalculation: 'Tax calculation',
      columns: 'Columns',
      simplifiedPayroll: 'Simplified Payroll',
      detailedPayroll: 'Detailed Payroll',
      rfc: 'RFC',
      curp: 'CURP',
      nss: 'NSS',
      daysWorked: 'Days Worked',
      daysAbsent: 'Days Absent',
      overtime: 'Overtime',
      paidHolidays: 'Paid Holidays',
      totalPay: 'Total Pay',
      dailyWage: 'Daily Wage',
      baseWage: 'Base Wage',
      integratedDailyWage: 'Integrated Daily Wage',
      baseContributionSalary: 'Base Contribution Salary',
      periodSalary: 'Period Salary',
      overtimeAmount: 'Overtime ($)',
      bonusesCommissions: 'Bonuses/Commissions',
      vacationBonus: 'Vacation Bonus',
      proportionalChristmasBonus: 'Proportional Christmas Bonus',
      totalEarnings: 'Total Earnings',
      incomeTaxWithheld: 'Income Tax Withheld',
      imssEmployee: 'IMSS Employee',
      infonavitType: 'INFONAVIT (Type)',
      infonavitDiscount: 'INFONAVIT Discount',
      loans: 'Loans',
      otherDiscounts: 'Other Discounts',
      totalDeductions: 'Total Deductions',
      taxPayroll: 'Tax Payroll',
      netPay: 'Net Pay',
      jurisdiction: 'Jurisdiction',
      countryProfiles: 'Country profiles',
      operationalSettings: 'Operational settings',
      rateProfile: 'Rate profile',
      presetRates: 'Presets',
      manualRates: 'Manual',
      activeRateProfile: 'Active rate profile',
      noJurisdiction: 'From employee profile',
      automatic: 'Automatic',
      multipleBusinesses: 'Multiple businesses',
      allUnits: 'All units',
      allBusinesses: 'All businesses',
      recommended: 'Recommended',
      actionButtons: 'Action buttons',
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
      single: 'Single',
      unit: 'Per unit',
      business: 'Per business',
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
    preferencesInfo: {
      title: 'Important information about payroll preferences',
      bullets: [
        'Default behavior: payroll runs can be separated automatically by country and province/state when local fiscal rules require it.',
        'Automatic grouping: collaborators always remain organized by their configured pay period: weekly, biweekly, or monthly.',
        'Customization: you can change how payroll runs are grouped to match the way your operation is structured.',
      ],
      selectionTitle: 'Choose how you want payroll grouped:',
      note: 'Regardless of the grouping you choose, collaborators are always organized automatically according to the pay period configured on their profile.',
    },
    groupingCards: {
      single: {
        title: 'Single payroll (default)',
        description: 'Everyone is kept inside one payroll run. In countries that require province or state separation, payroll is split automatically by local fiscal rules.',
      },
      unit: {
        title: 'By business unit',
        description: 'One payroll run is created for each business unit so teams can review their totals independently.',
      },
      business: {
        title: 'By business',
        description: 'One payroll run is created for each registered business, making it easier to review each operating entity.',
      },
    },
    rateConfiguration: {
      title: 'Payroll configuration',
      subtitles: {
        mexico: 'Define how payroll is calculated based on Mexican tax and social contribution rules.',
        canada: 'Define how payroll is calculated based on Canadian payroll tax and contribution rules.',
        usa: 'Define how payroll is calculated based on United States payroll tax and employer contribution rules.',
        colombia: 'Define how payroll is calculated based on Colombian withholding and contribution rules.',
        brazil: 'Define how payroll is calculated based on Brazilian payroll tax and social contribution rules.',
        custom: 'Define a company-specific payroll configuration with fully manual contribution values.',
      },
      infoBlocks: {
        mexico: 'Mexico payroll includes taxes and social contributions that are automatically calculated based on official rules. You can customize certain values if needed.',
        canada: 'Canada payroll includes taxes and contributions that are usually calculated from official federal and provincial rules. You can customize certain values when needed.',
        usa: 'United States payroll includes withholding, social taxes, and employer contributions that are commonly managed through official rules. You can customize certain values when needed.',
        colombia: 'Colombia payroll includes withholding and contributions that typically follow statutory formulas. You can customize selected values when needed.',
        brazil: 'Brazil payroll includes taxes and mandatory contributions that generally follow official formulas. You can customize selected values when needed.',
        custom: 'Custom profiles give you full control over payroll rates when your company needs a specialized setup outside the standard country presets.',
      },
      footerNote: 'Country profiles apply standardized payroll structures while allowing flexibility for company-specific adjustments.',
      activeProfileLabel: 'Active payroll profile',
      saveAction: 'Save configuration',
      viewBreakdown: 'View breakdown',
      presetApplied: 'Using the official preset for this country profile.',
      advancedEnabled: 'Advanced editing is enabled for this payroll field.',
      switchToAdvanced: 'Switch to Advanced to customize this value.',
      statusBadges: {
        officialPreset: 'Official preset',
        customProfile: 'Custom profile',
        automatic: 'Automatic',
        fixedByLaw: 'Fixed by law',
        editable: 'Editable',
      },
      modeLabels: {
        preset: 'Preset',
        advanced: 'Advanced',
        officialTable: 'Official table',
        fixedRate: 'Fixed rate',
        salaryPercentage: '% of salary',
      },
      mexicoCards: {
        incomeTaxTitle: 'Income Tax (ISR)',
        officialTableHelper: 'Calculated automatically based on SAT tax tables',
        progressiveTooltip: 'Progressive tax based on employee income',
        imssEmployeeTitle: 'IMSS — Employee',
        imssEmployeeBody: 'Calculated based on Mexican social security law',
        imssEmployerTitle: 'IMSS — Employer',
        imssEmployerBody: 'Includes employer contributions required by law',
        infonavitEmployeeTitle: 'INFONAVIT — Employee',
        infonavitEmployeeHelper: 'May vary depending on employee credit conditions',
        infonavitEmployerTitle: 'INFONAVIT — Employer',
        infonavitEmployerValue: '5% of salary',
        sarTitle: 'SAR (Retirement Savings)',
        sarValue: '2%',
        sarHelper: 'Retirement contribution required in Mexico',
      },
      profiles: {
        mexico: 'Mexico',
        canada: 'Canada',
        usa: 'USA',
        colombia: 'Colombia',
        brazil: 'Brazil',
        custom: 'Custom rate',
      },
      profileDescriptions: {
        mexico: 'Configure payroll for Mexican tax and social contribution structures.',
        canada: 'Set up payroll rates for Canadian withholding and employer obligations.',
        usa: 'Adjust payroll rates for federal, state, and employer payroll obligations in the United States.',
        colombia: 'Prepare withholding and contribution rates for Colombian payroll operations.',
        brazil: 'Define tax and contribution rates for Brazilian payroll calculations.',
        custom: 'Build a fully custom rate mix for companies with non-standard payroll rules.',
      },
      fieldLabels: {
        mexico: {
          isr_rate: 'Income tax (ISR)',
          imss_employee_rate: 'Employee IMSS',
          infonavit_employee_rate: 'Employee INFONAVIT',
          imss_employer_rate: 'Employer IMSS',
          infonavit_employer_rate: 'Employer INFONAVIT',
          sar_employer_rate: 'Employer SAR',
        },
        canada: {
          isr_rate: 'Federal / provincial tax',
          imss_employee_rate: 'Employee CPP / QPP',
          infonavit_employee_rate: 'Employee EI',
          imss_employer_rate: 'Employer CPP / QPP',
          infonavit_employer_rate: 'Employer EI',
          sar_employer_rate: 'Employer retirement / benefits',
        },
        usa: {
          isr_rate: 'Federal / state withholding',
          imss_employee_rate: 'Employee Social Security',
          infonavit_employee_rate: 'Employee Medicare / other',
          imss_employer_rate: 'Employer Social Security',
          infonavit_employer_rate: 'Employer Medicare / FUTA / SUTA',
          sar_employer_rate: 'Employer retirement / benefits',
        },
        colombia: {
          isr_rate: 'Income withholding',
          imss_employee_rate: 'Employee health',
          infonavit_employee_rate: 'Employee pension',
          imss_employer_rate: 'Employer health / parafiscals',
          infonavit_employer_rate: 'Employer pension',
          sar_employer_rate: 'Employer severance / benefits',
        },
        brazil: {
          isr_rate: 'Income tax (IRRF)',
          imss_employee_rate: 'Employee INSS',
          infonavit_employee_rate: 'Employee FGTS / other',
          imss_employer_rate: 'Employer INSS',
          infonavit_employer_rate: 'Employer FGTS',
          sar_employer_rate: 'Employer retirement / benefits',
        },
        custom: {
          isr_rate: 'Primary tax rate',
          imss_employee_rate: 'Employee contribution A',
          infonavit_employee_rate: 'Employee contribution B',
          imss_employer_rate: 'Employer contribution A',
          infonavit_employer_rate: 'Employer contribution B',
          sar_employer_rate: 'Employer retirement / other',
        },
      },
    },
  },
  es: {
    title: 'Nómina',
    subtitle: 'Revisa, procesa, aprueba, paga y exporta corridas de nómina con datos reales de colaboradores y asistencia.',
    refresh: 'Actualizar',
    applyFilters: 'Aplicar filtros',
    retry: 'Reintentar',
    loading: 'Cargando nómina',
    unauthorized: 'Tu sesión ya no está autenticada. Inicia sesión de nuevo y vuelve a cargar el módulo.',
    notFound: 'El backend en ejecución todavía no expone la API de nómina. Reinicia Spring con la versión más reciente.',
    genericError: 'No se pudo cargar la nómina.',
    success: {
      preferences: 'Preferencias de nómina guardadas correctamente.',
      rates: 'Tasas de nómina guardadas correctamente.',
      runsCreated: 'Corridas de nómina generadas correctamente.',
      lineSaved: 'Línea de nómina actualizada correctamente.',
      runEdited: 'Corrida de nómina actualizada correctamente.',
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
      ratesTitle: 'Guardando tasas de nómina',
      ratesDescription: 'Aplicando el perfil de país activo y persistiendo las tasas configuradas.',
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
      period: 'Período',
      periodStart: 'Inicio del período',
      periodEnd: 'Fin del período',
      periodThisMonth: 'Este mes',
      periodLastMonth: 'Mes pasado',
      periodTwoMonthsAgo: 'Hace dos meses',
      periodAllYear: 'Todo el año',
      periodCustom: 'Personalizado',
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
      paidBreaks: 'Descansos pagados',
      vacationDays: 'Días de vacaciones',
      lateCount: 'Retardos',
      selectedRun: 'Corrida seleccionada',
      generate: 'Generar nómina',
      save: 'Guardar',
      savePreferences: 'Guardar preferencias',
      saveRates: 'Guardar tasas',
      cancel: 'Cancelar',
      closeDetail: 'Cerrar detalle',
      employerCosts: 'Costos patronales',
      openPreferences: 'Preferencias',
      openRates: 'Configurar tasas',
      openRun: 'Abrir',
      edit: 'Editar',
      print: 'Imprimir',
      editDraft: 'Editar borrador',
      filterStatus: 'Estado',
      payrollType: 'Tipo de nómina',
      totalAmount: 'Monto total',
      salary: 'Salario',
      holidays: 'Días feriados',
      totalToPay: 'Total a pagar',
      taxCalculation: 'Cálculo de impuestos',
      columns: 'Columnas',
      simplifiedPayroll: 'Nómina Simplificada',
      detailedPayroll: 'Nómina Detallada',
      rfc: 'RFC',
      curp: 'CURP',
      nss: 'NSS',
      daysWorked: 'Días Trabajados',
      daysAbsent: 'Días Ausentes',
      overtime: 'Horas Extra',
      paidHolidays: 'Días Festivos Pagados',
      totalPay: 'Total a Pagar',
      dailyWage: 'Salario Diario',
      baseWage: 'Salario Base',
      integratedDailyWage: 'Salario Diario Integrado',
      baseContributionSalary: 'Salario Base de Cotización',
      periodSalary: 'Salario del Período',
      overtimeAmount: 'Horas Extra ($)',
      bonusesCommissions: 'Bonos/Comisiones',
      vacationBonus: 'Prima Vacacional',
      proportionalChristmasBonus: 'Aguinaldo Proporcional',
      totalEarnings: 'Total de Percepciones',
      incomeTaxWithheld: 'ISR Retenido',
      imssEmployee: 'IMSS Trabajador',
      infonavitType: 'INFONAVIT (Tipo)',
      infonavitDiscount: 'Descuento INFONAVIT',
      loans: 'Préstamos',
      otherDiscounts: 'Otros Descuentos',
      totalDeductions: 'Total de Deducciones',
      taxPayroll: 'Nómina Fiscal',
      netPay: 'Neto a Pagar',
      jurisdiction: 'Jurisdicción',
      countryProfiles: 'Perfiles por país',
      operationalSettings: 'Ajustes operativos',
      rateProfile: 'Perfil de tasas',
      presetRates: 'Predeterminados',
      manualRates: 'Manuales',
      activeRateProfile: 'Perfil de tasas activo',
      noJurisdiction: 'Según perfil del colaborador',
      automatic: 'Automático',
      multipleBusinesses: 'Múltiples negocios',
      allUnits: 'Todas las unidades',
      allBusinesses: 'Todos los negocios',
      recommended: 'Recomendado',
      actionButtons: 'Botones de acción',
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
      single: 'Única',
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
    preferencesInfo: {
      title: 'Información importante sobre las preferencias de nómina',
      bullets: [
        'Configuración predeterminada: las nóminas pueden separarse automáticamente por país y provincia/estado cuando las reglas fiscales locales lo requieran.',
        'Agrupación automática: los colaboradores siempre se organizan según su período de pago configurado: semanal, quincenal o mensual.',
        'Personalización: puedes cambiar la forma en que se generan las nóminas para alinearlas con la estructura de tu operación.',
      ],
      selectionTitle: 'Selecciona cómo deseas agrupar las nóminas:',
      note: 'Independientemente de la agrupación que elijas, los colaboradores siempre se organizarán automáticamente según el período de pago configurado en su perfil.',
    },
    groupingCards: {
      single: {
        title: 'Nómina única (predeterminado)',
        description: 'Todos se mantienen dentro de una sola corrida. En países que requieren separación por provincia o estado, la nómina se divide automáticamente según las reglas fiscales locales.',
      },
      unit: {
        title: 'Por unidad de negocio',
        description: 'Se crea una corrida de nómina por cada unidad de negocio para revisar los totales por equipo.',
      },
      business: {
        title: 'Por negocio',
        description: 'Se crea una corrida de nómina por cada negocio registrado, facilitando la revisión por entidad operativa.',
      },
    },
    rateConfiguration: {
      title: 'Configuración de nómina',
      subtitles: {
        mexico: 'Define cómo se calcula la nómina con base en las reglas mexicanas de impuestos y contribuciones sociales.',
        canada: 'Define cómo se calcula la nómina con base en las reglas canadienses de impuestos y contribuciones.',
        usa: 'Define cómo se calcula la nómina con base en las reglas de impuestos y aportaciones patronales de Estados Unidos.',
        colombia: 'Define cómo se calcula la nómina con base en las reglas colombianas de retención y contribuciones.',
        brazil: 'Define cómo se calcula la nómina con base en las reglas brasileñas de impuestos y contribuciones sociales.',
        custom: 'Define una configuración de nómina específica para tu empresa con valores manuales y totalmente personalizados.',
      },
      infoBlocks: {
        mexico: 'La nómina en México incluye impuestos y contribuciones sociales que se calculan automáticamente con base en reglas oficiales. Puedes personalizar ciertos valores si lo necesitas.',
        canada: 'La nómina en Canadá incluye impuestos y contribuciones que normalmente se calculan con reglas oficiales federales y provinciales. Puedes personalizar ciertos valores si lo necesitas.',
        usa: 'La nómina en Estados Unidos incluye retenciones, impuestos sociales y aportaciones patronales que normalmente siguen reglas oficiales. Puedes personalizar ciertos valores si lo necesitas.',
        colombia: 'La nómina en Colombia incluye retenciones y contribuciones que generalmente siguen fórmulas legales. Puedes personalizar ciertos valores si lo necesitas.',
        brazil: 'La nómina en Brasil incluye impuestos y contribuciones obligatorias que suelen seguir fórmulas oficiales. Puedes personalizar ciertos valores si lo necesitas.',
        custom: 'Los perfiles personalizados te dan control total sobre las tasas de nómina cuando tu empresa necesita una configuración especial fuera de los perfiles estándar por país.',
      },
      footerNote: 'Los perfiles por país aplican estructuras de nómina estandarizadas y al mismo tiempo permiten flexibilidad para ajustes específicos de tu empresa.',
      activeProfileLabel: 'Perfil activo de nómina',
      saveAction: 'Guardar configuración',
      viewBreakdown: 'Ver desglose',
      presetApplied: 'Se está usando el perfil oficial de este país.',
      advancedEnabled: 'La edición avanzada está habilitada para este campo de nómina.',
      switchToAdvanced: 'Cambia a Avanzado para personalizar este valor.',
      statusBadges: {
        officialPreset: 'Predeterminado oficial',
        customProfile: 'Perfil personalizado',
        automatic: 'Automático',
        fixedByLaw: 'Fijo por ley',
        editable: 'Editable',
      },
      modeLabels: {
        preset: 'Predeterminado',
        advanced: 'Avanzado',
        officialTable: 'Tabla oficial',
        fixedRate: 'Tasa fija',
        salaryPercentage: '% del salario',
      },
      mexicoCards: {
        incomeTaxTitle: 'Impuesto sobre la renta (ISR)',
        officialTableHelper: 'Se calcula automáticamente con base en las tablas del SAT',
        progressiveTooltip: 'Impuesto progresivo según el ingreso del colaborador',
        imssEmployeeTitle: 'IMSS — Colaborador',
        imssEmployeeBody: 'Se calcula con base en la ley mexicana del seguro social',
        imssEmployerTitle: 'IMSS — Patronal',
        imssEmployerBody: 'Incluye las contribuciones patronales requeridas por ley',
        infonavitEmployeeTitle: 'INFONAVIT — Colaborador',
        infonavitEmployeeHelper: 'Puede variar según las condiciones de crédito del colaborador',
        infonavitEmployerTitle: 'INFONAVIT — Patronal',
        infonavitEmployerValue: '5% del salario',
        sarTitle: 'SAR (Ahorro para el retiro)',
        sarValue: '2%',
        sarHelper: 'Contribución de retiro obligatoria en México',
      },
      profiles: {
        mexico: 'México',
        canada: 'Canadá',
        usa: 'USA',
        colombia: 'Colombia',
        brazil: 'Brasil',
        custom: 'Tasa personalizada',
      },
      profileDescriptions: {
        mexico: 'Configura la nómina para estructuras fiscales y de contribuciones mexicanas.',
        canada: 'Configura tasas para retenciones y obligaciones patronales canadienses.',
        usa: 'Ajusta tasas para obligaciones federales, estatales y patronales en Estados Unidos.',
        colombia: 'Prepara retenciones y contribuciones para operaciones de nómina en Colombia.',
        brazil: 'Define tasas de impuestos y contribuciones para cálculos de nómina en Brasil.',
        custom: 'Construye una mezcla de tasas completamente personalizada para reglas no estándar.',
      },
      fieldLabels: {
        mexico: {
          isr_rate: 'Impuesto sobre la renta (ISR)',
          imss_employee_rate: 'IMSS colaborador',
          infonavit_employee_rate: 'INFONAVIT colaborador',
          imss_employer_rate: 'IMSS patronal',
          infonavit_employer_rate: 'INFONAVIT patronal',
          sar_employer_rate: 'SAR patronal',
        },
        canada: {
          isr_rate: 'Impuesto federal / provincial',
          imss_employee_rate: 'CPP / QPP colaborador',
          infonavit_employee_rate: 'EI colaborador',
          imss_employer_rate: 'CPP / QPP patronal',
          infonavit_employer_rate: 'EI patronal',
          sar_employer_rate: 'Retiro / beneficios patronales',
        },
        usa: {
          isr_rate: 'Retención federal / estatal',
          imss_employee_rate: 'Seguro Social colaborador',
          infonavit_employee_rate: 'Medicare / otros colaborador',
          imss_employer_rate: 'Seguro Social patronal',
          infonavit_employer_rate: 'Medicare / FUTA / SUTA patronal',
          sar_employer_rate: 'Retiro / beneficios patronales',
        },
        colombia: {
          isr_rate: 'Retención en la fuente',
          imss_employee_rate: 'Salud colaborador',
          infonavit_employee_rate: 'Pensión colaborador',
          imss_employer_rate: 'Salud / parafiscales patronal',
          infonavit_employer_rate: 'Pensión patronal',
          sar_employer_rate: 'Cesantías / beneficios patronales',
        },
        brazil: {
          isr_rate: 'Impuesto sobre la renta (IRRF)',
          imss_employee_rate: 'INSS colaborador',
          infonavit_employee_rate: 'FGTS / otros colaborador',
          imss_employer_rate: 'INSS patronal',
          infonavit_employer_rate: 'FGTS patronal',
          sar_employer_rate: 'Retiro / beneficios patronales',
        },
        custom: {
          isr_rate: 'Tasa principal de impuesto',
          imss_employee_rate: 'Contribución colaborador A',
          infonavit_employee_rate: 'Contribución colaborador B',
          imss_employer_rate: 'Contribución patronal A',
          infonavit_employer_rate: 'Contribución patronal B',
          sar_employer_rate: 'Retiro / otros patronal',
        },
      },
    },
  },
} as const;

type PayrollCopy = typeof payrollCopy.en | typeof payrollCopy.es;

const pickPayrollRateValues = (preferences: PayrollPreferences): PayrollRateValues => ({
  isr_rate: preferences.isr_rate,
  imss_employee_rate: preferences.imss_employee_rate,
  infonavit_employee_rate: preferences.infonavit_employee_rate,
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
  imss_employee_rate: 0.04,
  infonavit_employee_rate: 0.03,
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

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const resolveGenerationPeriod = (
  periodRange: string,
  periodFrom: string,
  periodTo: string,
) => {
  const now = new Date();

  if (periodRange === 'custom' && periodFrom && periodTo) {
    return {
      periodStartDate: periodFrom,
      periodEndDate: periodTo,
    };
  }

  if (periodRange === 'this_month') {
    return {
      periodStartDate: toIsoDate(startOfMonth(now)),
      periodEndDate: toIsoDate(endOfMonth(now)),
    };
  }

  if (periodRange === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      periodStartDate: toIsoDate(startOfMonth(lastMonth)),
      periodEndDate: toIsoDate(endOfMonth(lastMonth)),
    };
  }

  if (periodRange === 'two_months_ago') {
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return {
      periodStartDate: toIsoDate(startOfMonth(twoMonthsAgo)),
      periodEndDate: toIsoDate(endOfMonth(twoMonthsAgo)),
    };
  }

  return {
    periodStartDate: toIsoDate(startOfMonth(now)),
    periodEndDate: toIsoDate(endOfMonth(now)),
  };
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

type PayrollRunEditForm = {
  status: PayrollRunSummary['status'];
  employeesCount: string;
  netAmount: string;
  jurisdiction: string;
};

type PayrollEditTableColumnKey =
  | 'unit'
  | 'business'
  | 'employee'
  | 'daysWorked'
  | 'daysAbsent'
  | 'overtime'
  | 'vacationDays'
  | 'paidHolidays'
  | 'bonusesCommissions'
  | 'loans'
  | 'totalEarnings'
  | 'totalDeductions'
  | 'taxPayroll'
  | 'netPay';

type PayrollEditTableRow = {
  id: number | string;
  unit: string;
  business: string;
  employee: string;
  daysWorked: number;
  daysAbsent: number;
  overtime: number;
  vacationDays: number;
  paidHolidays: number;
  bonusesCommissions: number;
  loans: number;
  totalEarnings: number;
  totalDeductions: number;
  taxPayroll: boolean;
  netPay: number;
};

type PayrollEditableAttendanceField =
  | 'daysWorked'
  | 'daysAbsent'
  | 'overtime'
  | 'vacationDays'
  | 'paidHolidays';

type PayrollDetailedColumnKey =
  | 'employee'
  | 'rfc'
  | 'curp'
  | 'nss'
  | 'unit'
  | 'business'
  | 'daysWorked'
  | 'daysAbsent'
  | 'overtime'
  | 'vacationDays'
  | 'paidHolidays'
  | 'totalPay'
  | 'dailyWage'
  | 'baseWage'
  | 'integratedDailyWage'
  | 'baseContributionSalary'
  | 'periodSalary'
  | 'overtimeAmount'
  | 'bonusesCommissions'
  | 'vacationBonus'
  | 'proportionalChristmasBonus'
  | 'totalEarnings'
  | 'incomeTaxWithheld'
  | 'imssEmployee'
  | 'infonavitType'
  | 'infonavitDiscount'
  | 'loans'
  | 'otherDiscounts'
  | 'totalDeductions'
  | 'netPay';

type PayrollDetailedRow = {
  id: number | string;
  employee: string;
  rfc: string;
  curp: string;
  nss: string;
  unit: string;
  business: string;
  daysWorked: number;
  daysAbsent: number;
  overtime: number;
  vacationDays: number;
  paidHolidays: number;
  totalPay: number;
  dailyWage: number;
  baseWage: number;
  integratedDailyWage: number;
  baseContributionSalary: number;
  periodSalary: number;
  overtimeAmount: number;
  bonusesCommissions: number;
  vacationBonus: number;
  proportionalChristmasBonus: number;
  totalEarnings: number;
  incomeTaxWithheld: number;
  imssEmployee: number;
  infonavitType: string;
  infonavitDiscount: number;
  loans: number;
  otherDiscounts: number;
  totalDeductions: number;
  netPay: number;
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

export default function Payroll() {
  const { currentLanguage } = useLanguage();
  const copy = currentLanguage.code.startsWith('es') ? payrollCopy.es : payrollCopy.en;

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
      employees_count: 12,
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
      employees_count: 9,
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
      employees_count: 15,
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
      employees_count: 8,
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
      employees_count: 15,
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
      employees_count: 11,
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
      employees_count: 19,
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
  const [employees, setEmployees] = useState<BackendEmployee[]>([]);
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
  const [isRateConfigDialogOpen, setIsRateConfigDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isEditRunDialogOpen, setIsEditRunDialogOpen] = useState(false);
  const [isEditRunDetailLoading, setIsEditRunDetailLoading] = useState(false);
  const [editRunDetail, setEditRunDetail] = useState<PayrollRunDetailResponse | null>(null);
  const [editingRun, setEditingRun] = useState<PayrollRunSummary | null>(null);
  const [editRunForm, setEditRunForm] = useState<PayrollRunEditForm | null>(null);
  const [printJob, setPrintJob] = useState<PayrollRunPdfDocumentProps | null>(null);
  const [runDialogNotice, setRunDialogNotice] = useState<PayrollDialogNotice | null>(null);
  const [preferencesForm, setPreferencesForm] = useState<PayrollPreferences>(defaultPayrollPreferences);
  const [selectedRateProfile, setSelectedRateProfile] = useState<PayrollRateProfileKey>('mexico');
  const [rateDrafts, setRateDrafts] = useState<PayrollRateDrafts>(() => createPayrollRateDrafts(defaultPayrollPreferences));
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
  const activeRateValues = rateDrafts[selectedRateProfile];
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
          aValue = a.employees_count;
          bValue = b.employees_count;
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
      const [overviewResponse, runsResponse, employeesResponse, unitsResponse, businessesResponse] = await Promise.all([
        humanResourcesApi.getPayrollOverview(),
        humanResourcesApi.listPayrollRuns(activeFilters),
        humanResourcesApi.listEmployees().catch(() => ({
          items: [], count: 0, summary: {
            total_count: 0,
            active_count: 0,
            inactive_count: 0,
            terminated_count: 0,
            total_payroll_amount_monthly: 0,
          }
        })),
        dashboardApi.listUnits().catch(() => []),
        dashboardApi.listBusinesses().catch(() => []),
      ]);

      setOverview(overviewResponse);
      setPreferencesForm(overviewResponse.preferences);
      setRateDrafts((currentDrafts) => ({
        ...currentDrafts,
        custom: pickPayrollRateValues(overviewResponse.preferences),
      }));
      const shouldUseSeedRuns = runsResponse.items.length === 0;
      setRuns(shouldUseSeedRuns ? seedRuns : runsResponse.items);
      setJurisdictionsByRunId(shouldUseSeedRuns ? seedJurisdictionsByRunId : {});
      setEmployees(employeesResponse.items || []);
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

  const updateActiveRateValue = (field: PayrollRateFieldKey, value: number) => {
    setRateDrafts((currentDrafts) => ({
      ...currentDrafts,
      [selectedRateProfile]: {
        ...currentDrafts[selectedRateProfile],
        [field]: value,
      },
    }));
  };

  const openRateConfiguration = () => {
    setRateDrafts((currentDrafts) => ({
      ...currentDrafts,
      custom: pickPayrollRateValues(preferencesForm),
    }));
    setIsRateConfigDialogOpen(true);
  };

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

  const handleSaveRates = async () => {
    const nextPreferences = applyPayrollRateValues(preferencesForm, rateDrafts[selectedRateProfile]);

    try {
      await runBusyTask({
        kind: 'save-preferences',
        title: copy.busy.ratesTitle,
        description: copy.busy.ratesDescription,
      }, async () => {
        await humanResourcesApi.updatePayrollPreferences(nextPreferences);
        setPreferencesForm(nextPreferences);
        setRateDrafts((currentDrafts) => ({
          ...currentDrafts,
          custom: pickPayrollRateValues(nextPreferences),
        }));
        setIsRateConfigDialogOpen(false);
        setSuccessMessage(copy.success.rates);
        await loadPayroll(filters, { background: true });
      });
    } catch (error) {
      setErrorMessage(toErrorMessage(error, copy));
    }
  };

  const handleGenerateRuns = async (draft?: PayrollGenerationDraft) => {
    if (draft) {
      setFilters((current) => ({
        ...current,
        period_range: draft.periodRange,
        period_from: draft.periodFrom,
        period_to: draft.periodTo,
        pay_period: draft.payPeriod,
        grouping_mode: draft.groupingMode,
      }));
    }

    const { periodStartDate, periodEndDate } = resolveGenerationPeriod(
      draft?.periodRange ?? filters.period_range,
      draft?.periodFrom ?? filters.period_from,
      draft?.periodTo ?? filters.period_to,
    );

    const payload: PayrollCreateRunsPayload = {
      pay_period: (draft?.payPeriod || filters.pay_period || 'weekly') as PayrollCreateRunsPayload['pay_period'],
      grouping_mode: (draft?.groupingMode || filters.grouping_mode || preferencesForm.grouping_mode) as PayrollCreateRunsPayload['grouping_mode'],
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
    };

    try {
      await runBusyTask({
        kind: 'generate-runs',
        title: copy.busy.generateTitle,
        description: copy.busy.generateDescription,
      }, async () => {
        const response = await humanResourcesApi.createPayrollRuns(payload);
        setIsGenerateModalOpen(false);
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
      employeesCount: String(run.employees_count),
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
          employees_count: Number.isFinite(parsedEmployees) ? Math.max(0, parsedEmployees) : run.employees_count,
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

      <div className="mb-6 rounded-lg border border-[#143675]/20 bg-[#143675]/5 p-6 dark:border-[#143675]/30 dark:bg-[#143675]/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-white">
              <span className="text-2xl">💰</span>
              {copy.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsGenerateModalOpen(true)}
              disabled={isSaving}
              className="gap-2 bg-[#143675] text-white hover:bg-[#0f2855]"
            >
              <PlayCircle className="h-4 w-4" />
              {copy.labels.generate}
            </Button>
            <Button
              variant="outline"
              onClick={openRateConfiguration}
              className="gap-2 border-[#143675] text-[#143675] hover:bg-[#143675] hover:text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {copy.labels.openRates}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsPreferencesDialogOpen(true)}
              className="gap-2 border-[#143675] text-[#143675] hover:bg-[#143675] hover:text-white"
            >
              <Settings className="h-4 w-4" />
              {copy.labels.openPreferences}
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[560px] rounded-lg" />
        </div>
      ) : (
        <>
          <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">{copy.labels.filters}</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
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

            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow className="border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
                  <TableHead
                    onClick={() => handleSortColumn('period')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.period}
                    <SortIndicator column="period" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('frequency')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.frequency}
                    <SortIndicator column="frequency" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('payrollType')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.payrollType}
                    <SortIndicator column="payrollType" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('employees')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.employees}
                    <SortIndicator column="employees" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('totalAmount')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.totalAmount}
                    <SortIndicator column="totalAmount" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('jurisdiction')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.jurisdiction}
                    <SortIndicator column="jurisdiction" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('unit')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.unit}
                    <SortIndicator column="unit" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('business')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.business}
                    <SortIndicator column="business" />
                  </TableHead>
                  <TableHead
                    onClick={() => handleSortColumn('status')}
                    className="cursor-pointer px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.labels.status}
                    <SortIndicator column="status" />
                  </TableHead>
                  <TableHead className="px-5 py-6 text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400">
                    ACTIONS
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
                  sortedRuns.map((run) => (
                    <TableRow key={run.id} className="border-slate-200 dark:border-slate-700">
                      <TableCell className="px-5 py-6 align-middle text-slate-700 dark:text-slate-200">
                        {formatDate(run.period_start_date, currentLanguage.code, run.period_start_date)} → {formatDate(run.period_end_date, currentLanguage.code, run.period_end_date)}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle text-slate-700 dark:text-slate-200">
                        {copy.frequencies[run.pay_period]}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle text-slate-700 dark:text-slate-200">
                        {copy.groupingModes[run.grouping_mode]}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle font-medium text-slate-900 dark:text-white">
                        {run.employees_count}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle font-medium text-slate-900 dark:text-white">
                        {run.net_amount.toLocaleString(currentLanguage.code, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle text-slate-700 dark:text-slate-200">
                        {resolveRunJurisdictionLabel(run)}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle text-slate-700 dark:text-slate-200">
                        {resolveRunUnitLabel(run)}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle text-slate-700 dark:text-slate-200">
                        {resolveRunBusinessLabel(run)}
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle">
                        <select
                          value={run.status}
                          onChange={(e) => handleStatusChange(run, e.target.value as PayrollRunSummary['status'])}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:border-slate-500"
                          disabled={isSaving}
                        >
                          <option value="draft">Review</option>
                          <option value="processed">Processed</option>
                          <option value="approved">Approved</option>
                          <option value="paid">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </TableCell>
                      <TableCell className="px-5 py-6 align-middle">
                        <div className="flex items-center gap-2">
                          <PayrollTableActionButton
                            icon={<Pencil className="h-4 w-4 text-amber-600" />}
                            label={copy.labels.edit}
                            onClick={() => void openEditRunModal(run)}
                            disabled={isSaving}
                            toneClassName="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                          />
                          <PayrollTableActionButton
                            icon={<PlayCircle className="h-4 w-4 text-blue-600" />}
                            label={copy.labels.process}
                            onClick={() => void handleProcessRunFromTable(run)}
                            disabled={isSaving || run.status !== 'draft'}
                            toneClassName="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-950/60"
                          />
                          <PayrollTableActionButton
                            icon={<Printer className="h-4 w-4 text-violet-600" />}
                            label={copy.labels.print}
                            onClick={() => void handleDownload('pdf', run)}
                            disabled={isSaving}
                            toneClassName="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-950/60"
                          />
                          <PayrollTableActionButton
                            icon={<Wallet className="h-4 w-4 text-emerald-600" />}
                            label={copy.labels.pay}
                            onClick={() => void handlePayRunFromTable(run)}
                            disabled={isSaving || run.status !== 'approved'}
                            toneClassName="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

      {isGenerateModalOpen ? (
        <PayrollGenerateModal
          isOpen={isGenerateModalOpen}
          isSaving={activeBusyKind === 'generate-runs'}
          employees={employees}
          initialPayPeriod={(filters.pay_period || 'weekly') as PayrollCreateRunsPayload['pay_period']}
          initialGroupingMode={(filters.grouping_mode || preferencesForm.grouping_mode) as PayrollCreateRunsPayload['grouping_mode']}
          initialPeriodRange={filters.period_range as 'this_month' | 'last_month' | 'two_months_ago' | 'all_year' | 'custom'}
          initialPeriodFrom={filters.period_from}
          initialPeriodTo={filters.period_to}
          copy={{
            title: copy.labels.generate,
            subtitle: copy.labels.controlPanel,
            generate: copy.labels.generate,
            cancel: copy.labels.cancel,
            employees: copy.labels.employees,
            period: copy.labels.period,
            frequency: copy.labels.frequency,
            groupingMode: copy.labels.groupingMode,
            periodFrom: copy.labels.periodFrom,
            periodTo: copy.labels.periodTo,
            periodThisMonth: copy.labels.periodThisMonth,
            periodLastMonth: copy.labels.periodLastMonth,
            periodTwoMonthsAgo: copy.labels.periodTwoMonthsAgo,
            periodAllYear: copy.labels.periodAllYear,
            periodCustom: copy.labels.periodCustom,
            noResults: currentLanguage.code.startsWith('es') ? 'No se encontraron colaboradores.' : 'No employees found.',
            attendanceControls: currentLanguage.code.startsWith('es') ? 'Controles de asistencia y ausencias' : 'Attendance and absence controls',
            earningsControls: currentLanguage.code.startsWith('es') ? 'Controles de percepciones y deducciones' : 'Earnings and deductions controls',
            daily: copy.labels.daily,
            weekly: copy.frequencies.weekly,
            biweekly: copy.frequencies.biweekly,
            monthly: copy.frequencies.monthly,
            single: copy.groupingModes.single,
            unit: copy.groupingModes.unit,
            business: copy.groupingModes.business,
          }}
          onClose={() => setIsGenerateModalOpen(false)}
          onGenerate={(draft) => void handleGenerateRuns(draft)}
        />
      ) : null}

      {isRateConfigDialogOpen ? (
        <PayrollRatesDialog
          copy={copy}
          isOpen={isRateConfigDialogOpen}
          isSaving={isSaving}
          selectedProfile={selectedRateProfile}
          values={activeRateValues}
          onClose={() => setIsRateConfigDialogOpen(false)}
          onSelectProfile={setSelectedRateProfile}
          onChangeValue={updateActiveRateValue}
          onSave={() => void handleSaveRates()}
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
  const isSpanish = locale.startsWith('es');
  const attendanceLabel = isSpanish ? 'Asistencia' : 'Attendance';
  const noRowsLabel = isSpanish ? 'No hay colaboradores para esta corrida.' : 'No employees available for this run.';
  const derivedJurisdiction = form.jurisdiction.trim() || jurisdictionLabel;
  const statusLabel = copy.statuses[form.status];
  const payrollTypeLabel = copy.groupingModes[run.grouping_mode];
  const frequencyLabel = copy.frequencies[run.pay_period];

  const runSummaryCards = [
    {
      key: 'period',
      label: copy.labels.period,
      value: `${formatDate(run.period_start_date, locale, run.period_start_date)} - ${formatDate(run.period_end_date, locale, run.period_end_date)}`,
    },
    {
      key: 'frequency',
      label: copy.labels.frequency,
      value: frequencyLabel,
    },
    {
      key: 'payrollType',
      label: copy.labels.payrollType,
      value: payrollTypeLabel,
    },
    {
      key: 'unit',
      label: copy.labels.unit,
      value: unitLabel,
    },
    {
      key: 'business',
      label: copy.labels.business,
      value: businessLabel,
    },
    {
      key: 'jurisdiction',
      label: copy.labels.jurisdiction,
      value: derivedJurisdiction,
    },
    {
      key: 'employees',
      label: copy.labels.employees,
      value: form.employeesCount,
    },
    {
      key: 'totalAmount',
      label: copy.labels.totalAmount,
      value: Number.isFinite(Number(form.netAmount))
        ? formatCurrency(Number(form.netAmount), locale)
        : form.netAmount,
    },
    {
      key: 'status',
      label: copy.labels.status,
      value: statusLabel,
    },
  ];

  const aggregateLineAmount = (
    line: PayrollRunLine,
    category: PayrollLineItem['category'],
  ) => line.items
    .filter((item) => item.category === category)
    .reduce((total, item) => total + item.amount, 0);

  const [payrollViewMode, setPayrollViewMode] = useState<'simplified' | 'detailed'>('simplified');

  const [sortColumn, setSortColumn] = useState<PayrollEditTableColumnKey>('employee');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<PayrollEditTableColumnKey, boolean>>({
    unit: true,
    business: true,
    employee: true,
    daysWorked: true,
    daysAbsent: true,
    overtime: true,
    vacationDays: true,
    paidHolidays: true,
    bonusesCommissions: true,
    loans: true,
    totalEarnings: true,
    totalDeductions: true,
    taxPayroll: true,
    netPay: true,
  });

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
  const roundMoney = (value: number) => Math.round(value * 100) / 100;
  const seedEarningBase = run.gross_amount > 0 ? run.gross_amount / seedRowsTarget : 920;
  const seedDeductionBase = run.deductions_amount > 0 ? run.deductions_amount / seedRowsTarget : seedEarningBase * 0.16;

  const seedRows: PayrollEditTableRow[] = Array.from({ length: seedRowsTarget }, (_, index) => {
    const earningVariance = 1 + (((index % 5) - 2) * 0.06);
    const deductionVariance = 1 + (((index % 4) - 1.5) * 0.05);
    const totalEarnings = roundMoney(seedEarningBase * earningVariance);
    const deductions = roundMoney(seedDeductionBase * deductionVariance);
    const bonusesCommissions = roundMoney(totalEarnings * 0.04);
    const loans = (index % 4 === 0) ? roundMoney(180 * earningVariance) : 0;
    return {
      id: `seed-${run.id}-${index + 1}`,
      unit: unitLabel,
      business: businessLabel,
      employee: seedNames[index % seedNames.length],
      daysWorked: 15 - ((run.id + index) % 3),
      daysAbsent: (run.id + index) % 4 === 0 ? 1 : 0,
      overtime: (run.id + index) % 3,
      vacationDays: (run.id + index) % 5 === 0 ? 1 : 0,
      paidHolidays: (run.id + index) % 6 === 0 ? 1 : 0,
      bonusesCommissions,
      loans,
      totalEarnings,
      totalDeductions: roundMoney(deductions + loans),
      taxPayroll: (run.id + index) % 3 !== 0,
      netPay: roundMoney(totalEarnings - deductions - loans),
    };
  });

  const detailRows: PayrollEditTableRow[] = runLines.map((line) => {
    const totalEarnings = aggregateLineAmount(line, 'earning');
    const deductions = aggregateLineAmount(line, 'deduction');
    const loanDeductions = line.items
      .filter((item) => item.category === 'deduction' && /loan|prestamo/i.test(`${item.code} ${item.label}`))
      .reduce((total, item) => total + item.amount, 0);
    const bonusesCommissions = line.items
      .filter((item) => item.category === 'earning' && /bonus|commission|bono|comision/i.test(`${item.code} ${item.label}`))
      .reduce((total, item) => total + item.amount, 0);
    return {
      id: line.id,
      unit: line.unit_name || unitLabel,
      business: line.business_name || businessLabel,
      employee: line.employee_name,
      daysWorked: line.days_payable,
      daysAbsent: line.absence_days,
      overtime: line.overtime_hours,
      vacationDays: line.leave_days,
      paidHolidays: Math.max(0, line.leave_days > 0 ? 1 : 0),
      bonusesCommissions,
      loans: loanDeductions,
      totalEarnings,
      totalDeductions: deductions,
      taxPayroll: line.include_in_fiscal,
      netPay: roundMoney(Math.max(0, line.net_amount || (totalEarnings - deductions))),
    };
  });

  const tableRows = detailRows.length > 0 ? detailRows : seedRows;
  const isUsingSeedRows = detailRows.length === 0;

  const [taxPayrollSelection, setTaxPayrollSelection] = useState<Record<string, boolean>>({});
  const [attendanceSelection, setAttendanceSelection] = useState<Record<string, Partial<Record<PayrollEditableAttendanceField, number>>>>({});

  const attendanceFieldMaxValues: Record<PayrollEditableAttendanceField, number> = {
    daysWorked: 31,
    daysAbsent: 31,
    overtime: 24,
    vacationDays: 31,
    paidHolidays: 31,
  };

  useEffect(() => {
    setTaxPayrollSelection((current) => {
      let hasChanges = false;
      const next = { ...current };
      tableRows.forEach((row) => {
        const rowId = String(row.id);
        if (next[rowId] === undefined) {
          next[rowId] = row.taxPayroll;
          hasChanges = true;
        }
      });
      return hasChanges ? next : current;
    });
  }, [tableRows]);

  useEffect(() => {
    setAttendanceSelection((current) => {
      let hasChanges = false;
      const next = { ...current };

      tableRows.forEach((row) => {
        const rowId = String(row.id);
        if (next[rowId] === undefined) {
          next[rowId] = {
            daysWorked: row.daysWorked,
            daysAbsent: row.daysAbsent,
            overtime: row.overtime,
            vacationDays: row.vacationDays,
            paidHolidays: row.paidHolidays,
          };
          hasChanges = true;
        }
      });

      return hasChanges ? next : current;
    });
  }, [tableRows]);

  const rowsWithTaxSelection = useMemo(
    () => tableRows.map((row) => ({
      ...row,
      taxPayroll: taxPayrollSelection[String(row.id)] ?? row.taxPayroll,
      daysWorked: attendanceSelection[String(row.id)]?.daysWorked ?? row.daysWorked,
      daysAbsent: attendanceSelection[String(row.id)]?.daysAbsent ?? row.daysAbsent,
      overtime: attendanceSelection[String(row.id)]?.overtime ?? row.overtime,
      vacationDays: attendanceSelection[String(row.id)]?.vacationDays ?? row.vacationDays,
      paidHolidays: attendanceSelection[String(row.id)]?.paidHolidays ?? row.paidHolidays,
    })),
    [tableRows, taxPayrollSelection, attendanceSelection],
  );

  const updateAttendanceField = (
    rowId: string,
    field: PayrollEditableAttendanceField,
    value: number,
  ) => {
    setAttendanceSelection((current) => ({
      ...current,
      [rowId]: {
        ...current[rowId],
        [field]: value,
      },
    }));
  };

  // ── Detailed view state ──────────────────────────────────────────────────
  const [detailedSortColumn, setDetailedSortColumn] = useState<PayrollDetailedColumnKey>('employee');
  const [detailedSortDirection, setDetailedSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isDetailedColumnsMenuOpen, setIsDetailedColumnsMenuOpen] = useState(false);
  const [detailedAttendanceSelection, setDetailedAttendanceSelection] = useState<Record<string, Partial<Record<PayrollEditableAttendanceField, number>>>>({});
  const allDetailedColumnsVisible: Record<PayrollDetailedColumnKey, boolean> = {
    employee: true, rfc: true, curp: true, nss: true, unit: true, business: true,
    daysWorked: true, daysAbsent: true, overtime: true, vacationDays: true, paidHolidays: true, totalPay: true,
    dailyWage: true, baseWage: true, integratedDailyWage: true, baseContributionSalary: true,
    periodSalary: true, overtimeAmount: true, bonusesCommissions: true, vacationBonus: true,
    proportionalChristmasBonus: true, totalEarnings: true,
    incomeTaxWithheld: true, imssEmployee: true, infonavitType: true, infonavitDiscount: true,
    loans: true, otherDiscounts: true, totalDeductions: true, netPay: true,
  };
  const [visibleDetailedColumns, setVisibleDetailedColumns] = useState<Record<PayrollDetailedColumnKey, boolean>>(allDetailedColumnsVisible);

  const seedRfcPrefixes = ['AAAB', 'BBBC', 'CCCD', 'DDDE', 'EEEF', 'FFFG', 'GGGX', 'HHHZ', 'IIIY', 'JJJW'];
  const seedInfonTypes = ['Fixed Amount', 'Percentage', 'VSM', 'Fixed Amount', 'Percentage', 'VSM', 'Fixed Amount', 'Percentage', 'VSM', 'Fixed Amount'];

  const detailedSeedRows: PayrollDetailedRow[] = Array.from({ length: seedRowsTarget }, (_, index) => {
    const earningVariance = 1 + (((index % 5) - 2) * 0.06);
    const deductionVariance = 1 + (((index % 4) - 1.5) * 0.05);
    const baseWage = roundMoney(seedEarningBase * earningVariance * 0.82);
    const dailyWage = roundMoney(baseWage / 30);
    const integratedDailyWage = roundMoney(dailyWage * 1.0452);
    const baseContribution = roundMoney(integratedDailyWage * 30);
    const periodSalary = roundMoney(baseWage / 2);
    const overtimeAmt = roundMoney(dailyWage * 0.5 * ((index % 3) + 1));
    const bonuses = roundMoney(seedEarningBase * 0.04 * earningVariance);
    const vacationBonus = roundMoney(periodSalary * 0.015);
    const christmasBonus = roundMoney(periodSalary * 0.01);
    const totalEarnings = roundMoney(periodSalary + overtimeAmt + bonuses + vacationBonus + christmasBonus);
    const isr = roundMoney(totalEarnings * 0.07 * deductionVariance);
    const imss = roundMoney(totalEarnings * 0.02 * deductionVariance);
    const infonavitDiscount = roundMoney(baseContribution * 0.01);
    const loans = (index % 4 === 0) ? roundMoney(200 * earningVariance) : 0;
    const otherDiscounts = (index % 5 === 0) ? roundMoney(50 * earningVariance) : 0;
    const totalDeductions = roundMoney(isr + imss + infonavitDiscount + loans + otherDiscounts);
    return {
      id: `seed-d-${run.id}-${index + 1}`,
      employee: seedNames[index % seedNames.length],
      rfc: `${seedRfcPrefixes[index % seedRfcPrefixes.length]}${String(800000 + run.id * 10 + index).padStart(6, '0')}`,
      curp: `CURP${String(index + 1).padStart(14, '0')}`,
      nss: String(10000000000 + run.id * 100 + index).padStart(11, '0'),
      unit: unitLabel,
      business: businessLabel,
      daysWorked: 15 - ((run.id + index) % 3),
      daysAbsent: (run.id + index) % 4 === 0 ? 1 : 0,
      overtime: (index % 3) + 1,
      vacationDays: (run.id + index) % 5 === 0 ? 1 : 0,
      paidHolidays: (run.id + index) % 6 === 0 ? 1 : 0,
      totalPay: roundMoney(totalEarnings - totalDeductions),
      dailyWage,
      baseWage,
      integratedDailyWage,
      baseContributionSalary: baseContribution,
      periodSalary,
      overtimeAmount: overtimeAmt,
      bonusesCommissions: bonuses,
      vacationBonus,
      proportionalChristmasBonus: christmasBonus,
      totalEarnings,
      incomeTaxWithheld: isr,
      imssEmployee: imss,
      infonavitType: seedInfonTypes[index % seedInfonTypes.length],
      infonavitDiscount,
      loans,
      otherDiscounts,
      totalDeductions,
      netPay: roundMoney(totalEarnings - totalDeductions),
    };
  });

  const detailedDetailRows: PayrollDetailedRow[] = runLines.map((line, index) => {
    const earnings = aggregateLineAmount(line, 'earning');
    const deductions = aggregateLineAmount(line, 'deduction');
    const dailyWage = line.hourly_rate_amount > 0 ? roundMoney(line.hourly_rate_amount * 8) : roundMoney(line.base_salary_amount / 30);
    const integratedDailyWage = roundMoney(dailyWage * 1.0452);
    const baseContribution = roundMoney(integratedDailyWage * 30);
    const isr = line.items.find((item) => item.code === 'ISR')?.amount ?? roundMoney(earnings * 0.07);
    const imss = line.items.find((item) => item.code === 'IMSS_EMP')?.amount ?? roundMoney(earnings * 0.02);
    const infonavitDiscount = line.items.find((item) => item.code === 'INFONAVIT')?.amount ?? 0;
    return {
      id: line.id,
      employee: line.employee_name,
      rfc: `RFC${String(index + 1).padStart(13, '0')}`,
      curp: `CURP${String(index + 1).padStart(14, '0')}`,
      nss: String(10000000000 + index).padStart(11, '0'),
      unit: line.unit_name || unitLabel,
      business: line.business_name || businessLabel,
      daysWorked: line.days_payable,
      daysAbsent: line.absence_days,
      overtime: line.overtime_hours,
      vacationDays: line.leave_days,
      paidHolidays: Math.max(0, line.leave_days > 0 ? 1 : 0),
      totalPay: line.net_amount,
      dailyWage,
      baseWage: line.base_salary_amount,
      integratedDailyWage,
      baseContributionSalary: baseContribution,
      periodSalary: roundMoney(line.base_salary_amount / 2),
      overtimeAmount: roundMoney(line.overtime_hours * dailyWage * 2),
      bonusesCommissions: 0,
      vacationBonus: 0,
      proportionalChristmasBonus: 0,
      totalEarnings: earnings,
      incomeTaxWithheld: isr,
      imssEmployee: imss,
      infonavitType: 'Fixed Amount',
      infonavitDiscount,
      loans: 0,
      otherDiscounts: roundMoney(deductions - isr - imss - infonavitDiscount),
      totalDeductions: deductions,
      netPay: line.net_amount,
    };
  });

  const detailedTableRows = detailedDetailRows.length > 0 ? detailedDetailRows : detailedSeedRows;

  useEffect(() => {
    setDetailedAttendanceSelection((current) => {
      let hasChanges = false;
      const next = { ...current };

      detailedTableRows.forEach((row) => {
        const rowId = String(row.id);
        if (next[rowId] === undefined) {
          next[rowId] = {
            daysWorked: row.daysWorked,
            daysAbsent: row.daysAbsent,
            overtime: row.overtime,
            vacationDays: row.vacationDays,
            paidHolidays: row.paidHolidays,
          };
          hasChanges = true;
        }
      });

      return hasChanges ? next : current;
    });
  }, [detailedTableRows]);

  const detailedRowsWithAttendance = useMemo(
    () => detailedTableRows.map((row) => ({
      ...row,
      daysWorked: detailedAttendanceSelection[String(row.id)]?.daysWorked ?? row.daysWorked,
      daysAbsent: detailedAttendanceSelection[String(row.id)]?.daysAbsent ?? row.daysAbsent,
      overtime: detailedAttendanceSelection[String(row.id)]?.overtime ?? row.overtime,
      vacationDays: detailedAttendanceSelection[String(row.id)]?.vacationDays ?? row.vacationDays,
      paidHolidays: detailedAttendanceSelection[String(row.id)]?.paidHolidays ?? row.paidHolidays,
    })),
    [detailedTableRows, detailedAttendanceSelection],
  );

  const detailedColumns: Array<{ key: PayrollDetailedColumnKey; label: string }> = [
    { key: 'employee', label: copy.labels.employee },
    { key: 'rfc', label: copy.labels.rfc },
    { key: 'curp', label: copy.labels.curp },
    { key: 'nss', label: copy.labels.nss },
    { key: 'unit', label: copy.labels.unit },
    { key: 'business', label: copy.labels.business },
    { key: 'daysWorked', label: copy.labels.daysWorked },
    { key: 'daysAbsent', label: copy.labels.daysAbsent },
    { key: 'overtime', label: copy.labels.overtime },
    { key: 'vacationDays', label: copy.labels.vacationDays },
    { key: 'paidHolidays', label: copy.labels.paidHolidays },
    { key: 'totalPay', label: copy.labels.totalPay },
    { key: 'dailyWage', label: copy.labels.dailyWage },
    { key: 'baseWage', label: copy.labels.baseWage },
    { key: 'integratedDailyWage', label: copy.labels.integratedDailyWage },
    { key: 'baseContributionSalary', label: copy.labels.baseContributionSalary },
    { key: 'periodSalary', label: copy.labels.periodSalary },
    { key: 'overtimeAmount', label: copy.labels.overtimeAmount },
    { key: 'bonusesCommissions', label: copy.labels.bonusesCommissions },
    { key: 'vacationBonus', label: copy.labels.vacationBonus },
    { key: 'proportionalChristmasBonus', label: copy.labels.proportionalChristmasBonus },
    { key: 'totalEarnings', label: copy.labels.totalEarnings },
    { key: 'incomeTaxWithheld', label: copy.labels.incomeTaxWithheld },
    { key: 'imssEmployee', label: copy.labels.imssEmployee },
    { key: 'infonavitType', label: copy.labels.infonavitType },
    { key: 'infonavitDiscount', label: copy.labels.infonavitDiscount },
    { key: 'loans', label: copy.labels.loans },
    { key: 'otherDiscounts', label: copy.labels.otherDiscounts },
    { key: 'totalDeductions', label: copy.labels.totalDeductions },
    { key: 'netPay', label: copy.labels.netPay },
  ];

  const sortedDetailedRows = useMemo(() => {
    const rows = [...detailedRowsWithAttendance];
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
  }, [detailedRowsWithAttendance, detailedSortColumn, detailedSortDirection]);

  const toggleDetailedSort = (column: PayrollDetailedColumnKey) => {
    if (detailedSortColumn === column) {
      setDetailedSortDirection((cur) => (cur === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setDetailedSortColumn(column);
    setDetailedSortDirection('asc');
  };

  const columns: Array<{ key: PayrollEditTableColumnKey; label: string }> = [
    { key: 'unit', label: copy.labels.unit },
    { key: 'business', label: copy.labels.business },
    { key: 'employee', label: copy.labels.employee },
    { key: 'daysWorked', label: copy.labels.daysWorked },
    { key: 'daysAbsent', label: copy.labels.daysAbsent },
    { key: 'overtime', label: copy.labels.overtime },
    { key: 'vacationDays', label: copy.labels.vacationDays },
    { key: 'paidHolidays', label: copy.labels.paidHolidays },
    { key: 'bonusesCommissions', label: copy.labels.bonusesCommissions },
    { key: 'loans', label: copy.labels.loans },
    { key: 'totalEarnings', label: copy.labels.totalEarnings },
    { key: 'totalDeductions', label: copy.labels.totalDeductions },
    { key: 'netPay', label: copy.labels.netPay },
    { key: 'taxPayroll', label: copy.labels.taxPayroll },
  ];

  const formatAmount = (value: number) => value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const detailedVisibleColumns = detailedColumns.filter((column) => visibleDetailedColumns[column.key]);

  const sortedRows = useMemo(() => {
    const rows = [...rowsWithTaxSelection];
    rows.sort((left, right) => {
      const leftValue = left[sortColumn];
      const rightValue = right[sortColumn];

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') {
        return sortDirection === 'asc'
          ? Number(leftValue) - Number(rightValue)
          : Number(rightValue) - Number(leftValue);
      }

      return sortDirection === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
    return rows;
  }, [rowsWithTaxSelection, sortColumn, sortDirection]);

  const simplifiedVisibleColumns = columns.filter((column) => visibleColumns[column.key]);
  const totalNetPay = sortedRows.reduce((sum, row) => sum + row.netPay, 0);
  const totalDetailedNetPay = sortedDetailedRows.reduce((sum, row) => sum + row.netPay, 0);

  const renderAttendanceSelect = (
    rowId: string,
    field: PayrollEditableAttendanceField,
    value: number,
  ) => (
    <select
      value={value}
      onChange={(event) => updateAttendanceField(rowId, field, Number(event.target.value))}
      disabled={isSaving}
      className="h-8 w-full min-w-[84px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-[#143675] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      aria-label={field}
    >
      {Array.from({ length: attendanceFieldMaxValues[field] + 1 }, (_, option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );

  const updateDetailedAttendanceField = (
    rowId: string,
    field: PayrollEditableAttendanceField,
    value: number,
  ) => {
    setDetailedAttendanceSelection((current) => ({
      ...current,
      [rowId]: {
        ...current[rowId],
        [field]: value,
      },
    }));
  };

  const renderDetailedAttendanceSelect = (
    rowId: string,
    field: PayrollEditableAttendanceField,
    value: number,
  ) => (
    <select
      value={value}
      onChange={(event) => updateDetailedAttendanceField(rowId, field, Number(event.target.value))}
      disabled={isSaving}
      className="h-8 w-full min-w-[78px] rounded-md border border-slate-200 bg-white px-2 text-center text-sm text-slate-800 outline-none focus:border-[#143675] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      aria-label={field}
    >
      {Array.from({ length: attendanceFieldMaxValues[field] + 1 }, (_, option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );

  const toggleSort = (column: PayrollEditTableColumnKey) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumn(column);
    setSortDirection('asc');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 z-[85] flex h-screen !w-screen max-h-none !max-w-none sm:!max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none dark:bg-slate-900 [&>button]:hidden">
        <header className="border-b border-white/20 bg-[#143675] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {copy.labels.edit} #{run.id} · {derivedJurisdiction}
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
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-[#143675] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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

            <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50">
              <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {copy.labels.employees} · {attendanceLabel} · {copy.labels.gross} / {copy.labels.deductions}
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {/* View mode toggle */}
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setPayrollViewMode('simplified')}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${payrollViewMode === 'simplified'
                        ? 'bg-[#143675] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                      {copy.labels.simplifiedPayroll}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayrollViewMode('detailed')}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${payrollViewMode === 'detailed'
                        ? 'bg-[#143675] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                      {copy.labels.detailedPayroll}
                    </button>
                  </div>

                </div>

                {/* Simplified columns dropdown */}
                {isColumnsMenuOpen ? (
                  <div className="absolute right-4 top-12 z-20 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {copy.labels.columns}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {columns.map((column) => (
                        <label key={column.key} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            checked={visibleColumns[column.key]}
                            onChange={(event) => {
                              setVisibleColumns((current) => ({
                                ...current,
                                [column.key]: event.target.checked,
                              }));
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#143675] focus:ring-[#143675]"
                          />
                          <span>{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Detailed columns dropdown */}
                {isDetailedColumnsMenuOpen ? (
                  <div className="absolute right-4 top-12 z-20 max-h-[320px] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {copy.labels.columns}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {detailedColumns.map((column) => (
                        <label key={column.key} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            checked={visibleDetailedColumns[column.key]}
                            onChange={(event) => {
                              setVisibleDetailedColumns((current) => ({
                                ...current,
                                [column.key]: event.target.checked,
                              }));
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#143675] focus:ring-[#143675]"
                          />
                          <span>{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {isDetailLoading ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  <LoaderCircle className="mx-auto mb-3 h-5 w-5 animate-spin" />
                  {copy.loading}
                </div>
              ) : payrollViewMode === 'simplified' ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[1240px]">
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/70">
                        {simplifiedVisibleColumns.map((column) => (
                          <TableHead key={column.key} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                      {sortedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={simplifiedVisibleColumns.length || 1} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            {noRowsLabel}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {sortedRows.map((row) => (
                            <TableRow key={row.id} className="border-slate-200 dark:border-slate-700">
                              {visibleColumns.unit ? <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{row.unit}</TableCell> : null}
                              {visibleColumns.business ? <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{row.business}</TableCell> : null}
                              {visibleColumns.employee ? <TableCell className="px-4 py-3 align-top font-medium text-slate-900 dark:text-white">{row.employee}</TableCell> : null}
                              {visibleColumns.daysWorked ? <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{renderAttendanceSelect(String(row.id), 'daysWorked', row.daysWorked)}</TableCell> : null}
                              {visibleColumns.daysAbsent ? <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{renderAttendanceSelect(String(row.id), 'daysAbsent', row.daysAbsent)}</TableCell> : null}
                              {visibleColumns.overtime ? <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{renderAttendanceSelect(String(row.id), 'overtime', row.overtime)}</TableCell> : null}
                              {visibleColumns.vacationDays ? <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{renderAttendanceSelect(String(row.id), 'vacationDays', row.vacationDays)}</TableCell> : null}
                              {visibleColumns.paidHolidays ? <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">{renderAttendanceSelect(String(row.id), 'paidHolidays', row.paidHolidays)}</TableCell> : null}
                              {visibleColumns.bonusesCommissions ? <TableCell className="px-4 py-3 align-top font-medium text-emerald-700 dark:text-emerald-300">{formatAmount(row.bonusesCommissions)}</TableCell> : null}
                              {visibleColumns.loans ? <TableCell className="px-4 py-3 align-top font-medium text-rose-700 dark:text-rose-300">{formatAmount(row.loans)}</TableCell> : null}
                              {visibleColumns.totalEarnings ? <TableCell className="px-4 py-3 align-top font-medium text-emerald-700 dark:text-emerald-300">{formatAmount(row.totalEarnings)}</TableCell> : null}
                              {visibleColumns.totalDeductions ? <TableCell className="px-4 py-3 align-top font-medium text-rose-700 dark:text-rose-300">{formatAmount(row.totalDeductions)}</TableCell> : null}
                              {visibleColumns.netPay ? <TableCell className="px-4 py-3 align-top font-semibold text-slate-900 dark:text-slate-100">{formatAmount(row.netPay)}</TableCell> : null}
                              {visibleColumns.taxPayroll ? (
                                <TableCell className="px-4 py-3 align-top text-slate-700 dark:text-slate-200">
                                  <input
                                    type="checkbox"
                                    checked={row.taxPayroll}
                                    onChange={(event) => {
                                      const rowId = String(row.id);
                                      setTaxPayrollSelection((current) => ({
                                        ...current,
                                        [rowId]: event.target.checked,
                                      }));
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-[#143675] focus:ring-[#143675]"
                                    aria-label={copy.labels.taxPayroll}
                                  />
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}

                          {visibleColumns.netPay ? (
                            <TableRow className="border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70">
                              {simplifiedVisibleColumns.map((column, index) => {
                                if (column.key === 'netPay') {
                                  return (
                                    <TableCell key={column.key} className="px-4 py-3 align-top font-bold text-[#143675] dark:text-blue-300">
                                      {formatAmount(totalNetPay)}
                                    </TableCell>
                                  );
                                }

                                if (index === 0) {
                                  return (
                                    <TableCell key={column.key} className="px-4 py-3 align-top text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                      {isSpanish ? 'Total' : 'Total'}
                                    </TableCell>
                                  );
                                }

                                return <TableCell key={column.key} className="px-4 py-3 align-top" />;
                              })}
                            </TableRow>
                          ) : null}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* ── Detailed Payroll Table ─────────────────────────────────── */
                <div className="overflow-x-auto">
                  <Table className="min-w-[3200px]">
                    <TableHeader>
                      <TableRow className="border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/70">
                        {detailedVisibleColumns.map((col) => (
                          <TableHead key={col.key} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleDetailedSort(col.key)}
                              className="inline-flex items-center gap-1 text-left"
                            >
                              <span>{col.label}</span>
                              {detailedSortColumn === col.key ? (
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
                          <TableCell colSpan={detailedVisibleColumns.length || 1} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            {noRowsLabel}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {sortedDetailedRows.map((row) => (
                            <TableRow key={row.id} className="border-slate-200 dark:border-slate-700">
                              {visibleDetailedColumns.employee ? <TableCell className="px-3 py-3 align-top font-medium text-slate-900 whitespace-nowrap dark:text-white">{row.employee}</TableCell> : null}
                              {visibleDetailedColumns.rfc ? <TableCell className="px-3 py-3 align-top font-mono text-xs text-slate-700 whitespace-nowrap dark:text-slate-200">{row.rfc}</TableCell> : null}
                              {visibleDetailedColumns.curp ? <TableCell className="px-3 py-3 align-top font-mono text-xs text-slate-700 whitespace-nowrap dark:text-slate-200">{row.curp}</TableCell> : null}
                              {visibleDetailedColumns.nss ? <TableCell className="px-3 py-3 align-top font-mono text-xs text-slate-700 whitespace-nowrap dark:text-slate-200">{row.nss}</TableCell> : null}
                              {visibleDetailedColumns.unit ? <TableCell className="px-3 py-3 align-top text-slate-700 whitespace-nowrap dark:text-slate-200">{row.unit}</TableCell> : null}
                              {visibleDetailedColumns.business ? <TableCell className="px-3 py-3 align-top text-slate-700 whitespace-nowrap dark:text-slate-200">{row.business}</TableCell> : null}
                              {visibleDetailedColumns.daysWorked ? <TableCell className="px-3 py-3 align-top text-center text-slate-700 dark:text-slate-200">{renderDetailedAttendanceSelect(String(row.id), 'daysWorked', row.daysWorked)}</TableCell> : null}
                              {visibleDetailedColumns.daysAbsent ? <TableCell className="px-3 py-3 align-top text-center text-slate-700 dark:text-slate-200">{renderDetailedAttendanceSelect(String(row.id), 'daysAbsent', row.daysAbsent)}</TableCell> : null}
                              {visibleDetailedColumns.overtime ? <TableCell className="px-3 py-3 align-top text-center text-slate-700 dark:text-slate-200">{renderDetailedAttendanceSelect(String(row.id), 'overtime', row.overtime)}</TableCell> : null}
                              {visibleDetailedColumns.vacationDays ? <TableCell className="px-3 py-3 align-top text-center text-slate-700 dark:text-slate-200">{renderDetailedAttendanceSelect(String(row.id), 'vacationDays', row.vacationDays)}</TableCell> : null}
                              {visibleDetailedColumns.paidHolidays ? <TableCell className="px-3 py-3 align-top text-center text-slate-700 dark:text-slate-200">{renderDetailedAttendanceSelect(String(row.id), 'paidHolidays', row.paidHolidays)}</TableCell> : null}
                              {visibleDetailedColumns.totalPay ? <TableCell className="px-3 py-3 align-top text-right font-semibold text-slate-900 dark:text-slate-100">{formatAmount(row.totalPay)}</TableCell> : null}
                              {visibleDetailedColumns.dailyWage ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.dailyWage)}</TableCell> : null}
                              {visibleDetailedColumns.baseWage ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.baseWage)}</TableCell> : null}
                              {visibleDetailedColumns.integratedDailyWage ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.integratedDailyWage)}</TableCell> : null}
                              {visibleDetailedColumns.baseContributionSalary ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.baseContributionSalary)}</TableCell> : null}
                              {visibleDetailedColumns.periodSalary ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.periodSalary)}</TableCell> : null}
                              {visibleDetailedColumns.overtimeAmount ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.overtimeAmount)}</TableCell> : null}
                              {visibleDetailedColumns.bonusesCommissions ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.bonusesCommissions)}</TableCell> : null}
                              {visibleDetailedColumns.vacationBonus ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.vacationBonus)}</TableCell> : null}
                              {visibleDetailedColumns.proportionalChristmasBonus ? <TableCell className="px-3 py-3 align-top text-right text-slate-700 dark:text-slate-200">{formatAmount(row.proportionalChristmasBonus)}</TableCell> : null}
                              {visibleDetailedColumns.totalEarnings ? <TableCell className="px-3 py-3 align-top text-right font-medium text-emerald-700 dark:text-emerald-300">{formatAmount(row.totalEarnings)}</TableCell> : null}
                              {visibleDetailedColumns.incomeTaxWithheld ? <TableCell className="px-3 py-3 align-top text-right text-rose-700 dark:text-rose-300">{formatAmount(row.incomeTaxWithheld)}</TableCell> : null}
                              {visibleDetailedColumns.imssEmployee ? <TableCell className="px-3 py-3 align-top text-right text-rose-700 dark:text-rose-300">{formatAmount(row.imssEmployee)}</TableCell> : null}
                              {visibleDetailedColumns.infonavitType ? <TableCell className="px-3 py-3 align-top text-slate-700 whitespace-nowrap dark:text-slate-200">{row.infonavitType}</TableCell> : null}
                              {visibleDetailedColumns.infonavitDiscount ? <TableCell className="px-3 py-3 align-top text-right text-rose-700 dark:text-rose-300">{formatAmount(row.infonavitDiscount)}</TableCell> : null}
                              {visibleDetailedColumns.loans ? <TableCell className="px-3 py-3 align-top text-right text-rose-700 dark:text-rose-300">{formatAmount(row.loans)}</TableCell> : null}
                              {visibleDetailedColumns.otherDiscounts ? <TableCell className="px-3 py-3 align-top text-right text-rose-700 dark:text-rose-300">{formatAmount(row.otherDiscounts)}</TableCell> : null}
                              {visibleDetailedColumns.totalDeductions ? <TableCell className="px-3 py-3 align-top text-right font-medium text-rose-700 dark:text-rose-300">{formatAmount(row.totalDeductions)}</TableCell> : null}
                              {visibleDetailedColumns.netPay ? <TableCell className="px-3 py-3 align-top text-right font-semibold text-[#143675] dark:text-blue-300">{formatAmount(row.netPay)}</TableCell> : null}
                            </TableRow>
                          ))}

                          {visibleDetailedColumns.netPay ? (
                            <TableRow className="border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70">
                              {detailedVisibleColumns.map((column, index) => {
                                if (column.key === 'netPay') {
                                  return (
                                    <TableCell key={column.key} className="px-3 py-3 align-top text-right font-bold text-[#143675] dark:text-blue-300">
                                      {formatAmount(totalDetailedNetPay)}
                                    </TableCell>
                                  );
                                }

                                if (index === 0) {
                                  return (
                                    <TableCell key={column.key} className="px-3 py-3 align-top text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                      Total
                                    </TableCell>
                                  );
                                }

                                return <TableCell key={column.key} className="px-3 py-3 align-top" />;
                              })}
                            </TableRow>
                          ) : null}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
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
            onClick={onPrint}
            disabled={isSaving}
            className="gap-2 rounded-xl"
          >
            <Printer className="h-4 w-4" />
            {copy.labels.print}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 rounded-xl bg-[#143675] text-white hover:bg-[#0f2855]"
          >
            <Save className="h-4 w-4" />
            {copy.labels.save}
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
  const groupingOptions = [
    {
      key: 'single',
      title: copy.groupingCards.single.title,
      description: copy.groupingCards.single.description,
      highlighted: true,
    },
    {
      key: 'unit',
      title: copy.groupingCards.unit.title,
      description: copy.groupingCards.unit.description,
      highlighted: false,
    },
    {
      key: 'business',
      title: copy.groupingCards.business.title,
      description: copy.groupingCards.business.description,
      highlighted: false,
    },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="!flex h-[min(88vh,920px)] max-h-[calc(100vh-3rem)] max-w-[920px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="shrink-0 bg-[#143675] px-5 py-3 sm:px-6 sm:py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 pr-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-[1.2rem] font-bold leading-tight text-white sm:text-[1.45rem]">
                  {copy.labels.preferences}
                </DialogTitle>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/10 text-white shadow-sm transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-900/60">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-5">
              <section className="rounded-[24px] border border-[#143675]/20 bg-[#143675]/5 p-5 dark:border-[#143675]/30 dark:bg-[#143675]/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#143675] shadow-sm dark:bg-slate-800 dark:text-[#8fb2ff]">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogDescription className="text-xl font-semibold leading-snug text-[#143675] dark:text-[#8fb2ff]">
                      {copy.preferencesInfo.title}
                    </DialogDescription>
                    <div className="mt-4 space-y-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                      {copy.preferencesInfo.bullets.map((bullet) => (
                        <p key={bullet}>• {bullet}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <h3 className="text-[1.15rem] font-bold text-slate-900 dark:text-white">
                    {copy.preferencesInfo.selectionTitle}
                  </h3>
                </div>
                <div className="space-y-4">
                  {groupingOptions.map((option) => {
                    const isSelected = form.grouping_mode === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => onChange({ ...form, grouping_mode: option.key as PayrollPreferences['grouping_mode'] })}
                        className={`w-full rounded-[24px] border px-5 py-5 text-left transition-all ${isSelected
                          ? 'border-[#143675] bg-[#143675]/5 shadow-sm ring-2 ring-[#143675]/10 dark:bg-[#143675]/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800'
                          }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="max-w-3xl">
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">
                                {option.title}
                              </h4>
                              {option.highlighted ? (
                                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-[#143675] dark:bg-slate-700 dark:text-slate-100">
                                  {copy.labels.recommended}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-lg leading-8 text-slate-600 dark:text-slate-300">
                              {option.description}
                            </p>
                          </div>
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${isSelected
                            ? 'border-[#143675] bg-white text-[#143675] dark:bg-slate-900'
                            : 'border-slate-300 bg-white text-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-600'
                            }`}>
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {copy.labels.operationalSettings}
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {copy.labels.defaultDailyHours}
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.25"
                      value={form.default_daily_hours}
                      onChange={(event) => onChange({ ...form, default_daily_hours: Number(event.target.value) })}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.pay_leave_days}
                        onChange={(event) => onChange({ ...form, pay_leave_days: event.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-[#143675] focus:ring-[#143675]"
                      />
                      {copy.labels.payLeaveDays}
                    </label>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-3">
                  <div className="text-xl">💡</div>
                  <p className="text-base leading-8 text-slate-600 dark:text-slate-300">
                    {copy.preferencesInfo.note}
                  </p>
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
                className="h-11 gap-2 rounded-2xl bg-[#143675] px-5 text-base font-semibold text-white hover:bg-[#0f2855]"
              >
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                {copy.labels.savePreferences}
              </Button>
            </div>
          </div>
        </div>
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

  const isSpanish = copy.labels.cancel === 'Cancelar';
  const isCustomProfile = selectedProfile === 'custom';
  const isAdvancedMode = editorMode === 'advanced';
  const activeProfileName = copy.rateConfiguration.profiles[selectedProfile];
  const activeProfileFlag = payrollRateProfileFlags[selectedProfile];
  const headerTitle = `${copy.rateConfiguration.title} — ${activeProfileName}`;
  const infoBlockText = copy.rateConfiguration.infoBlocks[selectedProfile];

  const summaryStatus = isCustomProfile
    ? (isSpanish ? 'Perfil personalizado' : 'Custom profile')
    : isAdvancedMode
      ? (isSpanish ? 'Ajustado por la empresa' : 'Company adjusted')
      : (isSpanish ? 'Predeterminado oficial' : 'Official preset');

  const summaryTone: 'success' | 'warning' | 'info' = isCustomProfile
    ? 'warning'
    : isAdvancedMode
      ? 'info'
      : 'success';

  const iconByField: Record<PayrollRateFieldKey, typeof Wallet> = {
    isr_rate: Wallet,
    imss_employee_rate: ShieldCheck,
    infonavit_employee_rate: CreditCard,
    imss_employer_rate: ShieldCheck,
    infonavit_employer_rate: CreditCard,
    sar_employer_rate: Landmark,
  };

  const automaticFields: PayrollRateFieldKey[] = ['isr_rate', 'imss_employee_rate', 'imss_employer_rate'];
  const fixedByLawFields: PayrollRateFieldKey[] = ['infonavit_employer_rate'];
  const adjustableFields: PayrollRateFieldKey[] = ['infonavit_employee_rate', 'sar_employer_rate'];

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
          className="h-11 w-full rounded-xl border border-amber-200 bg-white pl-3 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#143675] dark:border-amber-700/40 dark:bg-slate-800 dark:text-slate-100"
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
      info: 'border-[#143675]/20 bg-[#143675]/10 text-[#143675] dark:border-[#143675]/30 dark:bg-[#143675]/20 dark:text-[#9fbeff]',
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
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-[#143675] transition hover:border-[#143675]/30 hover:bg-[#143675]/5 dark:border-slate-600 dark:text-[#9fbeff] dark:hover:bg-[#143675]/15"
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
    const notConfiguredLabel = isSpanish ? 'No configurado' : 'Not configured';

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
            {renderStatusBadge(isSpanish ? 'Ajustable' : 'Adjustable', 'warning')}
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

  const mexicoOverviewText = isSpanish
    ? 'ISR: se calcula usando tablas fiscales oficiales. IMSS: se aplica automáticamente. INFONAVIT: depende de las condiciones del colaborador. SAR: es fijo por ley.'
    : 'Income tax (ISR): calculated using official tax tables. Social security (IMSS): automatically applied. Housing (INFONAVIT): depends on employee conditions. Retirement (SAR): fixed by law.';

  const automaticDescription = isSpanish
    ? 'Este componente es calculado automáticamente por el sistema según reglas oficiales.'
    : 'This component is calculated automatically by the system based on official rules.';
  const fixedDescription = isSpanish
    ? 'Este componente tiene una contribución fija definida por ley.'
    : 'This component has a fixed contribution defined by law.';
  const adjustableDescription = isSpanish
    ? 'Este componente puede ser ajustado por la empresa cuando aplique.'
    : 'This component can be adjusted by the company when needed.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="!flex h-[min(88vh,940px)] max-h-[calc(100vh-3rem)] max-w-[980px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800 [&>button]:hidden">
        <div className="shrink-0 bg-[#143675] px-5 py-3 sm:px-6 sm:py-3.5">
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
                      {isSpanish
                        ? 'Entiende cómo se calcula la nómina en este país. La mayoría de los valores se aplican automáticamente con base en reglas oficiales.'
                        : 'Understand how payroll is calculated in this country. Most values are automatically applied based on official rules.'}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <select
                      value={selectedProfile}
                      onChange={(event) => onSelectProfile(event.target.value as PayrollRateProfileKey)}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#143675] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
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
                        onClick={() => setEditorMode('preset')}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${!isAdvancedMode
                          ? 'bg-white text-[#143675] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                          }`}
                      >
                        {isSpanish ? 'Resumen' : 'Overview'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode('advanced')}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${isAdvancedMode
                          ? 'bg-white text-[#143675] shadow-sm dark:bg-slate-800 dark:text-slate-100'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white'
                          }`}
                      >
                        {copy.rateConfiguration.modeLabels.advanced}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#143675]/12 bg-[#143675]/5 p-5 shadow-sm dark:border-[#143675]/30 dark:bg-[#143675]/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#143675] shadow-sm dark:bg-slate-800 dark:text-[#9fbeff]">
                    <Info className="h-5 w-5" />
                  </div>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {selectedProfile === 'mexico' ? mexicoOverviewText : infoBlockText}
                  </p>
                </div>
              </section>

              {isAdvancedMode ? (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                  {isSpanish
                    ? 'Los cambios en modo Avanzado pueden sobrescribir reglas estándar de nómina.'
                    : 'Changes in Advanced mode may override standard payroll rules.'}
                </section>
              ) : null}

              <section className="space-y-3">
                {automaticFields.map((field) => renderAutomaticCard(field, automaticDescription))}
                {fixedByLawFields.map((field) => renderFixedCard(field, fixedDescription))}
                {adjustableFields.map((field) => renderAdjustableCard(field, adjustableDescription))}
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#143675]/10 text-[#143675] dark:bg-[#143675]/20 dark:text-[#8fb2ff]">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {isSpanish
                        ? 'Este perfil muestra qué componentes de nómina se calculan automáticamente y cuáles pueden personalizarse según tu empresa.'
                        : 'This profile shows which payroll components are calculated automatically and which can be customized based on your company.'}
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
                className="h-11 gap-2 rounded-2xl bg-[#143675] px-5 text-base font-semibold text-white hover:bg-[#0f2855]"
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
                      className={`w-full rounded-lg border px-4 py-4 text-left transition-all ${selectedLineId === line.id
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

