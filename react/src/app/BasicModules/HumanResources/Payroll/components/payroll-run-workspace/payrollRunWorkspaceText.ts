export type PayrollRunWorkspaceText = {
  adjustments: string;
  all: string;
  actions: string;
  addDeduction: string;
  addEarning: string;
  applyIncentive: string;
  audit: string;
  back: string;
  breakdown: string;
  calculatedDeductions: string;
  calculatedDeductionsDescription: string;
  calculations: string;
  collaborators: string;
  concepts: string;
  confirmDiscard: string;
  discard: string;
  discardDescription: string;
  dirty: string;
  deductionsTotal: string;
  discounts: string;
  export: string;
  exportDescription: string;
  filters: string;
  earningsTotal: string;
  incentiveApplied: string;
  incentiveApplyError: string;
  incentiveAvailable: string;
  incentiveLoadError: string;
  incentivePermissionLocked: string;
  incentiveRunLocked: string;
  incentives: string;
  incentiveSourceNotice: string;
  kpiConnectorDescription: string;
  kpiConnectorPending: string;
  kpiIncentive: string;
  loadingIncentives: string;
  manualIncentive: string;
  manualDiscounts: string;
  manualDiscountsDescription: string;
  modified: string;
  next: string;
  noIncentives: string;
  noIncentivesDescription: string;
  noCalculatedDeductions: string;
  noManualDiscounts: string;
  noMatches: string;
  noOtherAdjustments: string;
  openPending: string;
  overview: string;
  otherAdjustments: string;
  otherAdjustmentsDescription: string;
  previous: string;
  print: string;
  refresh: string;
  results: string;
  search: string;
  searchPlaceholder: string;
  selectCollaborator: string;
  warnings: string;
};

const es: PayrollRunWorkspaceText = {
  adjustments: 'Ajustes',
  all: 'Todos',
  actions: 'Acciones',
  addDeduction: 'Agregar descuento',
  addEarning: 'Agregar percepción',
  applyIncentive: 'Agregar a la corrida',
  audit: 'Auditoría',
  back: 'Volver',
  breakdown: 'Desglose',
  calculatedDeductions: 'Deducciones calculadas',
  calculatedDeductionsDescription: 'Conceptos generados por las reglas de nómina y la jurisdicción aplicable.',
  calculations: 'Cálculo',
  collaborators: 'Colaboradores',
  concepts: 'Conceptos',
  confirmDiscard: 'Salir sin guardar',
  discard: 'Descartar cambios',
  discardDescription: 'Hay cambios pendientes en la corrida. Puedes volver al workspace o descartarlos y cerrar.',
  dirty: 'Modificado',
  deductionsTotal: 'Total deducciones',
  discounts: 'Descuentos',
  export: 'Exportar',
  exportDescription: 'Elige el formato para descargar la corrida completa.',
  filters: 'Vista',
  earningsTotal: 'Total percepciones',
  incentiveApplied: 'Ya aplicado',
  incentiveApplyError: 'No fue posible agregar el incentivo.',
  incentiveAvailable: 'Disponible',
  incentiveLoadError: 'No fue posible consultar los incentivos.',
  incentivePermissionLocked: 'Puedes consultar los incentivos, pero tu rol no permite modificar esta corrida.',
  incentiveRunLocked: 'Esta corrida conserva su historial sin cambios. Los incentivos se pueden consultar, pero solo se aplican en corridas en borrador.',
  incentives: 'Incentivos de nómina',
  incentiveSourceNotice: 'Esta lista proviene de la pestaña Incentivos y respeta el alcance asignado al colaborador.',
  kpiConnectorDescription: 'La referencia está preparada para el motor KPI final; no se utilizará el KPI provisional ni un monto manual.',
  kpiConnectorPending: 'Conector KPI pendiente',
  kpiIncentive: 'Basado en KPI',
  loadingIncentives: 'Consultando incentivos aplicables...',
  manualIncentive: 'Incentivo configurado',
  manualDiscounts: 'Descuentos manuales',
  manualDiscountsDescription: 'Agrega descuentos extraordinarios que aplican únicamente a esta corrida.',
  modified: 'Modificados',
  next: 'Siguiente',
  noIncentives: 'No hay incentivos aplicables para este periodo',
  noIncentivesDescription: 'Crea o asigna el incentivo desde la pestaña Incentivos. Cuando su alcance incluya a este colaborador aparecerá aquí.',
  noCalculatedDeductions: 'No hay deducciones calculadas para este colaborador.',
  noManualDiscounts: 'No hay descuentos manuales en esta línea.',
  noMatches: 'No hay colaboradores que coincidan con esta vista.',
  noOtherAdjustments: 'No hay percepciones ni otras excepciones manuales en esta línea.',
  openPending: 'Revisar cambios',
  overview: 'Resumen',
  otherAdjustments: 'Percepciones y otras excepciones',
  otherAdjustmentsDescription: 'Registra percepciones, aportaciones o provisiones extraordinarias de esta corrida.',
  previous: 'Anterior',
  print: 'Imprimir',
  refresh: 'Actualizar',
  results: 'resultados',
  search: 'Buscar colaborador',
  searchPlaceholder: 'Nombre, puesto, unidad o negocio',
  selectCollaborator: 'Selecciona un colaborador para revisar su nómina.',
  warnings: 'Alertas',
};

