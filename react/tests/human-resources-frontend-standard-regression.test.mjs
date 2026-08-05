import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/HumanResources');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Recursos Humanos respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Recursos Humanos conserva el shell, el title bar y el Kiosk Engine de asistencia', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'HumanResources.tsx'), 'utf8');
  const titleBarSource = readFileSync(resolve(moduleRoot, 'shared/HrTitleBar.tsx'), 'utf8');
  const kioskSource = readFileSync(resolve(moduleRoot, 'Control/components/kiosk/PublicKioskPage.tsx'), 'utf8');
  const identitySource = readFileSync(resolve(moduleRoot, 'Control/components/kiosk/PublicKioskIdentityPanel.tsx'), 'utf8');

  assert.match(moduleSource, /<IndiceModuleShell/);
  assert.match(titleBarSource, /<IndiceTitleBar/);
  assert.match(kioskSource, /<KioskPublicShell/);
  assert.match(identitySource, /<KioskIdentityGate/);
});

test('Detalle de corrida usa el workspace operativo para revisar varios colaboradores', () => {
  const workspaceRoot = resolve(moduleRoot, 'Payroll/components/payroll-run-workspace');
  const workspaceSource = readFileSync(resolve(workspaceRoot, 'PayrollRunWorkspaceDialog.tsx'), 'utf8');
  const rosterSource = readFileSync(resolve(workspaceRoot, 'PayrollRunRoster.tsx'), 'utf8');
  const inspectorSource = readFileSync(resolve(workspaceRoot, 'PayrollLineInspector.tsx'), 'utf8');
  const incentiveSource = readFileSync(resolve(workspaceRoot, 'PayrollIncentiveSelector.tsx'), 'utf8');

  assert.match(workspaceSource, /modalType="operational-workspace"/);
  assert.match(workspaceSource, /<PayrollRunRoster/);
  assert.match(workspaceSource, /<PayrollLineInspector/);
  assert.match(workspaceSource, /<PayrollIncentiveSelector/);
  assert.match(incentiveSource, /listPayrollRunLineIncentives/);
  assert.match(incentiveSource, /applyPayrollRunLineIncentive/);
  assert.match(incentiveSource, /awaiting_kpi_connector/);
  assert.match(workspaceSource, /contentView === 'collaborators'/);
  assert.doesNotMatch(workspaceSource, /xl:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(380px,0\.65fr\)\]/);
  assert.match(rosterSource, /PayrollRosterFilter = 'all' \| 'warnings' \| 'modified'/);
  assert.match(rosterSource, /onOpenBreakdown/);
  assert.match(rosterSource, /onOpenDeductions/);
  assert.match(rosterSource, /onOpenAdjustments/);
  assert.match(rosterSource, /onOpenIncentives/);
  assert.match(rosterSource, /<DropdownMenu>/);
  assert.match(rosterSource, /copy\.editRun\.manage/);
  assert.match(rosterSource, /z-\[220\]/);
  assert.match(rosterSource, /text\.earningsTotal/);
  assert.match(rosterSource, /text\.deductionsTotal/);
  assert.match(inspectorSource, /PayrollInspectorView = 'breakdown' \| 'deductions' \| 'adjustments'/);
  assert.match(inspectorSource, /function DeductionsTab/);
  assert.doesNotMatch(inspectorSource, /Ruta de cálculo y pago/);
  assert.doesNotMatch(inspectorSource, /Ruta de pago/);
});

test('Nómina imprime corrida y desglose personal en A4 horizontal', () => {
  const payrollSource = readFileSync(resolve(moduleRoot, 'Payroll/Payroll.tsx'), 'utf8');
  const documentSource = readFileSync(resolve(moduleRoot, 'Payroll/PayrollRunPdfDocument.tsx'), 'utf8');
  const contractSource = readFileSync(resolve(moduleRoot, 'Payroll/payrollPrintContract.ts'), 'utf8');
  const portalSource = readFileSync(resolve(moduleRoot, 'Payroll/PayrollRunPrintPortal.tsx'), 'utf8');
  const printStyles = readFileSync(resolve(moduleRoot, 'Payroll/payrollPdf.css'), 'utf8');

  assert.match(payrollSource, /buildPrintJob\(selectedRunDetail, line\.id\)/);
  assert.match(documentSource, /PayrollLineDocument/);
  assert.match(documentSource, /PayrollRunDocument/);
  assert.match(documentSource, /companyIdentity/);
  assert.match(documentSource, /JurisdictionContextBlock/);
  assert.match(documentSource, /PrintMetadataStrip/);
  assert.match(documentSource, /facilita, pero no sustituye/);
  assert.match(documentSource, /prpdf-financial-table/);
  assert.match(contractSource, /category: 'operational-report'/);
  assert.match(contractSource, /category: 'legal-document'/);
  assert.match(contractSource, /CA_QUEBEC/);
  assert.match(contractSource, /evidenceReferences/);
  assert.match(printStyles, /size:\s*A4 landscape/);
  assert.match(printStyles, /\.prpdf-document-footer/);
  assert.doesNotMatch(printStyles, /font-weight:\s*(?:600|700|800|900)/);
  assert.doesNotMatch(printStyles, /text-transform:\s*uppercase/);
  assert.match(portalSource, /'payroll-breakdown'/);
  assert.match(portalSource, /buildDocumentFileName/);
  assert.match(portalSource, /waitForPrintImages/);
});

test('Nómina conserva borradores por colaborador y guarda sin cerrar el workspace', () => {
  const payrollSource = readFileSync(resolve(moduleRoot, 'Payroll/Payroll.tsx'), 'utf8');
  const saveStart = payrollSource.indexOf('const handleSaveLine = async');
  const saveEnd = payrollSource.indexOf('const handleRunAction = async', saveStart);
  const saveHandler = payrollSource.slice(saveStart, saveEnd);

  assert.match(payrollSource, /lineDraftsByLineId/);
  assert.match(payrollSource, /dirtyLineIds/);
  assert.match(saveHandler, /setSelectedRunDetail\(updatedDetail\)/);
  assert.doesNotMatch(saveHandler, /setIsRunDialogOpen\(false\)/);
});

test('Los flujos fiscales suspenden el detalle antes de abrir una vista secundaria', () => {
  const payrollSource = readFileSync(resolve(moduleRoot, 'Payroll/Payroll.tsx'), 'utf8');
  const reportingStart = payrollSource.indexOf('const openGovernmentReporting');
  const reportingEnd = payrollSource.indexOf('const loadColombiaSetup', reportingStart);
  const colombiaStart = payrollSource.indexOf('const openColombiaSetup');
  const colombiaEnd = payrollSource.indexOf('const handleSaveColombiaSetup', colombiaStart);

  assert.match(payrollSource.slice(reportingStart, reportingEnd), /setIsRunDialogOpen\(false\)/);
  assert.match(payrollSource.slice(colombiaStart, colombiaEnd), /setIsRunDialogOpen\(false\)/);
});
