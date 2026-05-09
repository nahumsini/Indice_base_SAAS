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
