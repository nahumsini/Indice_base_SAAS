import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/Kpis');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('KPIs respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('KPIs conserva rutas, reportes y Modo aprendiz', () => {
  const moduleSource = readFileSync(resolve(moduleRoot, 'Kpis.tsx'), 'utf8');
  const localeSource = readFileSync(resolve(root, 'src/app/locales/kpis.ts'), 'utf8');

  assert.match(moduleSource, /useRoutedModuleTab/);
  assert.match(moduleSource, /<LearningModeHeaderActionsProvider/);
  assert.match(moduleSource, /<SimpleModuleLearningGuide/);
  assert.match(moduleSource, /InformesContables/);
  assert.match(moduleSource, /InformesAutomatizados/);
  assert.match(localeSource, /kpis: 'Matrices'/);
  assert.match(moduleSource, /icon: '🧩'/);
  assert.match(moduleSource, /icon: '📑'/);
  assert.match(moduleSource, /icon: '⚙️'/);
  assert.match(moduleSource, /icon: tab\.icon/);
  const automationSource = readFileSync(resolve(moduleRoot, 'InformesAutomatizados/InformesAutomatizados.tsx'), 'utf8');
  assert.match(automationSource, /<IndiceTitleBar/);
  assert.match(automationSource, /icon="⚙️"/);
  assert.doesNotMatch(automationSource, /<LearningModeTitleBarBridge/);
  assert.doesNotMatch(automationSource, /kpisExecutiveData|financialStatements|compositeKpis|reportPackages/);
  assert.match(automationSource, /instantánea inmutable/);
  const matricesSource = readFileSync(resolve(moduleRoot, 'KPIs/KPIs.tsx'), 'utf8');
  const accountingSource = readFileSync(resolve(moduleRoot, 'InformesContables/InformesContables.tsx'), 'utf8');
  assert.match(matricesSource, /icon="🧩"/);
  assert.match(accountingSource, /icon="📑"/);
});

test('Estados financieros usa el motor contable real y las vistas canónicas de Indice', () => {
  const workspaceSource = readFileSync(resolve(moduleRoot, 'InformesContables/InformesContables.tsx'), 'utf8');
  const viewsSource = readFileSync(resolve(moduleRoot, 'InformesContables/AccountingReportViews.tsx'), 'utf8');
  const overviewSource = readFileSync(resolve(moduleRoot, 'InformesContables/AccountingOverviewView.tsx'), 'utf8');
  const drilldownSource = readFileSync(resolve(moduleRoot, 'InformesContables/AccountingDrilldownModal.tsx'), 'utf8');
  const periodModalsSource = readFileSync(resolve(moduleRoot, 'InformesContables/AccountingPeriodModals.tsx'), 'utf8');
  const trialSource = readFileSync(resolve(moduleRoot, 'InformesContables/AccountingTrialBalanceView.tsx'), 'utf8');
  const apiSource = readFileSync(resolve(moduleRoot, 'InformesContables/accountingReportsApi.ts'), 'utf8');
  const translationsSource = readFileSync(resolve(moduleRoot, 'InformesContables/accountingReportTranslations.ts'), 'utf8');
  const documentCanvasSource = readFileSync(resolve(moduleRoot, 'InformesContables/AccountingDocumentCanvas.tsx'), 'utf8');
  const documentModalSource = readFileSync(resolve(moduleRoot, 'components/AnalyticsDocumentPreviewModal.tsx'), 'utf8');

  assert.match(workspaceSource, /IndiceTitleBar/);
  assert.match(workspaceSource, /IndiceFilterBar/);
  assert.match(workspaceSource, /IndiceWorkspaceNavigation<AccountingViewId>/);
  assert.match(workspaceSource, /useWorkspaceNavigationMemory/);
  assert.match(workspaceSource, /accountingReportsApi\.synchronize/);
  assert.match(workspaceSource, /accountingReportsApi\.close/);
  assert.match(workspaceSource, /accountingReportsApi\.reopen/);
  assert.match(workspaceSource, /ACCOUNTING_NOT_READY/);
  assert.match(workspaceSource, /'overview'/);
  assert.match(workspaceSource, /'close-quality'/);
  assert.match(workspaceSource, /setDocumentMode\('export'\)/);
  assert.match(workspaceSource, /setDocumentMode\('print'\)/);
  assert.match(workspaceSource, /<AccountingDocumentCanvas/);
  assert.doesNotMatch(workspaceSource, /window\.prompt|window\.confirm/);
  assert.doesNotMatch(workspaceSource, /financialStatements/);
  assert.match(viewsSource, /AccountingReadiness/);
  assert.match(viewsSource, /TrialBalanceView/);
  assert.match(viewsSource, /QualityView/);
  assert.match(apiSource, /\/api\/v1\/kpis\/accounting-reports/);
  assert.match(apiSource, /decisionReady/);
  assert.match(apiSource, /\/analytics/);
  assert.match(apiSource, /\/drilldown/);
  assert.match(overviewSource, /AccountingOverviewView/);
  assert.match(overviewSource, /ResponsiveContainer/);
  assert.match(drilldownSource, /modalType="operational-workspace"/);
  assert.match(periodModalsSource, /IndiceConfirmationDialog/);
  assert.match(periodModalsSource, /modalType="standard-form"/);
  assert.match(trialSource, /IndiceOperationalTable/);
  assert.match(trialSource, /DataTablePagination/);
  assert.match(documentCanvasSource, /report\.tables\.map/);
  assert.match(documentModalSource, /modalType="operational-workspace"/);
  assert.match(documentModalSource, /downloadVisualDocument/);
  assert.match(documentModalSource, /printVisualDocument/);
  for (const locale of ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.match(translationsSource, new RegExp(`'${locale}'`));
  }
});

