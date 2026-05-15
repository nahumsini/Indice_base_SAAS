import { esMX } from './es-MX';

export const esCO = {
  ...esMX,
  locale: 'es-CO',
  companyFallback: 'Empresa actual',
  moduleLabels: {
    ...esMX.moduleLabels,
    products: 'CRM / Ventas',
    finance: 'Gastos e indicadores',
  },
} as const;
