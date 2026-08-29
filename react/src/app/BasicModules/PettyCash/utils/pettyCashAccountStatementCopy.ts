export type PettyCashAccountStatementCopy = {
  action: string;
  authorized: string;
  captured: string;
  close: string;
  closing: string;
  currentBalance: string;
  description: string;
  destination: string;
  documentLabel: string;
  documentSubtitle: string;
  documentTitle: string;
  download: string;
  emptyExpenses: string;
  emptyMovements: string;
  expenses: string;
  fund: string;
  funded: string;
  generated: string;
  internalNote: string;
  movements: string;
  opening: string;
  period: string;
  previewTitle: string;
  print: string;
  provider: string;
  reconciliation: string;
  reference: string;
  responsible: string;
  statement: string;
  status: string;
  total: string;
  type: string;
};

const english: PettyCashAccountStatementCopy = {
  action: 'Account statement',
  authorized: 'Authorized expenses',
  captured: 'Recorded expenses',
  close: 'Close',
  closing: 'Statement balance',
  currentBalance: 'Current fund balance',
  description: 'Review the selected fund and statement before downloading or printing.',
  destination: 'Destination',
  documentLabel: 'Financial control document',
  documentSubtitle: 'Consolidated money entries, recorded expenses and reconciliation for the selected period.',
  documentTitle: 'Petty cash account statement',
  download: 'Download PDF',
  emptyExpenses: 'No expenses were recorded in this statement.',
  emptyMovements: 'No money entries were recorded in this statement.',
  expenses: 'Expenses and receipts',
  fund: 'Fund',
  funded: 'Money entered',
  generated: 'Generated',
  internalNote: 'Internal control document. It does not replace tax receipts or approval policies.',
  movements: 'Money entries and funding',
  opening: 'Opening balance',
  period: 'Period',
  previewTitle: 'Account statement preview',
  print: 'Print',
  provider: 'Provider',
  reconciliation: 'Reconciliation summary',
  reference: 'Reference',
  responsible: 'Custodian',
  statement: 'Statement',
  status: 'Status',
  total: 'Total',
  type: 'Type',
};

const spanish: PettyCashAccountStatementCopy = {
  action: 'Estado de cuenta',
  authorized: 'Gastos autorizados',
  captured: 'Compras registradas',
  close: 'Cerrar',
  closing: 'Saldo del corte',
  currentBalance: 'Saldo actual del fondo',
  description: 'Revisa el fondo y el corte seleccionados antes de descargar o imprimir.',
  destination: 'Destino',
  documentLabel: 'Documento de control financiero',
  documentSubtitle: 'Consolidado de ingresos, gastos registrados y conciliación del periodo seleccionado.',
  documentTitle: 'Estado de cuenta de caja chica',
  download: 'Descargar PDF',
  emptyExpenses: 'Este corte no tiene gastos registrados.',
  emptyMovements: 'Este corte no tiene ingresos registrados.',
  expenses: 'Gastos y comprobantes',
  fund: 'Fondo',
  funded: 'Dinero ingresado',
  generated: 'Generado',
  internalNote: 'Documento de control interno. No sustituye comprobantes fiscales ni políticas de aprobación.',
  movements: 'Ingresos y fondeos',
  opening: 'Saldo inicial',
  period: 'Periodo',
  previewTitle: 'Vista previa del estado de cuenta',
  print: 'Imprimir',
  provider: 'Proveedor',
  reconciliation: 'Resumen de conciliación',
  reference: 'Referencia',
  responsible: 'Responsable',
  statement: 'Corte',
  status: 'Estado',
  total: 'Total',
  type: 'Tipo',
};

const french: PettyCashAccountStatementCopy = {
  ...english,
  action: 'Relevé de compte',
  close: 'Fermer',
  description: 'Vérifiez le fonds et le relevé sélectionnés avant de télécharger ou imprimer.',
  documentTitle: 'Relevé de compte de petite caisse',
  download: 'Télécharger PDF',
  previewTitle: 'Aperçu du relevé de compte',
  print: 'Imprimer',
};

const portuguese: PettyCashAccountStatementCopy = {
  ...english,
  action: 'Extrato da conta',
  close: 'Fechar',
  description: 'Revise o fundo e o fechamento selecionados antes de baixar ou imprimir.',
  documentTitle: 'Extrato da conta de caixinha',
  download: 'Baixar PDF',
  previewTitle: 'Visualização do extrato da conta',
  print: 'Imprimir',
};

export const getPettyCashAccountStatementCopy = (locale: string): PettyCashAccountStatementCopy => {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith('es')) return spanish;
  if (normalized.startsWith('fr')) return french;
  if (normalized.startsWith('pt')) return portuguese;
  return english;
};
