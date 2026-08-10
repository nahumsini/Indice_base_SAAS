import type { BillingTranslations } from './types';

export const esMX = {
  billingDayLabel: (day: number) => `Día ${day} de cada mes`,
  recovery: {
    loadError: 'No se pudo consultar la suscripción.',
    portalError: 'No se pudo abrir el portal de facturación.',
    loading: 'Consultando el estado comercial actual...',
    title: 'Estado comercial',
    syncing: 'Sincronizando',
    enabled: 'La operación de la cuenta está habilitada.',
    actionRequired: 'Regulariza la facturación para restaurar la operación completa.',
    manage: 'Administrar en Stripe',
  },
  storage: {
    title: 'Almacenamiento de la cuenta',
    summary: (purchased: number, benefit: number) =>
      `5 GB incluidos · ${purchased} comprados · ${benefit} de cortesía`,
    usageLabel: 'Uso de almacenamiento',
    note: 'Incluye archivos guardados y cargas reservadas. La compra de bloques se habilitará cuando se apruebe el precio comercial.',
  },
} as const satisfies BillingTranslations;
