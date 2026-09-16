import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const pettyCashRoot = resolve(root, 'src/app/BasicModules/PettyCash');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Petty Cash respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(pettyCashRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Petty Cash conserva el shell financiero y el Kiosk Engine compartido', () => {
  const moduleSource = readFileSync(resolve(pettyCashRoot, 'CajaChica.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(pettyCashRoot, 'Kiosk/PublicPettyCashKioskPage.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(kioskSource, /<KioskPublicShell/);
  assert.match(kioskSource, /<KioskIdentityGate/);
  assert.match(kioskSource, /<KioskWorkspaceTabs/);
});

test('Petty Cash conserva índices móviles y detalle operativo de cortes', () => {
  const fundsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashFundsWorkspace.tsx'), 'utf8');
  const reconciliationSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashReconciliationWorkspace.tsx'), 'utf8');
  const statementsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashStatementsWorkspace.tsx'), 'utf8');
  const financialSource = readFileSync(resolve(pettyCashRoot, 'KPIs/components/PettyCashKpiTable.tsx'), 'utf8');
  const detailSource = readFileSync(resolve(pettyCashRoot, 'components/statements/PettyCashStatementDetailModal.tsx'), 'utf8');
  const statementDocumentSource = readFileSync(resolve(pettyCashRoot, 'utils/pettyCashStatementPdf.ts'), 'utf8');

  for (const source of [fundsSource, reconciliationSource, statementsSource, financialSource]) {
    assert.match(source, /md:hidden/);
    assert.match(source, /md:block/);
  }
  assert.match(fundsSource, /<FundActionsMenu/);
  assert.doesNotMatch(fundsSource, /DropdownMenu/);
  assert.match(reconciliationSource, /<DropdownMenu/);
  assert.match(detailSource, /buildPettyCashStatementDocument/);
  assert.match(statementDocumentSource, /statement\.responsibleName/);
  assert.match(statementDocumentSource, /copy\.status\.statement/);
});

test('Petty Cash no introduce texto operativo menor a 12 px', () => {
  const violations = collectFiles(pettyCashRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(/text-\[(?:[0-9]|1[01])px\]/g)].map(() => relative(root, file).replaceAll('\\', '/'));
  });

  assert.deepEqual(violations, []);
});

