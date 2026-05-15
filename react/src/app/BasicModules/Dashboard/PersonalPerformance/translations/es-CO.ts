import { esMX } from './es-MX';
import type { PersonalPerformanceTranslations } from './types';

export const esCO = {
  ...esMX,
  pdf: {
    ...esMX.pdf,
    fileName: 'Índice de Rendimiento Personal (IRP).pdf',
  },
} satisfies PersonalPerformanceTranslations;