const en: PayrollRunWorkspaceText = {
  adjustments: 'Adjustments',
  all: 'All',
  actions: 'Actions',
  addDeduction: 'Add deduction',
  addEarning: 'Add earning',
  applyIncentive: 'Add to run',
  audit: 'Audit',
  back: 'Back',
  breakdown: 'Breakdown',
  calculatedDeductions: 'Calculated deductions',
  calculatedDeductionsDescription: 'Items generated by payroll rules and the applicable jurisdiction.',
  calculations: 'Calculation',
  collaborators: 'HR users',
  concepts: 'Concepts',
  confirmDiscard: 'Exit without saving',
  discard: 'Discard changes',
  discardDescription: 'There are pending changes in this run. Return to the workspace or discard them and close.',
  dirty: 'Modified',
  deductionsTotal: 'Total deductions',
  discounts: 'Deductions',
  export: 'Export',
  exportDescription: 'Choose a format to download the complete payroll run.',
  filters: 'View',
  earningsTotal: 'Total earnings',
  incentiveApplied: 'Already applied',
  incentiveApplyError: 'The incentive could not be added.',
  incentiveAvailable: 'Available',
  incentiveLoadError: 'The incentives could not be loaded.',
  incentivePermissionLocked: 'You can review incentives, but your role cannot modify this run.',
  incentiveRunLocked: 'This run keeps an immutable history. Incentives remain visible but can only be applied to draft runs.',
  incentives: 'Payroll incentives',
  incentiveSourceNotice: 'This list comes from the Incentives tab and respects the scope assigned to this HR user.',
  kpiConnectorDescription: 'The reference is ready for the final KPI engine; provisional KPI data and manual amounts will not be used.',
  kpiConnectorPending: 'KPI connector pending',
  kpiIncentive: 'KPI based',
  loadingIncentives: 'Loading applicable incentives...',
  manualIncentive: 'Configured incentive',
  manualDiscounts: 'Manual deductions',
  manualDiscountsDescription: 'Add exceptional deductions that apply only to this payroll run.',
  modified: 'Modified',
  next: 'Next',
  noIncentives: 'No applicable incentives for this period',
  noIncentivesDescription: 'Create or assign the incentive from the Incentives tab. It will appear here when its scope includes this HR user.',
  noCalculatedDeductions: 'There are no calculated deductions for this HR user.',
  noManualDiscounts: 'There are no manual deductions on this line.',
  noMatches: 'No HR users match this view.',
  noOtherAdjustments: 'There are no manual earnings or other exceptions on this line.',
  openPending: 'Review changes',
  overview: 'Overview',
  otherAdjustments: 'Earnings and other exceptions',
  otherAdjustmentsDescription: 'Record exceptional earnings, employer contributions, or provisions for this run.',
  previous: 'Previous',
  print: 'Print',
  refresh: 'Refresh',
  results: 'results',
  search: 'Search HR user',
  searchPlaceholder: 'Name, role, unit, or business',
  selectCollaborator: 'Select an HR user to review payroll.',
  warnings: 'Warnings',
};

export const getPayrollRunWorkspaceText = (locale: string) => (
  locale.toLowerCase().startsWith('es') ? es : en
);