test('el diagnóstico Índice usa los contratos ejecutivos vigentes, cuatro sectores y calidad fail-closed', () => {
  const panelSource = readFileSync(resolve(moduleRoot, 'KPIs/KPIs.tsx'), 'utf8');
  const portfolioSource = readFileSync(resolve(moduleRoot, 'KPIs/ProductPortfolioMatrix.tsx'), 'utf8');
  const decisionMatrixSource = readFileSync(resolve(moduleRoot, 'KPIs/DecisionMatrixViews.tsx'), 'utf8');
  const workspaceViewsSource = readFileSync(resolve(moduleRoot, 'KPIs/DiagnosisWorkspaceViews.tsx'), 'utf8');
  const workspaceTranslationsSource = readFileSync(resolve(moduleRoot, 'KPIs/diagnosisWorkspaceTranslations.ts'), 'utf8');
  const apiSource = readFileSync(resolve(moduleRoot, 'KPIs/executivePanelApi.ts'), 'utf8');
  const typesSource = readFileSync(resolve(moduleRoot, 'KPIs/types.ts'), 'utf8');
  const translationsSource = readFileSync(resolve(moduleRoot, 'KPIs/diagnosisTranslations.ts'), 'utf8');
  const portfolioTranslationsSource = readFileSync(resolve(moduleRoot, 'KPIs/productPortfolioTranslations.ts'), 'utf8');
  const decisionMatrixTranslationsSource = readFileSync(resolve(moduleRoot, 'KPIs/decisionMatrixTranslations.ts'), 'utf8');

  assert.match(panelSource, /usePreferredBusinessCurrency/);
  assert.match(panelSource, /IndiceTitleBar/);
  assert.match(panelSource, /IndiceFilterBar/);
  assert.match(panelSource, /IndiceWorkspaceNavigation<DiagnosisViewId>/);
  assert.match(panelSource, /variant="sections"/);
  assert.match(panelSource, /useWorkspaceNavigationMemory/);
  assert.match(panelSource, /activeView: 'analysis'/);
  assert.match(panelSource, /DiagnosisSummaryView/);
  assert.match(panelSource, /DiagnosisSectorView/);
  assert.match(panelSource, /ProductPortfolioMatrix/);
  assert.match(panelSource, /BusinessHealthMatrixView/);
  assert.match(panelSource, /ProductProfitabilityMatrixView/);
  assert.match(panelSource, /InventoryIntelligenceMatrixView/);
  assert.match(panelSource, /DiagnosisMapView/);
  assert.match(panelSource, /CrossSectorPatternsView/);
  assert.match(panelSource, /ExecutiveSourcesView/);
  assert.match(panelSource, /domains\.contractVersion === '2\.2'/);
  assert.match(panelSource, /diagnosis\.contractVersion === '1\.1'/);
  assert.match(panelSource, /'receivables'/);
  assert.match(panelSource, /'pointOfSale'/);
  assert.match(panelSource, /workspaceCopy\.actions\.exportView/);
  assert.match(panelSource, /workspaceCopy\.actions\.printView/);
  assert.match(panelSource, /setDocumentMode\('export'\)/);
  assert.match(panelSource, /setDocumentMode\('print'\)/);
  assert.match(panelSource, /<AnalyticsDocumentPreviewModal/);
  assert.match(panelSource, /<DiagnosisSummaryView[^>]+unified/);
  assert.doesNotMatch(panelSource, /id: 'sectors' as const/);
  assert.match(panelSource, /onNavigate\('sales'\)/);
  assert.match(panelSource, /hasExecutiveDecisionContracts\(response\)/);
  assert.match(panelSource, /setData\(null\)/);
  assert.match(workspaceViewsSource, /data-testid="diagnosis-summary-view"/);
  assert.match(workspaceViewsSource, /data-testid="diagnosis-sector-view"/);
  assert.match(workspaceViewsSource, /data-testid="executive-sources-view"/);
  assert.match(workspaceViewsSource, /domain\.sourceContract/);
  assert.match(workspaceViewsSource, /onNavigate\(domain\.actionRoute\)/);
  assert.match(workspaceViewsSource, /function MaturityJourney/);
  assert.match(workspaceViewsSource, /role="progressbar"/);
  assert.match(workspaceViewsSource, /getMaturityReading/);
  assert.match(workspaceViewsSource, /\['strength', 'opportunity', 'symptom', 'data_gap'\]/);
  assert.match(workspaceViewsSource, /workspaceCopy\.swot\.acronym/);
  assert.match(workspaceViewsSource, /ownerModule/);
  assert.match(workspaceViewsSource, /onNavigate\(ownerModule\)/);
  assert.match(apiSource, /preferredCurrency/);
  assert.match(apiSource, /organizationOptions/);
  assert.match(typesSource, /ExecutiveKpiDomains/);
  assert.match(typesSource, /ExecutiveKpiDiagnosis/);
  assert.match(typesSource, /ownerModule/);
  assert.match(typesSource, /sourceContract/);
  assert.match(typesSource, /actionRoute/);
  assert.match(typesSource, /ExecutiveDiagnosisSectorId/);
  assert.match(typesSource, /decisionReady/);
  assert.match(typesSource, /coveragePercent/);
  assert.match(typesSource, /data_gap/);
  assert.match(typesSource, /ExecutiveProductPortfolio/);
  assert.match(typesSource, /ProductPortfolioQuadrant/);
  assert.match(typesSource, /productPortfolioContract/);
  assert.match(typesSource, /decisionMatrixContract/);
  assert.match(typesSource, /ExecutiveDecisionMatrices/);
  assert.match(typesSource, /contributionMarginPercent/);
  assert.match(portfolioSource, /data-testid="product-portfolio-matrix"/);
  assert.match(portfolioSource, /relativeCategorySharePercent/);
  assert.match(portfolioSource, /portfolioSharePercent/);
  assert.match(portfolioSource, /growthPercent/);
  assert.match(portfolioSource, /aria-pressed/);
  assert.match(portfolioSource, /md:hidden/);
  assert.match(portfolioSource, /onOpenSales/);
  assert.match(portfolioSource, /unclassified/);
  assert.match(decisionMatrixSource, /dataTestId="business-health-matrix"/);
  assert.match(decisionMatrixSource, /dataTestId="product-profitability-matrix"/);
  assert.match(decisionMatrixSource, /dataTestId="inventory-intelligence-matrix"/);
  assert.match(decisionMatrixSource, /role="tabpanel"/);
  assert.match(decisionMatrixSource, /aria-pressed/);
  assert.match(decisionMatrixSource, /quality\.issues/);
  assert.match(decisionMatrixTranslationsSource, /Motores del negocio/);
  assert.match(decisionMatrixTranslationsSource, /Ganadores/);
  assert.match(decisionMatrixTranslationsSource, /Riesgo de quiebre/);
  assert.match(workspaceTranslationsSource, /acronym: 'FODA'/);
  assert.match(workspaceTranslationsSource, /stages: \['Inicial', 'Reactiva', 'Estructurada', 'Gestionada', 'Evolutiva'\]/);
  for (const locale of ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    assert.match(translationsSource, new RegExp(`'${locale}'`));
    assert.match(portfolioTranslationsSource, new RegExp(`'${locale}'`));
    assert.match(workspaceTranslationsSource, new RegExp(`'${locale}'`));
    assert.match(decisionMatrixTranslationsSource, new RegExp(`'${locale}'`));
  }
});
