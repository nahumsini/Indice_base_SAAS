import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const moduleRoot = resolve(root, 'src/app/BasicModules/Dashboard');
const sourceExtensions = /\.(?:js|jsx|ts|tsx)$/;
const prohibitedTypography = /\bfont-(?:semibold|bold|extrabold|black)\b|\buppercase\b|\btracking-(?:wide|\[[^\]]+\])/g;
const accessibleCatalogSource = readFileSync(
  resolve(root, 'src/app/hooks/useAccessibleModuleCatalog.ts'),
  'utf8',
);
const appSource = readFileSync(resolve(root, 'src/app/App.tsx'), 'utf8');
const apiClientSource = readFileSync(resolve(root, 'src/app/lib/apiClient.ts'), 'utf8');
const platformAdminApiSource = readFileSync(resolve(root, 'src/app/api/platformAdmin.ts'), 'utf8');
const businessProfileApiSource = readFileSync(
  resolve(root, 'src/app/api/HomePanel/BusinessProfile/businessProfile.ts'),
  'utf8',
);
const dashboardApiSource = readFileSync(resolve(root, 'src/app/api/dashboard.ts'), 'utf8');
const mainDashboardSource = readFileSync(
  resolve(root, 'src/app/Dashboard/MainDashboard.tsx'),
  'utf8',
);
const dashboardDataSource = readFileSync(
  resolve(root, 'src/app/Dashboard/dashboardData.ts'),
  'utf8',
);
const dashboardLiveKpisSource = readFileSync(
  resolve(root, 'src/app/Dashboard/hooks/useDashboardLiveKpis.ts'),
  'utf8',
);
const kpiCardSource = readFileSync(
  resolve(root, 'src/app/components/KPICard.tsx'),
  'utf8',
);
const globalHeaderSource = readFileSync(resolve(root, 'src/app/components/Header.tsx'), 'utf8');
const panelInicialHeaderSource = readFileSync(
  resolve(moduleRoot, 'components/PanelInicialHeader.tsx'),
  'utf8',
);
const panelInicialSource = readFileSync(resolve(moduleRoot, 'PanelInicial.tsx'), 'utf8');
const dashboardTitleBarSource = readFileSync(
  resolve(moduleRoot, 'components/DashboardTitleBar.tsx'),
  'utf8',
);
const businessStructureSource = readFileSync(
  resolve(moduleRoot, 'BusinessStructure/BusinessStructure.tsx'),
  'utf8',
);
const businessProfileSource = readFileSync(
  resolve(moduleRoot, 'BusinessProfile/BusinessProfile.tsx'),
  'utf8',
);
const operationTypeSectionSource = readFileSync(
  resolve(moduleRoot, 'BusinessStructure/components/OperationTypeSection.tsx'),
  'utf8',
);
const unitsSectionSource = readFileSync(
  resolve(moduleRoot, 'BusinessStructure/components/UnitsSection.tsx'),
  'utf8',
);
const personalPerformanceApiSource = readFileSync(
  resolve(root, 'src/app/api/HomePanel/PersonalPerformance/personalPerformance.ts'),
  'utf8',
);
const personalPerformanceSource = readFileSync(
  resolve(moduleRoot, 'PersonalPerformance/PersonalPerformance.tsx'),
  'utf8',
);
const consultingSource = readFileSync(
  resolve(moduleRoot, 'Consulting/Consulting.tsx'),
  'utf8',
);
const consultingApiSource = readFileSync(
  resolve(moduleRoot, 'Consulting/consultingApi.ts'),
  'utf8',
);
const consultingTranslationsSource = readFileSync(
  resolve(moduleRoot, 'Consulting/translations/es-MX.ts'),
  'utf8',
);
const consultingAdminSource = readFileSync(
  resolve(root, 'src/app/PlatformAdmin/ConsultingAdminTab.tsx'),
  'utf8',
);
const profileSource = readFileSync(resolve(moduleRoot, 'Profile/Profile.tsx'), 'utf8');
const favoritesBarSource = readFileSync(resolve(root, 'src/app/components/FavoritesBar.tsx'), 'utf8');
const indiceModuleShellSource = readFileSync(resolve(root, 'src/app/components/frontend-os/IndiceModuleShell.tsx'), 'utf8');

function collectFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? collectFiles(child) : sourceExtensions.test(entry.name) ? [child] : [];
  });
}

test('Panel Inicial respeta la escala tipográfica del Frontend Engine V2', () => {
  const violations = collectFiles(moduleRoot).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(prohibitedTypography)].map((match) => ({
      file: relative(root, file).replaceAll('\\', '/'),
      token: match[0],
    }));
  });

  assert.deepEqual(violations, [], `Tipografía fuera del estándar:\n${violations.map(({ file, token }) => `${file}: ${token}`).join('\n')}`);
});

test('Panel Inicial conserva navegación, permisos y Modo aprendiz', () => {
  assert.match(panelInicialSource, /useRoutedModuleTab/);
  assert.match(panelInicialSource, /canAccessHomePanelTab/);
  assert.match(panelInicialSource, /<LearningModeHeaderActionsProvider/);
  assert.match(panelInicialSource, /<PanelInicialHeader/);
  assert.doesNotMatch(panelInicialSource, /const PersonalPerformance = lazy/);
  assert.match(panelInicialSource, /'personal-performance': 'business-profile'/);
});

test('Perfil usa captura compacta, guardado explícito y seguridad progresiva', () => {
  assert.match(profileSource, /actions=\{/);
  assert.match(profileSource, /void handleSaveProfile\(\)/);
  assert.match(profileSource, /profileCompletion/);
  assert.match(profileSource, /<details className="group/);
  assert.match(profileSource, /xl:grid-cols-2/);
  assert.doesNotMatch(profileSource, /PROFILE_AUTO_SAVE_DEBOUNCE_MS/);
  assert.doesNotMatch(profileSource, /runWithMinimumDuration\(configCenterApi\.getCurrentUser\(\)\)/);
  assert.doesNotMatch(profileSource, /<input type="email"[^>]*readOnly/);
  assert.doesNotMatch(profileSource, /profileCopy\.sections\.preferencesTitle/);
  assert.doesNotMatch(profileSource, /updateFormValue\('preferredLanguage'/);
});

test('las vistas de Panel Inicial usan la barra de título canónica', () => {
  assert.match(dashboardTitleBarSource, /import \{ IndiceTitleBar \}/);
  assert.match(dashboardTitleBarSource, /<IndiceTitleBar/);
  assert.match(dashboardTitleBarSource, /tone="blue"/);
  assert.doesNotMatch(dashboardTitleBarSource, /LearningModeTitleBarBridge/);
  assert.doesNotMatch(dashboardTitleBarSource, /helper/);
});

test('Estructura empresarial prioriza captura simple sobre explicación repetida', () => {
  assert.ok(
    businessStructureSource.indexOf('<OperationTypeSection') < businessStructureSource.indexOf('<BusinessIdentitySection'),
    'El tipo de operación debe elegirse antes de capturar la identidad empresarial',
  );
  assert.doesNotMatch(operationTypeSectionSource, /structurePreviewLines\.join/);
  assert.doesNotMatch(operationTypeSectionSource, /simpleExample/);
  assert.doesNotMatch(operationTypeSectionSource, /multiExample/);
  assert.match(unitsSectionSource, /\+ \{structure\.actions\.createUnit\}/);
  assert.equal((unitsSectionSource.match(/onClick=\{onCreateUnidad\}/g) ?? []).length, 1);
});

test('Corporate office vive fuera de las unidades operativas', () => {
  assert.match(businessStructureSource, /name: CORPORATE_OFFICE_UNIT_NAME/);
  assert.match(businessStructureSource, /negocios: \[\]/);
  assert.match(businessStructureSource, /return \[corporateOffice, \.\.\.operationalUnits\]/);
  assert.match(businessStructureSource, /!isCorporateOfficeBusiness\(negocio, companyName, index\)/);
  assert.match(unitsSectionSource, /const corporateOffice = unidades\.find/);
  assert.match(unitsSectionSource, /const operationalUnits = unidades\.filter/);
  assert.match(unitsSectionSource, /const isSimple = estructuraType === 'simple'/);
  assert.match(unitsSectionSource, /!isSimple && operationalUnits\.map/);
});

test('el diagnóstico empresarial usa un flujo guiado de una etapa a la vez', () => {
  assert.match(businessProfileSource, /firstIncompletePillar/);
  assert.match(businessProfileSource, /handleStartGuidedFlow/);
  assert.match(businessProfileSource, /handleGuidedNext/);
  assert.match(businessProfileSource, /activeSelectedAnswer === undefined/);
  assert.match(businessProfileSource, /isDiagnosisComplete && !activePillar/);
  assert.doesNotMatch(businessProfileSource, /grid grid-cols-1 gap-6 md:grid-cols-2/);
  assert.doesNotMatch(businessProfileSource, /diagnosisCopy\.doAgain/);
});

test('rendimiento personal conserva el flujo privado sin consulta nominal de terceros', () => {
  assert.match(personalPerformanceSource, /firstIncompleteSection/);
  assert.match(personalPerformanceSource, /handleStartGuidedFlow/);
  assert.match(personalPerformanceSource, /handleGuidedNext/);
  assert.match(personalPerformanceSource, /handleGuidedPrevious/);
  assert.match(personalPerformanceSource, /activeSelectedAnswer === undefined/);
  assert.match(personalPerformanceSource, /isPerformanceComplete && !activeSection/);
  assert.doesNotMatch(personalPerformanceSource, /TeamPerformancePanel/);
  assert.doesNotMatch(personalPerformanceSource, /getTeamProfile/);
  assert.doesNotMatch(personalPerformanceSource, /<div className="hidden">/);
  assert.doesNotMatch(personalPerformanceSource, /getColorClasses/);
});

test('Consultoría conserva el flujo comercial de solicitud y confirmación', () => {
  assert.match(consultingSource, /<DashboardTitleBar emoji="🤝"/);
  assert.match(consultingSource, /consultingApi\.create/);
  assert.match(consultingSource, /preferredStartAt/);
  assert.match(consultingSource, /alternativeStartAt/);
  assert.match(consultingSource, /consultingApi\.cancel/);
  assert.match(consultingSource, /workspace\.appointments/);
  assert.match(consultingSource, /additional_session_amount_cents/);
  assert.match(consultingApiSource, /\/api\/v1\/consulting\/appointments/);
  assert.match(consultingSource, /consultationMode/);
  assert.match(consultingSource, /serviceLocationCode/);
  assert.match(consultingSource, /meeting_link_available/);
  assert.match(consultingTranslationsSource, /La solicitud quedará “Por confirmar”/);
  assert.match(consultingTranslationsSource, /Nunca estás solo mientras haces crecer tu empresa/);
  assert.match(consultingTranslationsSource, /Consultoría de negocios/);
  assert.match(consultingAdminSource, /operations = platformAdminApi/);
  assert.match(consultingAdminSource, /operations\.getConsulting\(\)/);
  assert.match(consultingAdminSource, /operations\.updateConsultingAppointment\(/);
  assert.match(consultingAdminSource, /operations\.updateConsultingLocation/);
  assert.match(platformAdminApiSource, /getConsulting: \(\) => apiClient<PlatformConsultingWorkspace>/);
  assert.match(platformAdminApiSource, /updateConsultingAppointment: \(appointmentId: number, payload: PlatformConsultingAppointmentUpdate\)/);
  assert.match(platformAdminApiSource, /updateConsultingLocation: \(locationId: number, payload:/);
  assert.match(consultingAdminSource, /mailto:/);
  assert.match(consultingAdminSource, /tel:/);
  assert.doesNotMatch(consultingTranslationsSource, /USD 89/);
  assert.doesNotMatch(consultingSource, /BusinessProfile|PersonalPerformance|diagnóstico empresarial/);
});

test('el header muestra una sola foto de perfil en el acceso de cuenta', () => {
  const greetingSection = globalHeaderSource.split('{/* Sección derecha - Acciones */}')[0] ?? '';

  assert.match(globalHeaderSource, /Sección izquierda - Saludo/);
  assert.doesNotMatch(greetingSection, /src=\{currentUserAvatarUrl\}/);
});

test('el shell conserva header y navegación contextual mientras el contenido se desplaza', () => {
  assert.match(appSource, /flex h-dvh min-h-0 flex-col overflow-hidden/);
  assert.match(appSource, /<main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">/);
  assert.match(panelInicialHeaderSource, /relative z-30 shrink-0/);
  assert.match(panelInicialSource, /flex h-full min-h-0 flex-col overflow-hidden/);
  assert.match(panelInicialSource, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.match(panelInicialHeaderSource, /<FavoritesBar[\s\S]*compact/);
  assert.match(panelInicialHeaderSource, /nav className="mt-1\.5 overflow-x-auto"/);
  assert.match(panelInicialHeaderSource, />\s*🏠\s*</);
  assert.match(panelInicialHeaderSource, /activeTab\.emoji/);
  assert.doesNotMatch(panelInicialHeaderSource, /sm:py-6/);
  assert.match(favoritesBarSource, /fill-amber-400 text-amber-500/);
  assert.match(favoritesBarSource, /\{visibleModules\.map/);
  assert.doesNotMatch(favoritesBarSource, /visibleModules\.slice\(0, 3\)/);
  assert.doesNotMatch(panelInicialHeaderSource, /backLabel/);
});

test('el shell global homologa contexto, favoritos, colores y pestañas de módulos', () => {
  assert.match(indiceModuleShellSource, /flex h-full min-h-0 flex-col overflow-hidden/);
  assert.match(indiceModuleShellSource, /relative z-30 shrink-0/);
  assert.match(indiceModuleShellSource, /activeTabData\.icon/);
  assert.match(indiceModuleShellSource, /<FavoritesBar[\s\S]*compact/);
  assert.match(indiceModuleShellSource, /backgroundColor: theme\.primary/);
  assert.match(indiceModuleShellSource, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.doesNotMatch(indiceModuleShellSource, /onClick=\{\(\) => onNavigate\(\)\}/);
});

test('el registro global gobierna módulos, rutas y KPIs sin reconstruir módulos apagados', () => {
  assert.match(accessibleCatalogSource, /includeMissingFallbacks:\s*false/);
  assert.match(accessibleCatalogSource, /setAvailableModules\(\[\]\)/);
  assert.doesNotMatch(accessibleCatalogSource, /FRONTEND_OWNED_BASIC_MODULE_ROUTES/);
  assert.doesNotMatch(accessibleCatalogSource, /canUseDefaultCatalogFallback/);

  assert.doesNotMatch(appSource, /FRONTEND_OWNED_BASIC_MODULE_ROUTES/);
  assert.doesNotMatch(appSource, /routes\.size === 0 && isAdminAccessRole/);
  assert.match(appSource, /setAllowedModuleRoutes\(new Set<PageId>\(\)\)/);

  assert.match(mainDashboardSource, /dashboardKpiModuleRouteById/);
  assert.match(mainDashboardSource, /accessibleModuleRoutes\.has\(moduleRoute\)/);
});

test('Panel Inicial usa apiClient para todas las APIs protegidas por CSRF', () => {
  assert.match(apiClientSource, /const mutationMethods = new Set\(\['POST', 'PUT', 'PATCH', 'DELETE'\]\)/);
  assert.match(apiClientSource, /headers\.set\('X-CSRF-Token', csrfToken\)/);
  assert.match(apiClientSource, /csrf\?: boolean/);
  assert.match(apiClientSource, /AUTH_CSRF_PATH = '\/api\/v1\/auth\/csrf'/);
  assert.match(apiClientSource, /fetchCsrfToken/);

  assert.match(dashboardApiSource, /listModules[\s\S]*apiClient<BackendDashboardModule\[\]>[\s\S]*csrf: true/);
  assert.match(dashboardApiSource, /listUnits[\s\S]*apiClient<ListResponse<BackendUnit>>[\s\S]*csrf: true/);
  assert.match(dashboardApiSource, /listBusinesses[\s\S]*apiClient<ListResponse<BackendBusiness>>[\s\S]*csrf: true/);

  assert.match(businessProfileApiSource, /import \{ apiClient \}/);
  assert.match(businessProfileApiSource, /getBusinessProfile[\s\S]*apiClient<BusinessProfileResponse>[\s\S]*csrf: true/);
  assert.match(businessProfileApiSource, /saveBusinessProfile[\s\S]*apiClient<BusinessProfileResponse>[\s\S]*method: 'PUT'[\s\S]*csrf: true/);
  assert.doesNotMatch(businessProfileApiSource, /\bfetch\(/);

  assert.match(personalPerformanceApiSource, /import \{ apiClient \}/);
  assert.match(personalPerformanceApiSource, /getPersonalPerformance[\s\S]*apiClient<PersonalPerformanceResponse>[\s\S]*csrf: true/);
  assert.match(personalPerformanceApiSource, /savePersonalPerformance[\s\S]*apiClient<PersonalPerformanceResponse>[\s\S]*method: 'PUT'[\s\S]*csrf: true/);
  assert.doesNotMatch(personalPerformanceApiSource, /\bfetch\(/);
});

test('el dashboard usa el contrato ejecutivo y nunca inventa tendencias', () => {
  assert.match(dashboardLiveKpisSource, /executivePanelApi\.get/);
  assert.match(dashboardLiveKpisSource, /response\.domains\.items/);
  assert.match(dashboardLiveKpisSource, /metric\.comparisonAvailable/);
  assert.match(dashboardLiveKpisSource, /metric\.percentChange/);
  assert.match(dashboardLiveKpisSource, /catch \{[\s\S]*executiveMetricCards\(copy\)\.forEach[\s\S]*copy\.kpiComparison\.unavailable/);
  assert.doesNotMatch(dashboardLiveKpisSource, /change:\s*copy\.kpis\.(?:monthlyRevenue|averageTicket|salesConversion|monthlyExpenses|taskCompletionRate|overdueTasks)\.change/);
  assert.doesNotMatch(dashboardLiveKpisSource, /salesApi\.kpis|listProcessTaskKpis|loadFinanceDashboardOverview/);

  assert.match(kpiCardSource, /trend\?: 'up' \| 'down' \| 'flat'/);
  assert.match(kpiCardSource, /resolvedTrend === 'up'/);
  assert.match(kpiCardSource, /resolvedTone/);
});

test('la seleccion inicial prioriza resultados, obligaciones y riesgos operativos', () => {
  const defaults = dashboardDataSource.split('const liveDashboardKpiIds')[0] ?? '';

  assert.match(defaults, /'monthlyRevenue'/);
  assert.match(defaults, /'budgetUtilization'/);
  assert.match(defaults, /'pendingExpenses'/);
  assert.match(defaults, /'overdueExpenses'/);
  assert.match(defaults, /'salesConversion'/);
  assert.match(defaults, /'taskCompletionRate'/);
  assert.match(defaults, /'overdueTasks'/);
  assert.match(defaults, /'lowStockItems'/);
  assert.doesNotMatch(defaults, /'activeEmployees'/);
  assert.doesNotMatch(defaults, /'newHires'/);
  assert.doesNotMatch(defaults, /'completedTasks'/);
  assert.match(mainDashboardSource, /indice\.dashboard\.selectedKpis\.v2/);
});
