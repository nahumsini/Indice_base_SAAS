import { esMX } from './es-MX';
import type { PayrollTranslations } from './types';

export const esCO = {
  ...esMX,
  title: 'Pago de personal',
  subtitle: 'Revisa, aprueba, paga y exporta pagos de personal con datos reales de asistencia.',
  header: {
    ...esMX.header,
    title: 'Operación de pago de personal',
    subtitle: 'Controla corridas por personal, negocio, frecuencia y reglas DIAN cuando aplique.',
  },
  labels: {
    ...esMX.labels,
    employees: 'Personal',
    employee: 'Persona',
    payrollType: 'Tipo de pago',
    rfc: 'NIT',
    curp: 'Documento',
    nss: 'Seguridad social',
    totalToPay: 'Total a pagar',
  },
  setupGuide: {
    ...esMX.setupGuide,
    title: 'Configura cómo se agrupa el pago de personal',
  },
  breakdown: {
    ...esMX.breakdown,
    title: 'Desglose de pago',
    printTitle: (employee: string) => `Desglose de pago - ${employee}`,
    statutoryPayroll: 'Pago con retenciones DIAN',
    internalOnlyPayroll: 'Pago solo operativo',
    employer: 'Empresa',
    employee: 'Persona',
    identity: {
      ...esMX.breakdown.identity,
      idNumber: 'Documento',
      contractType: 'Tipo de contrato',
      rfc: 'NIT',
      curp: 'Documento',
      nss: 'Seguridad social',
    },
    rows: {
      ...esMX.breakdown.rows,
      hrUserName: 'Persona',
      business: 'Empresa',
      employeeHealth: 'Salud persona',
      employeePension: 'Pensión persona',
      withholdingTax: 'Retención en la fuente',
      employerHealth: 'Salud empresa',
      employerPension: 'Pensión empresa',
      employerObligations: 'Aportes de la empresa',
      totalEmployerObligations: 'Total aportes de la empresa',
    },
  },
  pdf: {
    ...esMX.pdf,
    brandBadge: 'Reporte de pago Índice',
    netPayroll: 'Pago neto',
    netPayrollHint: 'Total neto a pagar al personal en esta corrida',
    employee: 'Persona',
    ledger: 'Libro de personal',
    lineBreakdown: 'Desglose de pagos',
    averageNetHint: (count: number) => `Por persona en ${count} líneas de pago`,
    averageGross: 'Bruto promedio por persona',
    noNote: 'No se agregó nota de pago para esta persona.',
    executiveSummaryText: (period: string, users: number, net: string, status: string) =>
      `${period} incluye ${users} líneas de personal con ${net} de pago neto. Estado actual: ${status}.`,
  },
  rateConfiguration: {
    ...esMX.rateConfiguration,
    profiles: {
      ...esMX.rateConfiguration.profiles,
      colombia: 'Colombia / DIAN',
    },
    fieldLabels: {
      ...esMX.rateConfiguration.fieldLabels,
      colombia: {
        ...esMX.rateConfiguration.fieldLabels.colombia,
        isr_rate: 'Retención en la fuente',
      },
    },
  },
} as const satisfies PayrollTranslations;