test('Petty Cash usa filtros progresivos y columnas persistentes en sus índices principales', () => {
  const sharedSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashShared.tsx'), 'utf8');
  const fundsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashFundsWorkspace.tsx'), 'utf8');
  const reconciliationSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashReconciliationWorkspace.tsx'), 'utf8');
  const statementsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashStatementsWorkspace.tsx'), 'utf8');

  assert.match(sharedSource, /<IndiceFilterDisclosureActions/);
  assert.match(sharedSource, /<IndiceFilterAdvancedSection/);
  assert.match(sharedSource, /usePettyCashColumns/);
  assert.match(sharedSource, /const eligibleActionCount = contextualActions\.length \+ Number\(hasPrimaryAction\) \+ Number\(Boolean\(onColumns\)\)/);
  assert.match(sharedSource, /const hasOverflow = eligibleActionCount > 3/);
  assert.match(sharedSource, /const directContextualLimit = hasPrimaryAction \? 2 : 3/);
  assert.match(sharedSource, /whitespace-nowrap/);
  assert.match(sharedSource, /!hasOverflow && onColumns/);
  assert.match(sharedSource, /\{hasOverflow \? \(/);
  assert.match(sharedSource, /<IndiceTitleBarOverflow/);
  assert.match(sharedSource, /\.\.\.overflowContextualActions\.map/);
  assert.match(fundsSource, /indice\.pettyCash\.funds\.columns\.v1/);
  assert.match(fundsSource, /onColumns=\{\(\) => setShowColumnsModal\(true\)\}/);
  assert.match(fundsSource, /onSecondaryAction=\{legacyOwnerKioskEntryPointsEnabled \? \(\) => setIsKioskOpen\(true\) : undefined\}/);
  assert.match(fundsSource, /initialFundId=\{initialKioskFundId\}/);
  assert.match(statementsSource, /indice\.pettyCash\.statements\.columns\.v1/);
  assert.match(statementsSource, /<ColumnasConfigModal/);
  assert.match(reconciliationSource, /<PettyCashFilterShell/);
  assert.match(reconciliationSource, /advancedContent=/);
  assert.match(reconciliationSource, /onTertiaryAction=\{\(\) => setIsProviderModalOpen\(true\)\}/);
});

test('Petty Cash consolida moneda y evita avances KPI artificiales', () => {
  const financialSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashFinancialViewWorkspace.tsx'), 'utf8');
  const statementsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashStatementsWorkspace.tsx'), 'utf8');

  assert.match(financialSource, /<OperationalKpiCurrencyStrip/);
  assert.match(financialSource, /const aggregates = usePettyCashKpiAggregates/);
  assert.doesNotMatch(financialSource, /progress:\s*100/);
  assert.doesNotMatch(financialSource, /budgetAvailable|healthScore/);
  assert.match(financialSource, /PettyCashKpiOverview/);
  assert.match(statementsSource, /const aggregates = useKpiMonetaryAggregates/);
  assert.match(statementsSource, /currencyContext=/);
});

test('Saldos ofrece vista previa, descarga e impresión del estado de cuenta', () => {
  const reconciliationSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashReconciliationWorkspace.tsx'), 'utf8');
  const detailSource = readFileSync(resolve(pettyCashRoot, 'components/statements/PettyCashStatementDetailModal.tsx'), 'utf8');
  const pdfSource = readFileSync(resolve(pettyCashRoot, 'utils/pettyCashStatementPdf.ts'), 'utf8');

  assert.match(reconciliationSource, /additionalActionLabel=\{accountStatementCopy\.action\}/);
  assert.match(reconciliationSource, /setPreviewStatement\(selectedStatement\)/);
  assert.match(detailSource, /downloadPettyCashStatementPdf/);
  assert.match(detailSource, /printPettyCashStatementPdf/);
  assert.match(detailSource, /definition\.tables\?\.map/);
  assert.doesNotMatch(detailSource, /bg-\[#FF6B5E\]|bg-\[#F4C84A\]|bg-\[#59C3A5\]|bg-\[#2563EB\]/);
  assert.match(pdfSource, /pageSize: 'a4'/);
  assert.match(pdfSource, /buildStandardDocumentPdf/);
  assert.match(pdfSource, /downloadStandardDocumentPdf/);
  assert.match(pdfSource, /printStandardDocumentPdf/);
});

test('Las compras contabilizadas se anulan con motivo y conservan auditoría', () => {
  const reconciliationSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashReconciliationWorkspace.tsx'), 'utf8');
  const publicKioskSource = readFileSync(resolve(pettyCashRoot, 'Kiosk/PublicPettyCashKioskPage.tsx'), 'utf8');
  const adminApiSource = readFileSync(resolve(pettyCashRoot, 'services/petty-cash.service.ts'), 'utf8');
  const kioskApiSource = readFileSync(resolve(pettyCashRoot, 'Kiosk/pettyCashKioskApi.ts'), 'utf8');
  const spanishCopy = readFileSync(resolve(pettyCashRoot, 'translations/es-MX.ts'), 'utf8');

  for (const source of [reconciliationSource, publicKioskSource]) {
    assert.match(source, /cancellationReason\.trim\(\)\.length < 8/);
    assert.match(source, /cancellationReasonRequired/);
  }
  assert.match(adminApiSource, /\?reason=\$\{encodeURIComponent\(reason\.trim\(\)\)\}/);
  assert.match(kioskApiSource, /cancellation_reason: cancellationReason\.trim\(\)/);
  assert.match(spanishCopy, /delete: 'Anular compra'/);
  assert.match(spanishCopy, /permanecerán en el historial para auditoría/);
});

test('Los fondos distinguen dinero de empresa y dinero administrado con identidad trazable', () => {
  const fundsSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashFundsWorkspace.tsx'), 'utf8');
  const reconciliationSource = readFileSync(resolve(pettyCashRoot, 'components/PettyCashReconciliationWorkspace.tsx'), 'utf8');
  const serviceSource = readFileSync(resolve(pettyCashRoot, 'services/petty-cash.service.ts'), 'utf8');
  const typesSource = readFileSync(resolve(pettyCashRoot, 'types/pettyCash.types.ts'), 'utf8');
  const statementSource = readFileSync(resolve(pettyCashRoot, 'utils/pettyCashStatementPdf.ts'), 'utf8');

  assert.match(typesSource, /PettyCashFundType = 'INTERNAL_COMPANY' \| 'EXTERNAL_MANAGED'/);
  assert.match(fundsSource, /externalOwnerName/);
  assert.match(fundsSource, /statementRecipientEmail/);
  assert.match(fundsSource, /managedAssetName/);
  assert.match(reconciliationSource, /selectedFund\?\.fundType === 'EXTERNAL_MANAGED'/);
  assert.match(reconciliationSource, /draft\.externalSourceName\.trim\(\)/);
  assert.match(serviceSource, /externalSourceName: movement\.externalSourceName\?\.trim\(\) \|\| null/);
  assert.match(serviceSource, /externalOwnerNameSnapshot/);
  assert.match(statementSource, /fundTypeSnapshot === 'EXTERNAL_MANAGED'/);
});
