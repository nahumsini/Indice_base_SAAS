import { esMX } from './es-MX';
import type { FinanceTranslations } from './types';

export const esCO = {
  ...esMX,
  locale: 'es-CO',
  budgets: {
    ...esMX.budgets,
    actual: 'Ejecutado',
    addLine: 'Agregar línea de presupuesto',
    budgetLine: 'Línea de presupuesto',
    messages: {
      ...esMX.budgets.messages,
      created: count => `Presupuesto creado con ${count} ${count === 1 ? 'línea de presupuesto' : 'líneas de presupuesto'}.`,
      deleteFailed: 'No se pudo eliminar la línea de presupuesto en Finance.',
      deleted: 'Línea de presupuesto eliminada de Finance.',
      emptyTitle: 'No hay líneas de presupuesto para el rango seleccionado',
      lineSaveFailed: 'No se pudo actualizar la línea de presupuesto en Finance.',
      partialSaveFailed: 'No se pudieron guardar todas las líneas de presupuesto en Finance. Se conservaron localmente.',
      updateFailed: 'No se pudo actualizar la línea de presupuesto en Finance.',
    },
    modal: {
      ...esMX.budgets.modal,
      editSubtitle: 'Actualiza la línea de presupuesto seleccionada.',
      scheduleDescription: 'Define el periodo y la periodicidad para crear líneas de presupuesto futuras.',
      scheduleEmpty: 'Revisa fecha de inicio, fecha de fin y periodicidad para generar líneas de presupuesto.',
      scheduleTitle: 'Programación de líneas de presupuesto',
    },
    summary: {
      ...esMX.budgets.summary,
      budgetLines: count => `${count} ${count === 1 ? 'línea de presupuesto' : 'líneas de presupuesto'}`,
    },
  },
  kpis: {
    ...esMX.kpis,
    actual: 'Ejecutado',
  },
} satisfies FinanceTranslations;
