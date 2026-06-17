import { esMX } from './es-MX';
import type { SalesKpisTranslations } from './types';

export const esCO: SalesKpisTranslations = {
  ...esMX,
  filters: {
    ...esMX.filters,
    allBusinesses: 'Todos los negocios',
  },
  cards: {
    ...esMX.cards,
    activeProspects: { label: 'Oportunidades activas', detail: (count) => `${count} oportunidades totales` },
  },
};
