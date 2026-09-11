import { getManagedAssetTypeLabel, getStatementManagedAssets } from './managedAssets';
import type {
  PettyCashFund,
  PettyCashMovement,
  PettyCashSettlementLine,
  PettyCashStatement,
} from '../types/pettyCash.types';
import type { PettyCashTranslations } from '../translations';
import {
  formatPettyCashCurrency,
  formatPettyCashIsoDate,
  getStatementSettlementBalance,
} from './pettyCash.utils';
import { getPettyCashAccountStatementCopy } from './pettyCashAccountStatementCopy';
import {
  buildStandardDocumentPdf,
  downloadStandardDocumentPdf,
  printStandardDocumentPdf,
  type StandardDocumentDefinition,
  type StandardDocumentField,
  type StandardDocumentTable,
} from '../../shared/print/standardDocumentPdf';

export type PettyCashStatementPdfContext = {
  copy: PettyCashTranslations;
  fund: PettyCashFund;
  generatedAt?: Date;
  locale: string;
  movements: PettyCashMovement[];
  originText?: string;
  settlementLines: PettyCashSettlementLine[];
  statement: PettyCashStatement;
};

const isSpanish = (locale: string) => locale.toLowerCase().startsWith('es');

const documentLabels = (locale: string) => (isSpanish(locale) ? {
  accountingAccount: 'Cuenta contable',
  amount: 'Importe',
  attachments: 'Adjuntos',
  budgetLine: 'Línea presupuestal',
  business: 'Negocio',
  currency: 'Moneda',
  expenseDate: 'Fecha',
  fundContext: 'Datos del fondo',
  legalScope: 'Alcance del documento',
  managedAssets: 'Activos administrados',
  movementSource: 'Origen / destino',
  openingSource: 'Origen del saldo inicial',
  receiptsTitle: 'Gastos y comprobantes',
  source: 'Fuente: Módulo de fondos',
  statementSummary: 'Resumen del corte',
  unit: 'Unidad',
} : {
  accountingAccount: 'Accounting account',
  amount: 'Amount',
  attachments: 'Attachments',
  budgetLine: 'Budget line',
  business: 'Business',
  currency: 'Currency',
  expenseDate: 'Date',
  fundContext: 'Fund details',
  legalScope: 'Document scope',
  managedAssets: 'Managed assets',
  movementSource: 'Source / destination',
  openingSource: 'Opening balance source',
  receiptsTitle: 'Expenses and receipts',
  source: 'Source: Funds module',
  statementSummary: 'Statement summary',
  unit: 'Unit',
});

const statementMovementsFor = (
  fund: PettyCashFund,
  movements: PettyCashMovement[],
  statement: PettyCashStatement,
) => {
  const exactMovements = movements.filter(movement => movement.pettyCashStatementId === statement.id);
  const matchingMovements = exactMovements.length > 0
    ? exactMovements
    : movements.filter(movement => movement.pettyCashFundId === fund.id && !movement.pettyCashStatementId);
  return [...matchingMovements].sort((left, right) => right.movementDate.localeCompare(left.movementDate));
};

