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
  externalAuthorized: string;
  externalDocumentLabel: string;
  externalDocumentSubtitle: string;
  externalDocumentTitle: string;
  externalLegalNote: string;
  download: string;
  emptyExpenses: string;
  emptyMovements: string;
  expenses: string;
  fund: string;
  funded: string;
  generated: string;
  internalNote: string;
  managedAsset: string;
  movements: string;
  opening: string;
  owner: string;
  ownerReference: string;
  period: string;
  previewTitle: string;
  print: string;
  provider: string;
  reconciliation: string;
  relationship: string;
  reference: string;
  responsible: string;
  statementRecipient: string;
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
  externalAuthorized: 'Validated outflows',
  externalDocumentLabel: 'Client funds administration document',
  externalDocumentSubtitle: 'Consolidated entries, outflows and reconciliation of third-party money administered during the selected period.',
  externalDocumentTitle: 'Managed fund account statement',
  externalLegalNote: 'This statement reports third-party money administered by the company. It does not record company income or expenses.',
  download: 'Download PDF',
  emptyExpenses: 'No expenses were recorded in this statement.',
  emptyMovements: 'No money entries were recorded in this statement.',
  expenses: 'Expenses and receipts',
  fund: 'Fund',
  funded: 'Money entered',
  generated: 'Generated',
  internalNote: 'Internal control document. It does not replace tax receipts or approval policies.',
  managedAsset: 'Managed asset',
  movements: 'Money entries and funding',
  opening: 'Opening balance',
  owner: 'Owner or client',
  ownerReference: 'Client reference',
  period: 'Period',
  previewTitle: 'Account statement preview',
  print: 'Print',
  provider: 'Provider',
  reconciliation: 'Reconciliation summary',
  relationship: 'Relationship',
  reference: 'Reference',
  responsible: 'Custodian',
  statementRecipient: 'Statement recipient',
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
  externalAuthorized: 'Salidas validadas',
  externalDocumentLabel: 'Documento de administración de recursos de terceros',
  externalDocumentSubtitle: 'Consolidado de entradas, salidas y conciliación del dinero de terceros administrado durante el periodo seleccionado.',
  externalDocumentTitle: 'Estado de cuenta de fondo administrado',
  externalLegalNote: 'Este estado de cuenta informa sobre dinero de terceros administrado por la empresa. No registra ingresos ni gastos propios de la empresa.',
  download: 'Descargar PDF',
  emptyExpenses: 'Este corte no tiene gastos registrados.',
  emptyMovements: 'Este corte no tiene ingresos registrados.',
  expenses: 'Gastos y comprobantes',
  fund: 'Fondo',
  funded: 'Dinero ingresado',
  generated: 'Generado',
  internalNote: 'Documento de control interno. No sustituye comprobantes fiscales ni políticas de aprobación.',
  managedAsset: 'Activo administrado',
  movements: 'Ingresos y fondeos',
  opening: 'Saldo inicial',
  owner: 'Propietario o cliente',
  ownerReference: 'Referencia del cliente',
  period: 'Periodo',
  previewTitle: 'Vista previa del estado de cuenta',
  print: 'Imprimir',
  provider: 'Proveedor',
  reconciliation: 'Resumen de conciliación',
  relationship: 'Relación',
  reference: 'Referencia',
  responsible: 'Responsable',
  statementRecipient: 'Destinatario del estado de cuenta',
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
