import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const reactRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(reactRoot, '..');
const source = (path) => readFileSync(resolve(reactRoot, 'src', path), 'utf8');
const inventory = readFileSync(resolve(repositoryRoot, 'docs/INDICE_DOCUMENT_PRINT_INVENTORY.md'), 'utf8');

const activeGeneratorPaths = [
  'app/BasicModules/HumanResources/Payroll/PayrollRunPdfDocument.tsx',
  'app/BasicModules/HumanResources/Records/utils/records.pdf.ts',
  'app/BasicModules/HumanResources/Assets/AssetDetailsModal.tsx',
  'app/BasicModules/HumanResources/Control/utils/timeTablePrintReport.ts',
  'app/BasicModules/PettyCash/utils/pettyCashStatementPdf.ts',
  'app/BasicModules/Sales/Cotizacion/quotePdf.ts',
  'app/BasicModules/Sales/Sales/utils/saleInvoicePdf.ts',
  'app/BasicModules/Sales/Postventa/utils/postSalePdf.ts',
  'app/BasicModules/ProcessesTasks/Agenda/utils/agendaTaskReportPdf.ts',
  'app/BasicModules/ProcessesTasks/Projects/components/ProjectTasksWorkspace.tsx',
  'app/BasicModules/PointOfSale/Cortes/utils/cortesPrintReport.ts',
  'app/BasicModules/PointOfSale/Cortes/components/CorteDetailModal.tsx',
  'app/BasicModules/PointOfSale/Sale/components/TicketModal.tsx',
  'app/BasicModules/PointOfSale/Clientes/components/AccountStatementModal.tsx',
  'app/BasicModules/Sales/Inventory/components/movements/MovementPrintModal.tsx',
  'app/ComplementaryModules/WorkClimate/Agenda/Agenda.tsx',
  'app/components/rh/NominasTab.tsx',
  'app/BasicModules/Receivables/utils/receivablesPrintDocuments.ts',
  'app/BasicModules/Expenses/utils/expensePrintDocument.ts',
  'app/BasicModules/PointOfSale/shared/pointOfSalePrintDocuments.ts',
  'app/BasicModules/HumanResources/Permissions/utils/permissionPrintDocument.ts',
  'app/BasicModules/ProcessesTasks/Processes/processPrintDocument.ts',
  'app/BasicModules/PettyCash/utils/pettyCashExpensePrintDocument.ts',
  'app/BasicModules/Sales/Postventa/utils/postSaleDeliveryAct.ts',
];

test('the maintained inventory links every active non-KPI generator to source', () => {
  for (const path of activeGeneratorPaths) {
    assert.match(inventory, new RegExp(path.replaceAll('/', '[\\\\/]')),
      `Missing printable generator in inventory: ${path}`);
  }
});

test('shared print primitives own attribution, feedback, units, and format version', () => {
  const contract = source('app/BasicModules/shared/print/documentPrintContract.ts');
  const pdfEngine = source('app/BasicModules/shared/print/documentPdfEngine.ts');
  const htmlEngine = source('app/BasicModules/shared/print/documentHtmlPrintEngine.ts');
  const standardDocument = source('app/BasicModules/shared/print/standardDocumentPdf.ts');

  assert.match(contract, /Powered by www\.indiceapp\.com/);
  assert.match(pdfEngine, /notifyDocumentPrintFailure\(locale, 'popup-blocked'\)/);
  assert.match(htmlEngine, /notifyDocumentPrintFailure\(locale, 'popup-blocked'\)/);
  assert.match(pdfEngine, /doc\.internal\.scaleFactor/);
  assert.match(standardDocument, /version: definition\.contract\.version/);
  assert.doesNotMatch(standardDocument, /definition\.issuer \|\| 'Indice'/);
});

test('active custom jsPDF generators reserve a visible format version in their footer', () => {
  const customPdfPaths = activeGeneratorPaths.filter((path) => (
    source(path).includes('addStandardPdfFooters(doc')
  ));

  for (const path of customPdfPaths) {
    const contents = source(path);
    const footerCalls = [...contents.matchAll(/addStandardPdfFooters\(doc,\s*\{([\s\S]*?)\}\);/g)];
    assert.ok(footerCalls.length > 0, `Footer call not found in ${path}`);
    footerCalls.forEach((call) => assert.match(call[1], /version:\s*'1\.0'/, `Missing format version in ${path}`));
  }
});

test('POS ticket uses live shift identity and does not print invented fiscal/contact data', () => {
  const ticket = source('app/BasicModules/PointOfSale/Sale/components/TicketModal.tsx');

  assert.match(ticket, /shift\?\.companyName/);
  assert.match(ticket, /shift\?\.currencyCode/);
  assert.match(ticket, /documentPrintAttribution/);
  assert.doesNotMatch(ticket, /currencyCode\s*\|\|\s*'MXN'/);
  assert.doesNotMatch(ticket, /ABC123456789|Calle Principal #123|\(555\) 123-4567|IVA \(16%\)/);
});

test('shared standard-document adapters do not invent Indice as the client issuer', () => {
  const adapterPaths = [
    'app/BasicModules/Expenses/utils/expensePrintDocument.ts',
    'app/BasicModules/ProcessesTasks/Processes/processPrintDocument.ts',
    'app/BasicModules/Receivables/utils/receivablesPrintDocuments.ts',
  ];

  for (const path of adapterPaths) {
    assert.doesNotMatch(source(path), /issuer:\s*'Indice'|issuer:[^\n]*\|\|\s*'Indice'/,
      `Invented issuer fallback found in ${path}`);
  }
});

test('non-protected operational HTML outputs do not present an Indice logo as issuer', () => {
  const paths = [
    'app/BasicModules/HumanResources/Control/utils/timeTablePrintReport.ts',
    'app/BasicModules/PettyCash/utils/pettyCashStatementPdf.ts',
    'app/BasicModules/PointOfSale/Cortes/utils/cortesPrintReport.ts',
  ];

  for (const path of paths) {
    assert.doesNotMatch(source(path), />INDICE<|doc\.text\('INDICE'/, `Prominent Indice issuer found in ${path}`);
  }
});
