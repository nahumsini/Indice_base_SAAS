import { esMX } from './es-MX';
import type { PettyCashTranslations } from './types';

export const esCO = {
  ...esMX,
  locale: 'es-CO',
  shell: {
    ...esMX.shell,
    title: 'Caja menor',
    subtitle: 'Administra cajas menores, soportes, cierres y visibilidad financiera sin duplicar gastos.',
  },
  funds: {
    ...esMX.funds,
    header: {
      ...esMX.funds.header,
      title: 'Fondos de caja menor',
    },
  },
  financial: {
    ...esMX.financial,
    header: {
      ...esMX.financial.header,
      title: 'Vista financiera de caja menor',
    },
  },
} satisfies PettyCashTranslations;