export function buildPettyCashStatementDocument({
  copy,
  fund,
  generatedAt = new Date(),
  locale,
  movements,
  originText,
  settlementLines,
  statement,
}: PettyCashStatementPdfContext): StandardDocumentDefinition {
  const labels = getPettyCashAccountStatementCopy(locale);
  const tableLabels = documentLabels(locale);
  const isExternalFund = statement.fundTypeSnapshot === 'EXTERNAL_MANAGED';
  const documentTitle = isExternalFund ? labels.externalDocumentTitle : labels.documentTitle;
  const documentSubtitle = isExternalFund ? labels.externalDocumentSubtitle : labels.documentSubtitle;
  const status = copy.status.statement[statement.status];
  const currency = statement.currencyCode;
  const money = (amount: number) => formatPettyCashCurrency(amount, currency);
  const fundedAmount = statement.assignedAmount + statement.additionalDepositAmount;
  const pendingAmount = getStatementSettlementBalance(statement);
  const period = `${formatPettyCashIsoDate(statement.periodStart)} - ${formatPettyCashIsoDate(statement.periodEnd)}`;
  const issuer = fund.businessName || fund.name;
  const statementMovements = statementMovementsFor(fund, movements, statement);
  const orderedSettlementLines = settlementLines
    .filter(line => line.pettyCashStatementId === statement.id)
    .sort((left, right) => right.expenseDate.localeCompare(left.expenseDate));
  const managedAssets = getStatementManagedAssets(statement);
  const externalOwnerName = statement.externalOwnerNameSnapshot ?? fund.externalOwnerName ?? copy.common.notAvailable;
  const externalIdentity: StandardDocumentField[] = isExternalFund ? [
    { label: labels.owner, value: externalOwnerName },
    { label: labels.relationship, value: (statement.externalOwnerRelationshipSnapshot ?? fund.externalOwnerRelationship ?? copy.common.notAvailable).split('_').join(' ') },
    { label: labels.statementRecipient, value: statement.statementRecipientEmailSnapshot ?? fund.statementRecipientEmail ?? copy.common.notAvailable },
    ...(statement.externalOwnerReferenceSnapshot ?? fund.externalOwnerReference
      ? [{ label: labels.ownerReference, value: statement.externalOwnerReferenceSnapshot ?? fund.externalOwnerReference }]
      : []),
  ] : [];
  const fundFields: StandardDocumentField[] = [
    { label: labels.fund, value: fund.name },
    { label: labels.responsible, value: statement.responsibleName },
    { label: tableLabels.unit, value: fund.unitName },
    { label: tableLabels.business, value: fund.businessName },
    { label: tableLabels.openingSource, value: originText ?? copy.common.notAvailable },
    ...(!isExternalFund ? [
      { label: copy.reconciliation.metrics.source, value: fund.fundingSourceName },
      { label: tableLabels.budgetLine, value: fund.budgetLineName ?? copy.common.notAvailable },
    ] : []),
  ];
  const tables: StandardDocumentTable[] = [
    {
      avoidRowSplit: true,
      columns: [labels.type, tableLabels.amount],
      fontSize: 9,
      numericColumnIndices: [1],
      rows: [
        [labels.opening, money(statement.openingBalanceAmount)],
        [labels.funded, money(fundedAmount)],
        [labels.captured, money(statement.estimatedUsageAmount)],
        [isExternalFund ? labels.externalAuthorized : labels.authorized, money(statement.verifiedExpenseAmount)],
        [copy.reconciliation.metrics.pendingSettlement, money(pendingAmount)],
        [copy.financial.metrics.shortages, money(statement.shortageAmount)],
        [labels.closing, money(statement.declaredClosingBalanceAmount)],
        [labels.currentBalance, formatPettyCashCurrency(fund.currentBalanceAmount, fund.currencyCode)],
      ],
      title: tableLabels.statementSummary,
    },
  ];

  if (isExternalFund && managedAssets.length > 0) {
    tables.push({
      avoidRowSplit: true,
      columns: ['#', copy.funds.modal.assetType, copy.funds.modal.assetName.replace(/\s*\*$/, ''), copy.funds.modal.assetReference],
      emptyMessage: copy.common.notAvailable,
      fontSize: 9,
      rows: managedAssets.map((asset, index) => [
        index + 1,
        getManagedAssetTypeLabel(asset.type, copy),
        asset.name,
        asset.reference || copy.common.notAvailable,
      ]),
      title: tableLabels.managedAssets,
    });
  }

  tables.push(
    {
      avoidRowSplit: true,
      columns: [
        copy.reconciliation.movements.columns.date,
        labels.type,
        tableLabels.movementSource,
        labels.reference,
        tableLabels.amount,
      ],
      emptyMessage: labels.emptyMovements,
      fontSize: 8.5,
      numericColumnIndices: [4],
      rows: statementMovements.map(movement => [
        formatPettyCashIsoDate(movement.movementDate),
        copy.status.movement[movement.type],
        movement.type === 'RETURN_TO_SOURCE'
          ? movement.toPaymentAccountName ?? movement.externalSourceName ?? copy.common.notAvailable
          : movement.fromPaymentAccountName ?? movement.externalSourceName ?? copy.common.notAvailable,
        movement.statementDescription || movement.reference || copy.common.notAvailable,
        formatPettyCashCurrency(movement.amount, movement.currencyCode),
      ]),
      title: labels.movements,
    },
    {
      avoidRowSplit: true,
      columns: [
        copy.reconciliation.receipts.columns.receipt,
        labels.provider,
        tableLabels.accountingAccount,
        tableLabels.expenseDate,
        labels.total,
        tableLabels.attachments,
        labels.status,
      ],
      emptyMessage: labels.emptyExpenses,
      fontSize: 8,
      numericColumnIndices: [4],
      rows: orderedSettlementLines.map(line => [
        `${line.description}${line.receiptReference ? `\n${line.receiptReference}` : ''}`,
        line.providerName ?? copy.common.notAvailable,
        isExternalFund ? copy.common.notAvailable : line.accountingAccountName ?? copy.common.notAvailable,
        formatPettyCashIsoDate(line.expenseDate),
        formatPettyCashCurrency(line.totalAmount, line.currencyCode),
        line.attachmentCount,
        copy.status.line[line.status],
      ]),
      title: tableLabels.receiptsTitle,
    },
  );

  return {
    accentColor: [20, 117, 20],
    confidentiality: 'Internal',
    continuationHeader: [issuer, documentTitle, statement.folio].filter(Boolean).join(' · '),
    contract: {
      category: 'transaction-document',
      modifiers: ['confidential', 'internal', 'multi-currency', 'approval-required'],
      orientation: 'portrait',
      pageSize: 'a4',
      version: '1.0',
    },
    fileName: {
      documentType: 'petty-cash-account-statement',
      identifier: statement.folio,
      period: statement.periodKey,
    },
    folio: statement.folio,
    generatedAt,
    issuer,
    locale,
    metadata: [
      { label: labels.fund, value: fund.name },
      { label: labels.period, value: period },
      { label: tableLabels.currency, value: currency },
    ],
    recipient: isExternalFund ? externalOwnerName : undefined,
    sections: [
      { fields: fundFields, title: tableLabels.fundContext },
      ...(externalIdentity.length > 0 ? [{ fields: externalIdentity, title: labels.owner }] : []),
      {
        paragraphs: [
          documentSubtitle,
          isExternalFund ? labels.externalLegalNote : labels.internalNote,
          tableLabels.source,
        ],
        title: tableLabels.legalScope,
      },
    ],
    showIssuerMetadata: false,
    status,
    subtitle: `${fund.name} · ${period}`,
    tables,
    title: documentTitle,
  };
}

export function buildPettyCashStatementPdf(context: PettyCashStatementPdfContext) {
  return buildStandardDocumentPdf(buildPettyCashStatementDocument(context));
}

export function downloadPettyCashStatementPdf(context: PettyCashStatementPdfContext) {
  return downloadStandardDocumentPdf(buildPettyCashStatementDocument(context));
}

export function printPettyCashStatementPdf(context: PettyCashStatementPdfContext) {
  return printStandardDocumentPdf(buildPettyCashStatementDocument(context));
}
