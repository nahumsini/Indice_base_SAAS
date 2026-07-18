import { esMX } from './es-MX';
import type { SalesKpisTranslations } from './types';

export const esCO: SalesKpisTranslations = {
  ...esMX,
  filters: {
    ...esMX.filters,
    search: 'Buscar',
    unit: 'Unidad',
    business: 'Negocio',
    seller: 'Vendedor',
    allBusinesses: 'Todos los negocios',
  },
  cards: {
    ...esMX.cards,
    activeProspects: { label: 'Oportunidades activas', detail: (count) => `${count} oportunidades totales` },
  },
};
