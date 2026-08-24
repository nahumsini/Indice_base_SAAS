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

test('Recursos Humanos conserva la navegación y el estado operativo entre pestañas', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'HumanResources.tsx'), 'utf8');
  const employeesSource = readFileSync(resolve(moduleRoot, 'Employees/Employees.tsx'), 'utf8');

  assert.match(moduleSource, /import \{ Activity,/);
  assert.match(moduleSource, /visitedTabIds/);
  assert.match(moduleSource, /mode=\{tab\.id === activeTab \? 'visible' : 'hidden'\}/);
  assert.match(moduleSource, /tabScrollPositionsRef/);
  assert.match(employeesSource, /useWorkspaceNavigationMemory\(\{/);
  assert.match(employeesSource, /moduleKey: 'human-resources'/);
  assert.match(employeesSource, /tabKey: 'collaborators'/);
  ['searchQuery', 'unitFilter', 'businessFilter', 'departmentFilter', 'statusFilter', 'sortColumn', 'currentPage', 'pageSize'].forEach((field) => {
    assert.match(employeesSource, new RegExp(`${field}:`));
  });
});

test('Colaboradores inicia con una vista operativa compacta y personalizable', () => {
  const constantsSource = readFileSync(resolve(moduleRoot, 'Employees/constants/employees.constants.ts'), 'utf8');
  const columnsHookSource = readFileSync(resolve(moduleRoot, 'Employees/hooks/useEmployeesColumns.ts'), 'utf8');
  const columnsUtilsSource = readFileSync(resolve(moduleRoot, 'Employees/utils/employees.utils.ts'), 'utf8');
  const actionModalsSource = readFileSync(resolve(moduleRoot, 'Employees/components/EmployeesActionModals.tsx'), 'utf8');

  assert.match(constantsSource, /columnsStorageKey = 'rh-colaboradores-columns-v8'/);
  assert.match(constantsSource, /legacyColumnsStorageKeys = \['rh-colaboradores-columns-v7'\]/);
  assert.match(constantsSource, /id: 'employee',[\s\S]*?visible: true,[\s\S]*?locked: true/);
  assert.match(constantsSource, /id: 'employeeNumber',[\s\S]*?visible: false/);

  ['position', 'department', 'unit', 'status'].forEach((columnId) => {
    assert.match(constantsSource, new RegExp(`id: '${columnId}', label: [^\\n]+ visible: true`));
  });

  ['firstName', 'lastName', 'email', 'phone', 'business', 'salary', 'payPeriod'].forEach((columnId) => {
    assert.match(constantsSource, new RegExp(`id: '${columnId}', label: [^\\n]+ visible: false`));
  });

  assert.match(columnsUtilsSource, /allStoredColumnsVisible/);
  assert.match(columnsUtilsSource, /saveEmployeesColumns/);
  assert.doesNotMatch(columnsHookSource, /setItem\(columnsStorageKey/);
  assert.match(columnsHookSource, /saveEmployeesColumns\(nextColumns\)/);
  assert.match(actionModalsSource, /defaultColumns=\{defaultColumns\}/);
});

test('Colaboradores ofrece integración masiva validada y atómica', () => {
  const employeesSource = readFileSync(resolve(moduleRoot, 'Employees/Employees.tsx'), 'utf8');
  const headerSource = readFileSync(resolve(moduleRoot, 'Employees/components/EmployeesHeaderActions.tsx'), 'utf8');
  const modalSource = readFileSync(resolve(moduleRoot, 'Employees/components/EmployeeBulkIntegrationModal.tsx'), 'utf8');
  const apiSource = readFileSync(resolve(root, 'src/app/api/humanResources.ts'), 'utf8');

  assert.match(headerSource, /bulkIntegrationLabel/);
  assert.match(employeesSource, /createHrUsersBulk/);
  assert.match(modalSource, /Pega desde Excel/);
  assert.match(modalSource, /Ninguna fila se guardará si existe un error/);
  assert.match(modalSource, /remaining_seats/);
  assert.match(apiSource, /hrUserCreate}\/bulk/);
});

test('Recursos Humanos usa apiClient con CSRF para APIs protegidas no nomina', () => {
  const apiClientSource = readFileSync(resolve(root, 'src/app/lib/apiClient.ts'), 'utf8');
  const apiSources = {
    humanResources: readFileSync(resolve(root, 'src/app/api/humanResources.ts'), 'utf8'),
    assets: readFileSync(resolve(root, 'src/app/api/HumanResources/assets.ts'), 'utf8'),
    permissions: readFileSync(resolve(root, 'src/app/api/HumanResources/permissions.ts'), 'utf8'),
    incentives: readFileSync(resolve(root, 'src/app/api/HumanResources/incentives.ts'), 'utf8'),
  };

  assert.match(apiClientSource, /const mutationMethods = new Set\(\['POST', 'PUT', 'PATCH', 'DELETE'\]\)/);
  assert.match(apiClientSource, /headers\.set\('X-CSRF-Token', csrfToken\)/);
  Object.entries(apiSources).forEach(([name, source]) => {
    assert.doesNotMatch(source, /fetch\(\s*(?:buildApiUrl\()?['"`]\/api\/v1\/hr/, `${name} no debe usar fetch directo contra APIs HR protegidas`);
  });

  assert.match(apiSources.humanResources, /createAttendanceControlLocation[\s\S]*apiClient[\s\S]*method: "POST"/);
  assert.match(apiSources.humanResources, /presignRecordAttachmentUpload[\s\S]*apiClient[\s\S]*method: "POST"/);
  assert.match(apiSources.assets, /createAsset[\s\S]*apiClient[\s\S]*method: 'POST'/);
  assert.match(apiSources.permissions, /approvePermission[\s\S]*apiClient[\s\S]*method: 'POST'/);
  assert.match(apiSources.incentives, /create\(payload[\s\S]*apiClient[\s\S]*method: 'POST'/);
});

test('Activos procesa la baja una sola vez y no la ofrece para registros inactivos', () => {
  const assetsSource = readFileSync(resolve(moduleRoot, 'Assets/Assets.tsx'), 'utf8');

  assert.match(assetsSource, /deactivationInFlightRef\.current/);
  assert.match(assetsSource, /confirmDisabled=\{isSubmitting\}/);
  assert.equal(
    [...assetsSource.matchAll(/asset\.status !== 'inactive'/g)].length,
    2,
    'La acción de baja debe ocultarse en las vistas móvil y de escritorio para activos inactivos',
  );
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
