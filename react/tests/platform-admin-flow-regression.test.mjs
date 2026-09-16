import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createTypeScriptLoader } from './helpers/loadTypeScript.mjs';
const loadTypeScript = createTypeScriptLoader();
const { defaultAnnualDiscountPercent, stripeEnvironmentLabel } = loadTypeScript(resolve(import.meta.dirname, '../src/app/PlatformAdmin/CatalogWorkspace/commercialOfferPresentation.ts'));

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const page = read("src/app/PlatformAdmin/PlatformAdminPage.tsx");
const customerTable = read(
  "src/app/PlatformAdmin/Customers/CustomersTable.tsx",
);
const customerRow = read(
  "src/app/PlatformAdmin/Customers/CustomerTableRow.tsx",
);
const customerUsersModal = read(
  "src/app/PlatformAdmin/Customers/CustomerUsersModal.tsx",
);
const customerTraceability = read(
  "src/app/PlatformAdmin/Customers/CustomerTraceabilityCell.tsx",
);
const customerTableCopy = read(
  "src/app/PlatformAdmin/Customers/customerTableCopy.ts",
);
const customerTableColumns = read(
  "src/app/PlatformAdmin/Customers/customerTableColumns.ts",
);
const customerTableUtils = read(
  "src/app/PlatformAdmin/Customers/customerTableUtils.ts",
);
const account = read("src/app/PlatformAdmin/AccountCreationModal.tsx");
const activeCatalogSelection = read(
  "src/app/PlatformAdmin/selectActiveCatalogProducts.ts",
);
const distributorContracts = read(
  "src/app/DistributorPortal/contracts-access/ContractsAccessPage.tsx",
);

test("la tabla tolera respuestas antiguas sin tipo de cuenta", () => {
  assert.match(customerRow, /normalizeAccountType\(company\.user_type\)/);
  assert.match(customerRow, /return "SUPER_ADMIN"/);
  assert.match(customerRow, /<UserTypeBadge type=\{accountType\}/);
});

test("distribuidores sólo pueden seleccionar productos de la versión comercial activa", () => {
  assert.match(activeCatalogSelection, /status\.trim\(\)\.toUpperCase\(\) === 'ACTIVE'/);
  assert.match(activeCatalogSelection, /product\.catalog_version_id === activeVersion\.id/);
  assert.match(activeCatalogSelection, /product\.active/);
  assert.match(activeCatalogSelection, /product\.commercially_available !== false/);
  assert.match(distributorContracts, /selectActiveCatalogProducts\(portfolio\.catalog\)/);
  assert.match(distributorContracts, /products=\{catalogProducts\}/);
  assert.match(distributorContracts, /catalogProducts=\{catalogProducts\}/);
  assert.match(page, /selectActiveCatalogProducts\(catalog\)/);
});
const accountFlow = read(
  "src/app/PlatformAdmin/AccountCreation/hooks/useAccountCreationFlow.ts",
);
const accountUtils = read(
  "src/app/PlatformAdmin/AccountCreation/accountCreationUtils.ts",
);
const accountCompanyStep = read(
  "src/app/PlatformAdmin/AccountCreation/components/CompanyStep.tsx",
);
const accountOwnerStep = read(
  "src/app/PlatformAdmin/AccountCreation/components/OwnerStep.tsx",
);
const accountAccessStep = read(
  "src/app/PlatformAdmin/AccountCreation/components/AccessStep.tsx",
);
const trialExtension = read(
  "src/app/PlatformAdmin/Customers/TrialExtensionModal.tsx",
);
const accountSuccess = read(
  "src/app/PlatformAdmin/AccountCreation/components/AccountCreationSuccess.tsx",
);
const quickTestAccount = read(
  "src/app/PlatformAdmin/QuickTestAccount/QuickTestAccountModal.tsx",
);
const quickTestFlow = read(
  "src/app/PlatformAdmin/QuickTestAccount/hooks/useQuickTestAccountFlow.ts",
);
const quickTestUtils = read(
  "src/app/PlatformAdmin/QuickTestAccount/quickTestAccountUtils.ts",
);
const quickTestDetails = read(
  "src/app/PlatformAdmin/QuickTestAccount/components/QuickDetailsStep.tsx",
);
const accountSpanishCopy = read(
  "src/app/PlatformAdmin/AccountCreation/translations/es-MX.ts",
);
const accountFeature = [
  account,
  accountFlow,
  accountUtils,
  accountCompanyStep,
  accountOwnerStep,
  accountAccessStep,
  accountSuccess,
  accountSpanishCopy,
].join("\n");
const accountDraft = read(
  "src/app/PlatformAdmin/accountCreationDraft.ts",
);
const routes = read("src/app/routes.tsx");
const header = read("src/app/components/Header.tsx");
const accountTypeEdit = read("src/app/PlatformAdmin/AccountTypeEditModal.tsx");
const distributorAssignment = read(
  "src/app/PlatformAdmin/DistributorAssignmentModal.tsx",
);
const platformApi = read("src/app/api/platformAdmin.ts");
const allCompanyActivityPanel = read(
  "src/app/PlatformAdmin/AllCompanyActivityPanel.tsx",
);
const company = read("src/app/PlatformAdmin/CompanyAccountDrawer.tsx");
const companyOverview = read(
  "src/app/PlatformAdmin/CompanyAccount/CompanyOverviewTab.tsx",
);
const companyModules = read(
  "src/app/PlatformAdmin/CompanyAccount/CompanyModulesTab.tsx",
);
const companyActivity = read(
  "src/app/PlatformAdmin/CompanyAccount/CompanyActivityTab.tsx",
);
const usersDirectory = read("src/app/PlatformAdmin/UsersDirectoryTab.tsx");
const companyAccess = read("src/app/PlatformAdmin/CompanyAccount/CompanyAccessTab.tsx");
const adjustment = read("src/app/PlatformAdmin/BenefitAdjustmentModal.tsx");
const customerModalPresentation = [
  account,
  accountCompanyStep,
  accountOwnerStep,
  accountAccessStep,
  accountSuccess,
  quickTestAccount,
  quickTestDetails,
  accountTypeEdit,
  distributorAssignment,
  trialExtension,
  adjustment,
  company,
  customerUsersModal,
].join("\n");
const consulting = read("src/app/PlatformAdmin/ConsultingAdminTab.tsx");
const consultingCalendar = read("src/app/PlatformAdmin/ConsultingCalendarView.tsx");
const consultingAvailability = read(
  "src/app/PlatformAdmin/ConsultingAvailabilityModal.tsx",
);
const clientConsulting = read(
  "src/app/BasicModules/Dashboard/Consulting/Consulting.tsx",
);
const consultingApi = read(
  "src/app/BasicModules/Dashboard/Consulting/consultingApi.ts",
);
const session = read(
  "src/app/PlatformAdmin/ConsultingSessions/SessionCreateModal.tsx",
);
const coverage = read(
  "src/app/PlatformAdmin/ConsultingCoverage/CoverageCreateModal.tsx",
);
const moduleWorkOrders = read(
  "src/app/PlatformAdmin/ModuleWorkOrders/useModuleWorkOrders.ts",
);
const systemTickets = read("src/app/SystemTickets/SystemTicketsWorkspace.tsx");
const systemTicketDetail = read("src/app/SystemTickets/SystemTicketDetailModal.tsx");
const systemTicketsApi = read("src/app/SystemTickets/systemTicketsApi.ts");
const moduleAvailabilityWorkspace = read(
  "src/app/PlatformAdmin/CatalogWorkspace/ModuleAvailabilityWorkspace.tsx",
);
const moduleAvailabilityModel = read(
  "src/app/PlatformAdmin/CatalogWorkspace/moduleAvailabilityModel.ts",
);
const moduleColumnsModal = read(
  "src/app/PlatformAdmin/CatalogWorkspace/ModuleColumnsModal.tsx",
);
const catalogProductCard = read(
  "src/app/PlatformAdmin/Catalog/CatalogProductCard.tsx",
);
const commercialOfferWorkspace = read(
  "src/app/PlatformAdmin/CatalogWorkspace/CommercialOfferWorkspace.tsx",
);
const commercialOfferDetail = read(
  "src/app/PlatformAdmin/CatalogWorkspace/CommercialOfferDetail.tsx",
);
const stripeSetupPanel = read(
  "src/app/PlatformAdmin/BillingWorkspace/StripeSetupPanel.tsx",
);
const workspaceNavigation = read(
  "src/app/components/frontend-os/IndiceWorkspaceNavigation.tsx",
);
const frontendOperatingSystem = read(
  "../docs/indice-frontend-operating-system-v2.md",
);
const trainingWorkspace = read("src/app/Training/TrainingWorkspace.tsx");
const trainingExam = read("src/app/Training/TrainingExamPanel.tsx");
const trainingCertificate = read("src/app/Training/trainingCertificatePdf.ts");

// A label regression must verify both its translated value and the component's binding.
// Appending dictionaries to source would pass even after a label disappeared from the UI.
const { getPlatformAdminTranslator } = loadTypeScript(resolve(root, 'src/app/PlatformAdmin/translations/index.ts'));
const { getCustomerAccountCopy } = loadTypeScript(resolve(root, 'src/app/PlatformAdmin/Customers/customerAccountTranslations.ts'));
const { getCatalogCopy } = loadTypeScript(resolve(root, 'src/app/PlatformAdmin/CatalogWorkspace/translations/index.ts'));
const { getCustomerTableCopy } = loadTypeScript(resolve(root, 'src/app/PlatformAdmin/Customers/customerTableCopy.ts'));
const dictionary = (path, exported = 'copy') => loadTypeScript(resolve(root, path))[exported];
const translatedSources = new Map([
  [page, { translate: getPlatformAdminTranslator('es-MX') }],
  ...[customerRow, companyModules, companyActivity, companyOverview, accountTypeEdit, distributorAssignment, company, companyAccess, adjustment, trialExtension, customerTableCopy]
    .map(source => [source, { translate: getCustomerAccountCopy('es-MX').t }]),
  ...[commercialOfferWorkspace, commercialOfferDetail, moduleAvailabilityWorkspace, stripeSetupPanel]
    .map(source => [source, { messages: [getCatalogCopy('es-MX'), getCatalogCopy('en-CA')] }]),
  ...[consulting, consultingCalendar, consultingAvailability, session, coverage]
    .map(source => [source, { messages: dictionary('src/app/PlatformAdmin/ConsultingTranslations/es-MX.ts') }]),
  [allCompanyActivityPanel, { messages: [dictionary('src/app/PlatformAdmin/OperationsTranslations/es-MX.ts'), dictionary('src/app/PlatformAdmin/OperationsTranslations/en-CA.ts')] }],
  [systemTicketDetail, { messages: dictionary('src/app/SystemTickets/translations/es-MX.ts') }],
  [trainingWorkspace, { messages: dictionary('src/app/Training/translations/program/es-MX.ts') }],
  [trainingExam, { messages: dictionary('src/app/Training/translations/exam/es-MX.ts') }],
  [trainingCertificate, { messages: dictionary('src/app/Training/translations/exam/es-MX.ts') }],
]);
function localizedLabelIsBound(source, expected) {
  const binding = translatedSources.get(source);
  if (!binding) return false;
  if (binding.translate) {
    for (const match of source.matchAll(/\bt\(["']([^"'\n]+)["']/g)) {
      try { if (expected.test(binding.translate(match[1]))) return true; } catch { /* Not a key from this module. */ }
    }
  }
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (binding.messages) {
    for (const [key, value] of (Array.isArray(binding.messages) ? binding.messages : [binding.messages]).flatMap(messages => Object.entries(messages))) {
      if (typeof value !== 'string' || !expected.test(value)) continue;
      const reference = new RegExp(`(?:\\bcopy\\.|getCatalogCopy\\([^)]*\\)\\.)${escape(key)}\\b`);
      if (reference.test(source) || new RegExp(`(?:formatExamMessage\\(copy, |\\bformat\\()["']${escape(key)}["']`).test(source)) return true;
    }
  }
  return false;
}
function assertLocalizedLabel(source, expected) {
  assert.ok(expected.test(source) || localizedLabelIsBound(source, expected), `Expected a rendered/localized label matching ${expected}`);
}

test("el encabezado reconoce Root desde la autoridad real de plataforma", () => {
  assert.match(header, /platformAdminApi\.getContext\(\)/);
  assert.match(header, /platformAdminRole === 'PLATFORM_ROOT'/);
  assert.doesNotMatch(
    header,
    /const isRootAccount = normalizeAccessRole\(authSession\?\.user\.role\) === 'root';/,
  );
});

test("Root administra todos los tickets de sistema enviados por distribuidores", () => {
  assert.match(page, /id: "systemTickets"/);
  assertLocalizedLabel(page, /Tickets de sistema/);
  assert.match(page, /context\?\.can_manage_system_tickets/);
  assert.match(page, /portal="root"/);
  assert.match(systemTickets, /ticket\.distributor_name/);
  assert.match(systemTicketDetail, /systemTicketsApi\.update/);
  assert.match(systemTicketsApi, /endpoints\.platformAdmin\.systemTickets/);
  assert.match(systemTickets, /systemTicketsApi\.create\(portal, form\)/);
  assert.match(systemTickets, /setCreateOpen\(true\)/);
  assert.doesNotMatch(systemTickets, /localStorage/);
});

test("detalle de ticket separa el scroll del cuerpo del footer operativo", () => {
  assert.match(systemTicketDetail, /modalType="standard-form"/);
  assert.match(systemTicketDetail, /contentClassName="h-\[min\(94dvh,860px\)\]"/);
  assert.match(systemTicketDetail, /bodyClassName="[^"]*overflow-y-auto[^"]*"/);
  assert.match(systemTicketDetail, /bodyClassName="[^"]*overscroll-contain[^"]*"/);
  assert.match(systemTicketDetail, /bodyClassName="[^"]*pb-24[^"]*sm:pb-10[^"]*"/);
  assert.match(systemTicketDetail, /bodyClassName="[^"]*scrollbar-gutter:stable[^"]*"/);
  assertLocalizedLabel(systemTicketDetail, /Control operativo/);
  assert.match(systemTicketDetail, /copy\.status/);
  assert.match(systemTicketDetail, /copy\.priority/);
  assert.match(systemTicketDetail, /copy\.assignee/);
  assert.match(systemTicketDetail, /copy\.target/);
  assert.match(systemTicketDetail, /\{copy\.save\}/);
  assert.match(systemTicketDetail, /\{copy\.close\}/);
  assert.match(systemTicketDetail, /dark:bg-\[#59C3A5\]\/10/);
});

test("clientes concentra el acceso promocional sin recuperar la pestaña eliminada", () => {
  assert.doesNotMatch(page, /id:\s*["']courtesy["']/);
  assertLocalizedLabel(page, /Acceso promocional/);
  assert.match(page, /courtesyFeedback/);
  assert.match(page, /IndiceModalValidation/);
});

test("Facturación muestra la conexión Stripe junto a sus registros y conserva el catálogo", () => {
  const billingTab = page.slice(page.indexOf('{activeTab === "billing" ? ('), page.indexOf('{activeTab === "catalog" ? ('));
  assert.match(billingTab, /<StripeSetupPanel/);
  assert.match(billingTab, /environment=\{catalog\?\.stripe_environment\}/);
  assert.match(billingTab, /onRefresh=\{\(\) => void refreshStripeStatus\(\)\}/);
  assert.match(billingTab, /<BillingTab/);
  assert.match(billingTab, /data=\{billing\}/);
  assert.doesNotMatch(billingTab, /CommercialOfferWorkspace|CatalogAndModulesTab|publishCatalogOffer/);
  assert.doesNotMatch(page, /billing-step|PlatformBillingWorkspace|CommercialBillingWorkspace/);
  const catalogTab = page.slice(page.indexOf("function CatalogAndModulesTab("), page.indexOf("function CatalogTab("));
  assert.match(catalogTab, /<CommercialOfferWorkspace/);
  assert.match(catalogTab, /<ModuleAvailabilityWorkspace/);
  assert.match(catalogTab, /publishCatalogOffer/);
  assert.match(catalogTab, /catalog-step/);
  assert.doesNotMatch(catalogTab, /<StripeSetupPanel/);
  assertLocalizedLabel(stripeSetupPanel, /These are the actual server settings/);
  assertLocalizedLabel(stripeSetupPanel, /do not confirm key access, webhook processing/);
  assertLocalizedLabel(stripeSetupPanel, /In Catalog & modules, save prices in the draft/);
});

test("actualizar la conexión sólo consulta el catálogo y conserva sus datos ante un fallo", async () => {
  const refresh = page.slice(page.indexOf("const refreshStripeStatus = async"), page.indexOf("const [moduleRegistry,"));
  assert.ok(refresh, "Billing must expose its read-only connection refresh");
  const events = [];
  const catalog = { stripe_environment: { mode: "LIVE", enabled: false } };
  const scope = {
    stripeStatusRefreshing: false, t: getPlatformAdminTranslator("en-CA"),
    setStripeStatusRefreshing: (value) => events.push(["busy", value]),
    setStripeStatusError: (value) => events.push(["error", value]),
    setCatalog: (value) => events.push(["catalog", value]),
    platformAdminApi: { getCatalog: async () => { events.push(["read"]); return catalog; } },
  };
  const execute = () => new Function(...Object.keys(scope), `${refresh}; return refreshStripeStatus();`)(...Object.values(scope));
  await execute();
  assert.deepEqual(events, [["busy", true], ["error", ""], ["read"], ["catalog", catalog], ["busy", false]]);
  events.length = 0;
  scope.platformAdminApi.getCatalog = async () => { throw new Error("Status unavailable"); };
  await execute();
  assert.deepEqual(events, [["busy", true], ["error", ""], ["error", getPlatformAdminTranslator("en-CA")("Stripe setup status could not be refreshed.")], ["busy", false]]);
  events.length = 0;
  scope.stripeStatusRefreshing = true;
  await execute();
  assert.deepEqual(events, []);
});

test("catálogo y módulos guía un flujo operativo de disponibilidad producto y publicación", () => {
  assert.match(page, /es: "Catálogo y módulos"/);
  assert.match(page, /en: "Catalog & modules"/);
  assert.doesNotMatch(page, /id: "modules", es: "Módulos"/);
  assert.match(page, /type CatalogWorkspaceView = "offer" \| "modules"/);
  assertLocalizedLabel(page, /Catálogo y módulos/);
  assertLocalizedLabel(page, /Oferta comercial/);
  assertLocalizedLabel(page, /Disponibilidad técnica/);
  assertLocalizedLabel(page, /Sincronizar complementos/);
  assert.match(page, /<ModuleAvailabilityWorkspace/);
  assert.match(page, /<CommercialOfferWorkspace/);
  assertLocalizedLabel(page, /Al publicar se sincronizan y verifican los precios guardados con Stripe/);
  assertLocalizedLabel(page, /Validar oferta/);
  assertLocalizedLabel(page, /Sincronizar y publicar oferta/);
  assert.doesNotMatch(page, /Qué haces aquí|Afecta a|Siguiente paso/);
  assert.match(page, /<IndiceWorkspaceNavigation/);
  assert.match(page, /variant="sections"/);
  assert.match(page, /tone="aqua"/);
  assert.match(page, /catalog-step/);
  assertLocalizedLabel(commercialOfferWorkspace, /Lo que puede comprar el cliente/);
  assert.match(commercialOfferWorkspace, /<IndiceFilterBar/);
  assert.match(commercialOfferWorkspace, /<IndiceFilterSearch/);
  assertLocalizedLabel(commercialOfferWorkspace, /Tipo de producto/);
  assertLocalizedLabel(commercialOfferWorkspace, /Disponibles para clientes/);
  assertLocalizedLabel(commercialOfferWorkspace, /No disponibles/);
  assertLocalizedLabel(commercialOfferWorkspace, /Listos para publicar/);
  assertLocalizedLabel(commercialOfferWorkspace, /Configuración pendiente/);
  assertLocalizedLabel(commercialOfferWorkspace, /Stripe pendiente/);
  assertLocalizedLabel(commercialOfferWorkspace, /Limpiar filtros/);
  assertLocalizedLabel(commercialOfferWorkspace, /Módulos/);
  assertLocalizedLabel(commercialOfferWorkspace, /Paquetes/);
  assertLocalizedLabel(commercialOfferWorkspace, /Usuarios/);
  assertLocalizedLabel(commercialOfferWorkspace, /Promociones/);
  assert.match(commercialOfferWorkspace, /<IndiceOperationalTable/);
  assertLocalizedLabel(commercialOfferWorkspace, /Administrar disponibilidad/);
  assertLocalizedLabel(commercialOfferWorkspace, /Configurar precios/);
  assertLocalizedLabel(commercialOfferWorkspace, /Precio mensual/);
  assertLocalizedLabel(commercialOfferWorkspace, /Precio anual/);
  assert.match(commercialOfferWorkspace, /<IndiceModalFrame/);
  assert.match(commercialOfferWorkspace, /modalType="standard-form"/);
  assert.match(commercialOfferWorkspace, /editorSection === "pricing"/);
  assert.match(commercialOfferWorkspace, /editorSection === "availability"/);
  assert.match(commercialOfferWorkspace, /onClose=\{\(\) => setSelection\(null\)\}/);
  assertLocalizedLabel(commercialOfferDetail, /Módulos incluidos/);
  assert.match(commercialOfferDetail, /setFeedback\(copy\.saved\);\s*onClose\(\);/);
  assertLocalizedLabel(commercialOfferDetail, /Mensual USD/);
  assertLocalizedLabel(commercialOfferDetail, /Anual USD/);
  assertLocalizedLabel(commercialOfferDetail, /Stripe Promotion ID/);
  assertLocalizedLabel(commercialOfferDetail, /Calculadora de precio anual/);
  assertLocalizedLabel(commercialOfferDetail, /Aplicar precio anual/);
  assertLocalizedLabel(commercialOfferDetail, /Simulador de descuento/);
  assertLocalizedLabel(commercialOfferDetail, /Guardar disponibilidad/);
  assertLocalizedLabel(commercialOfferDetail, /No sumes el impuesto a estos precios/);
  assertLocalizedLabel(commercialOfferDetail, /Guardar y conectar con Stripe TEST/);
  assertLocalizedLabel(commercialOfferDetail, /PUBLICAR EN STRIPE LIVE/);
  assert.match(commercialOfferDetail, /target_mode: stripeMode/);
  assert.match(commercialOfferDetail, /liveSyncEnabled/);
  assert.match(commercialOfferDetail, /synchronizeCatalogProductPrices/);
  assert.match(commercialOfferDetail, /saveCatalogProductPrices/);
  assertLocalizedLabel(commercialOfferDetail, /suscripciones existentes/);
  assert.match(platformApi, /PlatformCatalogStripePriceSync/);
  assert.match(platformApi, /stripe_sync_status/);
  assert.match(platformApi, /catalog_live_sync_enabled/);
  assert.match(platformApi, /drafts\/\$\{versionId\}\/validation`,\s*\{ method: 'POST' \}/);
  assert.match(platformApi, /stripe-prices\/synchronize/);
});

test("la certificación exige prácticas, examen cronometrado y acreditación por etapa", () => {
  assertLocalizedLabel(trainingWorkspace, /Estándar de dominio consultivo/);
  assert.match(trainingWorkspace, /TrainingExamPanel/);
  assertLocalizedLabel(trainingWorkspace, /Examen final de certificación consultiva/);
  assertLocalizedLabel(trainingExam, /Evaluación obligatoria de etapa/);
  assertLocalizedLabel(trainingExam, /Las respuestas se guardan automáticamente/);
  assert.match(trainingExam, /expires_at/);
  assert.match(trainingExam, /\/answers/);
  assert.match(trainingExam, /\/submit/);
  assertLocalizedLabel(trainingExam, /15 minutos/);
  assertLocalizedLabel(trainingCertificate, /Folio:/);
  assert.match(trainingCertificate, /QRCode/);
});

test("la navegación interna comparte motor accesible y memoria de contexto", () => {
  assert.match(page, /variant="sections"/);
  assert.match(page, /primary-navigation/);
  assert.match(page, /useWorkspaceNavigationMemory/);
  assert.match(workspaceNavigation, /variant\?: 'sections' \| 'views' \| 'workflow'/);
  assert.match(workspaceNavigation, /role="tablist"/);
  assert.match(workspaceNavigation, /role="tab"/);
  assert.match(workspaceNavigation, /aria-selected/);
  assert.match(workspaceNavigation, /tabs\[nextIndex\]\?\.click\(\)/);
  assert.match(workspaceNavigation, /ArrowLeft/);
  assert.match(workspaceNavigation, /ArrowRight/);
  assert.match(workspaceNavigation, /Home/);
  assert.match(workspaceNavigation, /End/);
  assertLocalizedLabel(frontendOperatingSystem, /Internal Workspace Navigation Engine/);
  assert.match(frontendOperatingSystem, /IndiceWorkspaceNavigation/);
});

test("disponibilidad usa filtros facetas y la tabla operativa estándar", () => {
  assert.match(moduleAvailabilityWorkspace, /IndiceFilterBar/);
  assert.match(moduleAvailabilityWorkspace, /IndiceFilterSearch/);
  assert.match(moduleAvailabilityWorkspace, /IndiceFilterSelect/);
  assert.match(moduleAvailabilityWorkspace, /type ViewMode = "table" \| "cards"/);
  assert.match(moduleAvailabilityWorkspace, /IndiceTableShell/);
  assert.match(moduleAvailabilityWorkspace, /IndiceOperationalTable/);
  assert.match(moduleAvailabilityWorkspace, /IndiceTableHeaderRow/);
  assert.match(moduleAvailabilityWorkspace, /IndiceTableColGroup/);
  assert.match(moduleAvailabilityWorkspace, /usePersistentColumnWidths/);
  assert.match(moduleAvailabilityWorkspace, /const scopeRows = useMemo/);
  assert.match(moduleAvailabilityWorkspace, /inactive: scopeRows\.filter/);
  assertLocalizedLabel(moduleAvailabilityWorkspace, /No disponibles/);
  assertLocalizedLabel(moduleAvailabilityWorkspace, /Limpiar filtros/);
  assert.match(moduleAvailabilityWorkspace, /if \(selected\) \{\s*setAvailability\("all"\);\s*setCommercialState\("all"\)/);
  assert.match(moduleAvailabilityWorkspace, /if \(next === "inactive"\) setCommercialState\("all"\)/);
  assert.match(moduleAvailabilityWorkspace, /if \(next !== "all"\) setAvailability\("active"\)/);
  assert.match(moduleAvailabilityWorkspace, /ModuleColumnsModal/);
  assert.match(moduleAvailabilityWorkspace, /DataTablePagination/);
  assert.match(moduleAvailabilityModel, /repairMojibake/);
  assert.match(moduleAvailabilityModel, /productIncludesModule/);
  assert.match(moduleAvailabilityModel, /moduleAvailabilityMinimumWidths/);
  assert.match(moduleColumnsModal, /ColumnasConfigModal/);
});

test("alta de cuenta avanza por empresa propietario y acceso", () => {
  assert.match(account, /IndiceModalWizardStepper/);
  assert.match(accountUtils, /id:\s*["']company["']/);
  assert.match(accountUtils, /id:\s*["']owner["']/);
  assert.match(accountUtils, /id:\s*["']access["']/);
  assert.match(accountFlow, /reportValidity/);
  assert.match(accountCompanyStep, /industryOptions/);
  assert.match(accountCompanyStep, /employee_count/);
  assert.match(accountCompanyStep, /Número exacto de empleados|copy\.company\.employees/);
  assert.match(accountAccessStep, /requiredExtraSeats/);
  assert.match(accountAccessStep, /INCLUDED_ACCOUNT_SEATS/);
  assert.doesNotMatch(accountAccessStep, /extraSeatOptions/);
  assert.match(accountFlow, /extra_seats: requiredExtraSeats\(updated\.employee_count\)/);
  assert.match(accountFlow, /company_size: String\(employeeCount\)/);
  assert.match(accountFlow, /isValidAccountPassword\(form\.temporary_password\)/);
  assert.doesNotMatch(account, /h-\[92dvh\]/);
  assert.match(accountFlow, /validatePhoneForCountry/);
  assert.match(accountFlow, /knownOwnerEmails\.has/);
  assert.match(accountFlow, /setStep\(errorStep\)/);
  assert.match(accountFlow, /if \(step !== ["']access["']\) \{\s*advance\(\);\s*return;/);
  assert.match(accountFlow, /const hasRequiredProduct = selectableProducts\.some/);
  assert.match(accountFlow, /versionedOffer \|\| product\.product_type\.toUpperCase\(\) === ["']BASIC["']/);
  assert.match(accountFlow, /if \(!hasRequiredProduct\)/);
  assert.match(accountFlow, /result\.modules_applied === true/);
  assert.match(accountFlow, /confirmedProducts\.has\(code\)/);
  assert.match(accountSuccess, /copy\.success\.loadedModules/);
  assert.match(accountSuccess, /created\.products/);
});

test("cuenta de prueba rápida prepara datos y conserva la revisión de acceso", () => {
  assertLocalizedLabel(page, /Cuenta de prueba rápida/);
  assert.match(page, /<QuickTestAccountModal/);
  assert.match(page, /setAccountCreationPreset\(form\)/);
  assert.match(page, /initialStep=\{accountCreationPreset \? "access" : undefined\}/);
  assert.match(accountFlow, /initialForm \? null : readAccountCreationDraft\(\)/);
  assert.match(accountFlow, /initialStep \?\? restoredDraft\?\.step \?\? "company"/);
  assert.match(quickTestAccount, /IndiceModalWizardStepper/);
  assert.match(quickTestFlow, /\["people", "commerce", "complete"\]/);
  assert.match(quickTestUtils, /account_type: "SUPER_ADMIN"/);
  assert.match(quickTestUtils, /extra_seats: requiredExtraSeats\(employeeCount\)/);
  assert.match(quickTestUtils, /product_codes: selectQuickScenarioProductCodes/);
  assert.match(quickTestDetails, /employee_count/);
  assert.match(quickTestDetails, /trialDayOptions/);
  assert.doesNotMatch(quickTestFlow, /onCreate/);
});

test("la tabla suma los lugares adicionales concedidos durante la prueba", () => {
  assert.match(platformApi, /courtesy_extra_seats\?: number/);
  assert.match(customerRow, /company\.courtesy_extra_seats \|\| 0/);
});

test("clientes distingue la proyeccion mensual de cobros y resume cuentas y usuarios reales", () => {
  assert.match(page, /projected_monthly_billing_cents/);
  assert.match(page, /active_customer_companies/);
  assert.match(page, /customer_active_users/);
  assertLocalizedLabel(page, /Proyecci.n mensual/);
  assertLocalizedLabel(page, /usuarios activos totales/);
});

test("clientes conserva contratos históricos y confirma el nuevo total antes de modificar Stripe", () => {
  assert.match(platformApi, /catalog_version_historical\?: boolean/);
  assert.match(platformApi, /previewCompanyProducts/);
  assert.match(platformApi, /products\/preview/);
  assertLocalizedLabel(customerRow, /Contrato histórico/);
  assert.match(companyModules, /subscriptionProductCodes/);
  assertLocalizedLabel(companyModules, /Confirma el cambio comercial/);
  assert.match(companyModules, /estimated_amount_cents/);
  assert.match(companyModules, /pendingChange\.preview\.catalog_version/);
  assert.match(platformApi, /expected_catalog_version: expectedCatalogVersion/);
  assertLocalizedLabel(companyModules, /sin prorrateo ni cobro inmediato/);
  assertLocalizedLabel(companyModules, /Retirar cortesía/);
  assert.doesNotMatch(companyModules, /se factura o acredita el prorrateo/);
  assert.match(company, /onPreviewProducts/);
  assert.match(page, /previewCompanyProducts/);
});

test("las tarjetas de clientes funcionan como filtros operativos", () => {
  assert.match(page, /platformAdminApi\.getOverview\(overviewOptions\)/);
  assert.match(platformApi, /status: options\.status \?\? 'all'/);
  assert.match(platformApi, /pageSize: String\(options\.pageSize \?\? 25\)/);
  assert.match(customerTableUtils, /statusFilter === "temporary"/);
  assert.match(customerTableUtils, /statusFilter === "attention"/);
  assert.match(customerTableUtils, /statusFilter === "expiring"/);
  assert.match(customerTableUtils, /statusFilter === "no_offer"/);
  assert.match(customerTableUtils, /statusFilter === "no_adoption"/);
  assert.doesNotMatch(page, /CustomerControlCenter/);
  assert.match(page, /onStatus\(statusFilter === "active" \? "all" : "active"\)/);
  assert.match(page, /onStatus\(statusFilter === "temporary" \? "all" : "temporary"\)/);
});

test("clientes conserva el encabezado y los criterios de prioridad", () => {
  assertLocalizedLabel(page, /Centro de control de clientes/);
  assert.match(customerTableUtils, /customerPriorityScore/);
  assert.match(customerTableUtils, /company\.user_type === "SUPER_ADMIN"/);
});

test("la prueba pública sólo se extiende 15 días después de confirmar la consultoría", () => {
  assert.match(accountAccessStep, /trialDayOptions/);
  assert.match(trialExtension, /export type TrialExtensionDays = 15/);
  assert.match(trialExtension, /useState<TrialExtensionDays>\(15\)/);
  assert.match(trialExtension, /consultationConfirmed/);
  assert.match(trialExtension, /disabled=\{saving \|\| !consultationConfirmed\}/);
  assertLocalizedLabel(trialExtension, /máximo 30 en total/);
  assert.doesNotMatch(trialExtension, /type=["']number["']/);
  assert.match(customerRow, /trial_days_remaining/);
  assert.match(customerRow, /onExtendTrial/);
  assert.match(page, /context\?\.role === "PLATFORM_ROOT"/);
  assert.match(platformApi, /\/trial-extension/);
});

test("alta de cuenta recupera el avance cuando expira la sesión Root", () => {
  assert.match(routes, /function PlatformAdminRoute\(\)[\s\S]*subscribeToAuthenticationExpired/);
  assert.match(routes, /authenticationExpired: true/);
  assert.match(routes, /returnTo:/);
  assert.match(accountFlow, /saveAccountCreationDraft\(step, form\)/);
  assert.match(accountFeature, /hasAccountCreationDraft|restoredDraft/);
  assertLocalizedLabel(accountSpanishCopy, /Volver a iniciar sesión/);
  assert.match(accountFlow, /returnTo = "\/platform-admin"/);
  assert.match(accountFlow, /state: \{ authenticationExpired: true, returnTo \}/);
  assert.match(accountDraft, /temporary_password: omittedPassword/);
  assertLocalizedLabel(accountDraft, /Never persist the temporary password/);
  assert.match(page, /hasAccountCreationDraft\(\)/);
});

test("tipo de cuenta se persiste sin permitir conceder Root desde el alta", () => {
  assertLocalizedLabel(page, /Tipo de cuenta/);
  assert.match(customerRow, /UserTypeBadge/);
  assert.match(page, /value: "ROOT", label: "Root"/);
  assert.match(accountUtils, /account_type: "SUPER_ADMIN"/);
  assert.match(accountCompanyStep, /<option value="SUPER_ADMIN">/);
  assert.match(accountCompanyStep, /<option value="DISTRIBUTOR">/);
  assert.doesNotMatch(accountCompanyStep, /<option value="ROOT">/);
});

test("el tipo de cuenta se edita por modal y conserva Root fuera del flujo", () => {
  assert.equal(getCustomerTableCopy("es-MX").editType, "Editar tipo de usuario");
  assert.match(customerRow, /accountType !== "ROOT"/);
  assert.match(page, /AccountTypeEditModal/);
  assertLocalizedLabel(accountTypeEdit, /Editar tipo de usuario/);
  assert.match(accountTypeEdit, /<option value="SUPER_ADMIN">/);
  assert.match(accountTypeEdit, /<option value="DISTRIBUTOR">/);
  assert.doesNotMatch(accountTypeEdit, /<option value="ROOT">/);
  assert.match(platformApi, /updateCompanyAccountType/);
  assert.match(platformApi, /\/account-type/);
});

test("el estado comercial distingue activo prueba demo e inactivo", () => {
  assert.match(customerTableUtils, /basicCommercialStatus/);
  assert.match(page, /value: "active", label: t\("Active"\)/);
  assert.equal(getPlatformAdminTranslator("es-MX")("Active"), "Activa");
  assert.match(page, /value: "trial", label: t\("Trial"\)/);
  assert.equal(getPlatformAdminTranslator("es-MX")("Trial"), "Prueba");
  assert.match(page, /value: "demo", label: t\("Demo"\)/);
  assert.match(page, /value: "inactive"/);
  assert.match(customerTableUtils, /company\.temporary_benefits/);
  assert.match(platformApi, /temporary_benefits\?: number/);
  assert.match(customerRow, /basicCommercialStatus\(company\)/);
});

test("eliminar cuenta conserva el registro como Eliminado y exige confirmación segura", () => {
  assert.match(customerRow, /copy\.deleteAccount/);
  assert.match(customerRow, /status === "deleted"/);
  assert.match(customerTableUtils, /platform_status === "DELETED"/);
  assert.match(page, /companyDeletionName !== companyDeletion\.name/);
  assert.match(page, /platformAdminApi\.deleteCompanyAccount/);
  assertLocalizedLabel(page, /baja lógica/);
  assert.match(platformApi, /method: 'DELETE'/);
});

test("Root habilita demos públicas por empresa sin modificar el login normal", () => {
  assert.match(platformApi, /public_demo_enabled\?: boolean/);
  assert.match(platformApi, /updatePublicDemoAccess/);
  assert.match(platformApi, /\/public-demo/);
  assertLocalizedLabel(companyOverview, /Demo pública con credenciales/);
  assert.match(companyOverview, /role="switch"/);
  assert.match(companyOverview, /\/demo/);
  assert.match(page, /updatePublicDemoAccess/);
});

test("confirmaciones de plataforma usan cancelar localizado", () => {
  assert.match(companyOverview, /cancelLabel=\{t\("cancel"\)\}/);
  assert.equal([...companyActivity.matchAll(/cancelLabel=\{t\("cancel"\)\}/g)].length, 2);
  assert.match(usersDirectory, /cancelLabel=\{copy\.cancel\}/);
  assert.equal([...page.matchAll(/cancelLabel=\{t\("Cancel"\)\}/g)].length, 2);
});

test("la tabla de clientes conserva identidad y acciones con el patrón Índice", () => {
  assert.match(customerTable, /IndiceTableShell pagination=\{pagination\}/);
  assert.match(customerTable, /IndiceOperationalTable/);
  assert.match(customerTable, /IndiceTableHeaderRow/);
  assert.match(customerTable, /usePersistentColumnWidths/);
  assert.match(customerTable, /tone="aqua"/);
  assert.match(customerRow, /IndiceTableActionGroup/);
  assert.match(customerTableColumns, /customerTableActionsWidth = 212/);
  assert.match(customerRow, /DropdownMenuItem onSelect=\{\(\) => onEditType\?\.\(company\)\}/);
  assert.equal(getCustomerTableCopy("es-MX").manage, "Administrar");
});

test("los modales de clientes usan los patrones oficiales sin navegación duplicada", () => {
  assert.match(account, /modalType="wizard"/);
  assert.match(accountTypeEdit, /modalType="standard-form"/);
  assert.match(distributorAssignment, /modalType="standard-form"/);
  assert.match(trialExtension, /modalType="standard-form"/);
  assert.match(adjustment, /modalType="standard-form"/);
  assert.match(company, /modalType="operational-workspace"/);
  assert.match(customerUsersModal, /modalType="operational-workspace"/);
  assert.match(company, /IndiceWorkspaceNavigation<CompanyAccountTab>/);
  assert.doesNotMatch(company, /<nav role="tablist"/);
  assert.doesNotMatch(customerModalPresentation, /font-(?:bold|semibold)/);
});

test("clientes conserva una identidad visual verde Índice", () => {
  assert.match(page, /activeTab === "customers" \? "aqua" : "blue"/);
  assert.match(page, /<IndiceTitleBar[\s\S]*?tone="aqua"/);
  assert.match(customerTable, /tone="aqua"/);
  assert.match(company, /tone="aqua"/);
  assert.match(account, /tone="aqua"/);
  assert.match(accountTypeEdit, /tone="aqua"/);
  assert.match(distributorAssignment, /tone="aqua"/);
  assert.match(trialExtension, /tone="aqua"/);
});

test("la tabla separa el creador histórico del distribuidor vigente", () => {
  assert.equal(getCustomerTableCopy("es-MX").commercialOrigin, "Origen");
  assert.equal(getCustomerTableCopy("es-MX").createdByDistributor, "Creado por distribuidor");
  assert.equal(getCustomerTableCopy("es-MX").distributorAccount, "Cuenta distribuidora");
  assert.match(customerTraceability, /company\.creation_origin === "DISTRIBUTOR_PORTAL"/);
  assert.match(customerTraceability, /company\.created_by_distributor_company_name/);
  assert.match(customerTraceability, /company\.distributor_company_name/);
  assert.match(customerTraceability, /copy\.currentDistributor/);
  assert.match(customerTraceability, /copy\.originNotRegistered/);
  assertLocalizedLabel(customerTraceability, /text-sm font-medium/);
  assertLocalizedLabel(customerTraceability, /text-xs leading-4/);
  assertLocalizedLabel(customerTraceability, /grid h-9 w-9/);
  assert.doesNotMatch(customerTraceability, /shadow-sm/);
  assert.match(customerTableUtils, /case "distributor"/);
  assert.match(platformApi, /creation_origin\?:/);
  assert.match(platformApi, /distributor_company_name\?: string \| null/);
  assert.match(page, /overview\?\.distributors \?\? \[\]/);
});

test("una cuenta cliente asigna cambia o retira su distribuidor por modal", () => {
  assert.match(customerRow, /accountType === "SUPER_ADMIN"/);
  assert.match(customerRow, /onAssignDistributor/);
  assert.equal(getCustomerTableCopy("es-MX").assignDistributor, "Asignar distribuidor");
  assert.match(page, /DistributorAssignmentModal/);
  assert.match(page, /updateCompanyDistributor/);
  assert.match(distributorAssignment, /sortedDistributors\.map/);
  assert.match(distributorAssignment, /value="direct"/);
  assertLocalizedLabel(distributorAssignment, /Desvincular distribuidor/);
  assert.match(platformApi, /\/distributor/);
});

test("la entrega de la cuenta permite copiar todos los datos de acceso", () => {
  assertLocalizedLabel(accountSpanishCopy, /Copiar datos/);
  assertLocalizedLabel(accountSpanishCopy, /Datos copiados/);
  assert.match(accountSuccess, /copy\.success\.loginPage/);
  assert.match(accountSuccess, /copy\.success\.password/);
  assert.match(accountSuccess, /writeClipboard/);
});

test("la cuenta separa módulos activos de los disponibles para agregar", () => {
  assertLocalizedLabel(companyModules, /Contrato y accesos vigentes/);
  assertLocalizedLabel(companyModules, /Módulos disponibles/);
  assert.match(companyModules, /availableCatalogProducts/);
  assert.match(companyModules, /<details/);
  assert.match(companyModules, /requestPreview/);
  assert.match(companyModules, /onGrant\(product\.code\)/);
  assert.doesNotMatch(companyModules, /t\("allOfferIncluded"\)/);
});

test("usuarios incluidos ocupan y liberan lugares con invitaciones controladas", () => {
  assert.match(customerTableColumns, /users: copy\.users/);
  assert.match(customerRow, /onOpenUsers\(company\)/);
  assert.match(customerRow, /copy\.manageUsers/);
  assert.match(page, /openCompanyUsers/);
  assert.match(page, /openCompany\(company, "activity"\)/);
  assert.doesNotMatch(page, /<CustomerUsersModal/);
  assert.match(customerUsersModal, /CompanyActivityTab/);
  assert.match(customerUsersModal, /showBilling=\{false\}/);
  assertLocalizedLabel(companyActivity, /Capacidad de usuarios/);
  assertLocalizedLabel(companyActivity, /El propietario ocupa un lugar/);
  assertLocalizedLabel(companyActivity, /Activos/);
  assertLocalizedLabel(companyActivity, /Invitaciones/);
  assertLocalizedLabel(companyActivity, /Inactivos/);
  assertLocalizedLabel(companyActivity, /Invitar usuario/);
  assertLocalizedLabel(companyActivity, /lugar quedó reservado/);
  assertLocalizedLabel(companyActivity, /Desactivar y liberar lugar/);
  assertLocalizedLabel(companyActivity, /Reactivar/);
  assert.match(companyActivity, /available < 1/);
  assertLocalizedLabel(companyActivity, /Ajustar capacidad/);
  assert.match(platformApi, /inviteCompanyUser/);
  assert.match(platformApi, /cancelCompanyUserInvitation/);
  assert.match(platformApi, /resendCompanyUserInvitation/);
  assert.match(platformApi, /updateCompanyUserStatus/);
  assert.match(companyActivity, /inviteReason\.trim\(\)\.length < 5/);
  assert.match(companyActivity, /statusReason\.trim\(\)\.length < 5/);
  assert.match(companyActivity, /IndiceConfirmationDialog/);
  assert.doesNotMatch(companyActivity, /window\.confirm/);
  assert.match(platformApi, /role: 'admin' \| 'user'; reason: string/);
  assert.match(platformApi, /status: 'active' \| 'inactive', reason: string/);
});

test("el directorio y los cambios de autoridad no dependen de la página visible", () => {
  assert.match(usersDirectory, /platformAdminApi\.getCompanyOptions\(query\.trim\(\), directoryPage, directoryPageSize\)/);
  assert.match(usersDirectory, /setDirectoryPage\(1\)/);
  assert.match(usersDirectory, /PendingAccessChange/);
  assert.match(usersDirectory, /companyRequestSequence/);
  assert.match(usersDirectory, /accessReason\.trim\(\)\.length < 5/);
  assert.match(usersDirectory, /IndiceConfirmationDialog/);
  assert.match(platformApi, /updateCompanyUserRole:[\s\S]*reason: string/);
  assert.match(platformApi, /updateCompanyUserPlatformAccess:[\s\S]*reason: string/);
});

test("los errores de operaciones destructivas permanecen visibles en su confirmación", () => {
  assert.match(page, /revocationError/);
  assert.match(page, /companyDeletionError/);
  assert.match(page, /moduleChangeError/);
  assert.doesNotMatch(page, /setAccountFeedback\(\{ type: "error", message \}\);\s*setRevocation\(null\)/);
});

test("las mutaciones críticas conservan su clave al reintentar una falla transitoria", () => {
  assert.match(platformApi, /window\.sessionStorage\.getItem\(fingerprint\)/);
  assert.match(platformApi, /error\.status >= 400 && error\.status < 500/);
  assert.match(platformApi, /window\.sessionStorage\.removeItem\(fingerprint\)/);
  assert.match(platformApi, /createCompanyAccount:[\s\S]*idempotentMutation/);
  assert.match(platformApi, /extendCompanyTrial:[\s\S]*idempotentMutation/);
});

test("sesiones nacen con cuenta horario destino y consultor sin exigir enlace", () => {
  assert.match(session, /companies\.map/);
  assert.match(session, /locations[\s\S]*filter\(\(location\) => location\.active\)/);
  assert.match(session, /consultants\.map/);
  assert.doesNotMatch(session, /Enlace HTTPS de reunión/);
  assert.doesNotMatch(session, /pattern="https:\/\/\.\*"/);
  assert.match(session, /value\.mode === "VIRTUAL" \|\| value\.serviceLocationCode/);
  assert.match(session, /footer=\{[\s\S]*<>[\s\S]*copy\.cancel[\s\S]*copy\.next[\s\S]*<\/>/);
  assertLocalizedLabel(session, /Cancelar/);
  assertLocalizedLabel(session, /Siguiente/);
  assert.match(session, /new Date\(value\.startAt\) <= new Date\(\)/);
  assert.match(consulting, /companies=\{selectableCompanies\}/);
  assert.match(consulting, /locations=\{allLocations\}/);
});

test("cobertura enlaza país código moneda y zona horaria", () => {
  assert.match(coverage, /countryOptions\.map/);
  assert.match(coverage, /country\.timezones\[0\]/);
  assert.match(coverage, /currencyOptions\.map/);
  assert.match(coverage, /disabled[\s\S]*value=\{value\.country_code\}/);
});

test("la consultoría conserva empresa usuario y preferencia de asignación", () => {
  assert.match(clientConsulting, /consultantPreference/);
  assert.match(clientConsulting, /DISTRIBUTOR/);
  assert.match(clientConsulting, /INDICE_TEAM/);
  assert.match(clientConsulting, /workspace\.distributor/);
  assert.match(consultingApi, /requested_distributor_company_id/);
  assertLocalizedLabel(consulting, /Trazabilidad de la solicitud/);
  assert.match(consulting, /appointment\.booked_by_user_id/);
  assertLocalizedLabel(consulting, /Puedes reasignar/);
  assert.match(consulting, /workspace\?\.companies \?\? companies/);
  assert.match(consulting, /companies=\{selectableCompanies\}/);
});

test("consultoría sincroniza distribuidores y distingue al equipo interno", () => {
  assert.match(consulting, /label: copy\.distributors/);
  assertLocalizedLabel(consulting, /Distribuidores/);
  assertLocalizedLabel(consulting, /Directorio de distribuidores consultores/);
  assertLocalizedLabel(consulting, /se sincronizan automáticamente/);
  assert.match(consulting, /consultant\.sourceType === "DISTRIBUTOR"/);
  assert.match(consulting, /consultant\.companyName/);
  assert.match(platformApi, /sourceType\?: "DISTRIBUTOR" \| "CORPORATE"/);
});

test("consultoría muestra agenda mensual con horarios y responsables", () => {
  assert.match(consulting, /ConsultingCalendarView/);
  assert.match(consulting, /label: copy\.calendar/);
  assertLocalizedLabel(consulting, /Calendario/);
  assert.match(consultingCalendar, /confirmed_start_at \|\| appointment\.preferred_start_at/);
  assert.match(consultingCalendar, /alternative_start_at/);
  assert.match(consultingCalendar, /consultant_name \|\| copy\.noConsultant/);
  assert.match(consultingCalendar, /moveMonth/);
  assert.match(consultingCalendar, /onOpen\(entry\.appointment\)/);
});

test("el calendario configura disponibilidad persistente por distribuidor", () => {
  assertLocalizedLabel(consultingCalendar, /Configurar disponibilidad/);
  assert.match(consulting, /ConsultingAvailabilityModal/);
  assert.match(consulting, /operations\.getConsultingAvailability/);
  assert.match(consulting, /operations\.updateConsultingAvailability/);
  assertLocalizedLabel(consultingAvailability, /Horario semanal/);
  assertLocalizedLabel(consultingAvailability, /Guardar disponibilidad/);
  assert.match(platformApi, /getConsultingAvailability:/);
  assert.match(platformApi, /updateConsultingAvailability:/);
  assert.doesNotMatch(consultingAvailability, /localStorage/);
});

test("agregar sesión bloquea dobles envíos y explica fallas de conexión", () => {
  assert.match(session, /busy=\{busy\}/);
  assertLocalizedLabel(session, /Agregando…/);
  assert.match(session, /submitError/);
  assertLocalizedLabel(consulting, /No se pudo conectar con Índice/);
});

test("el expediente de consultoría usa el Modal Wizard Índice", () => {
  assert.match(consulting, /<IndiceModalFrame/);
  assert.match(consulting, /modalType="wizard"/);
  assert.match(consulting, /tone="aqua"/);
  assert.match(consulting, /<IndiceModalWizardStepper/);
  assert.match(consulting, /<IndiceModalSummary/);
  assert.match(consulting, /<IndiceModalValidation/);
  assert.match(consulting, /form="consulting-appointment-form"/);
  assert.doesNotMatch(consulting, /aria-label="Administrar consultoría"/);
});

test("la consultoría aplica los tres tipos y la tarifa fija de USD 79", () => {
  assertLocalizedLabel(consulting, /Tipo de consultoría/);
  assert.match(consulting, /<option value="PAID">\{copy\.paid\}\s*<\/option>/);
  assert.match(consulting, /<option value="COURTESY">\{copy\.courtesy\}\s*<\/option>/);
  assertLocalizedLabel(consulting, /Implementación de módulo/);
  assert.match(consulting, /type === "PAID" \? 7_900 : 0/);
  assert.match(consulting, /currency: "USD"/);
  assertLocalizedLabel(consulting, /La tarifa es/);
  assert.match(consulting, /copy\.fixedFeeHelp[\s\S]*formatConsultationCost\(locale, "PAID"\)/);
  assert.match(consulting, /new Intl\.NumberFormat\(locale, \{ style: "currency", currency: "USD" \}\)\.format\(consultationAmountCents\(type\) \/ 100\)/);
  assert.doesNotMatch(consulting, />Cotización pendiente<\/option>/);
  assert.doesNotMatch(consulting, />Pago pendiente<\/option>/);
  assert.doesNotMatch(consulting, />Reembolsada<\/option>/);
});

test("guardar y notificar cierra el flujo y mantiene el texto centrado", () => {
  assert.match(consulting, /await load\(\);[\s\S]*setSelected\(null\);[\s\S]*setEdit\(null\);/);
  assert.match(consulting, /min-w-\[11rem\][\s\S]*justify-center[\s\S]*text-center/);
  assert.match(consulting, /<span className="text-center leading-tight">/);
});

test("la cuenta se administra en un workspace compacto con pestañas directas", () => {
  assert.doesNotMatch(company, /IndiceModalWizardStepper/);
  assert.match(company, /IndiceWorkspaceNavigation<CompanyAccountTab>/);
  assert.doesNotMatch(company, /<nav role="tablist"/);
  assert.match(company, /id:\s*["']overview["']/);
  assert.match(company, /id:\s*["']modules["']/);
  assert.match(company, /id:\s*["']activity["']/);
  assert.match(company, /id:\s*["']access["']/);
  assert.match(company, /modalType="operational-workspace"/);
  assert.match(company, /tone="aqua"/);
  assert.match(company, /onOpenChange=\{\(nextOpen\)/);
  assert.match(company, /footerSummary=/);
  assert.match(company, /onClick=\{close\}[\s\S]*t\("close"\)/);
  assertLocalizedLabel(company, /Cerrar/);
  assert.match(company, /disabled=\{saving \|\| usersBusy \|\| modulesBusy\} className="cursor-pointer/);
  assert.match(company, /Number\.isFinite/);
  assert.doesNotMatch(company, /h-\[92dvh\]/);
  assert.doesNotMatch(company, /Siguiente|Anterior|Paso \d/);
  assert.match(company, /BenefitAdjustmentModal/);
  assertLocalizedLabel(companyAccess, /Crear ajuste/);
  assert.match(adjustment, /accessReasonOptions/);
  assert.match(adjustment, /extraSeatOptions/);
  assertLocalizedLabel(adjustment, /Selecciona un módulo/);
});

test("catálogo presenta módulos y monedas controladas en lenguaje operativo", () => {
  assertLocalizedLabel(page, /Módulos incluidos/);
  assert.match(page, /product\.capabilities\.includes\(module\.slug\)/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /t\("Amount"\).*price\.currency/);
  assertLocalizedLabel(page, /Importe/);
  assertLocalizedLabel(page, /Referencia de cobro de Stripe/);
  assert.doesNotMatch(page, /Capacidades \(separadas por coma\)/);
  assert.doesNotMatch(page, /Código facturable/);
});

test("precios del catálogo agrupa variantes técnicas por producto comercial", () => {
  assert.match(page, /buildCatalogPriceGroups/);
  assertLocalizedLabel(page, /Productos comerciales/);
  assertLocalizedLabel(page, /Requieren atención/);
  assertLocalizedLabel(page, /Listos para vender/);
  assertLocalizedLabel(page, /Mensual/);
  assertLocalizedLabel(page, /Anual/);
  assert.match(page, /catalogPriceTypeLabel/);
  assert.match(page, /IndiceTableHeaderRow/);
  assert.match(page, /IndiceOperationalTable/);
  assert.match(page, /pageSizeOptions=\{\[10, 25, 50, 100, 200\]\}/);
  assert.match(page, /CatalogStatusMetric/);
  assert.match(page, /IndiceTableActionGroup/);
  assert.doesNotMatch(page, /priceIntervalFilter/);
});

test("catálogo adopta la identidad sobria de Índice sin tarjetas decorativas", () => {
  assert.match(catalogProductCard, /border-\[#59C3A5\]\/40/);
  assert.match(catalogProductCard, /bg-white/);
  assert.doesNotMatch(catalogProductCard, /bg-gradient-to-br/);
  assert.doesNotMatch(catalogProductCard, /uppercase tracking/);
  assert.match(moduleAvailabilityWorkspace, /tone="aqua"/);
  assert.match(moduleAvailabilityWorkspace, /\[10, 25, 50, 100, 200\]/);
});

test("Root crea paquetes y administra sus módulos incluidos desde la interfaz", () => {
  assertLocalizedLabel(page, /Nuevo paquete/);
  assert.match(page, /createCatalogProduct/);
  assert.match(page, /capabilities: target\.value\.capabilities/);
  assert.match(page, /modules\.filter\(\(module\) => module\.assignment_enabled\)/);
  assert.match(page, /product\.capabilities\.includes\(module\.slug\)/);
  assertLocalizedLabel(page, /Módulos incluidos/);
  assert.match(platformApi, /createCatalogProduct/);
  assert.match(platformApi, /capabilities: string\[\]/);
});

test("el descuento anual sugerido respeta la política de cada producto", () => {
  const product = (commercial_kind, product_type = "BASIC", product_code = "module_hr") => ({ commercial_kind, product_type, product_code });
  assert.equal(defaultAnnualDiscountPercent(product("MODULE")), 20);
  assert.equal(defaultAnnualDiscountPercent(product("PACKAGE", "ADDON", "controla")), 20);
  assert.equal(defaultAnnualDiscountPercent(product("VOLUME", "ADDON", "module_additional_unit")), 20);
  assert.equal(defaultAnnualDiscountPercent(product("SEAT", "ADDON", "extra_user")), 0);
  assert.equal(defaultAnnualDiscountPercent(product("STORAGE", "ADDON", "storage_block_5_gib")), 0);
  assert.equal(defaultAnnualDiscountPercent(product("MODULE", "ADDON", "module_future_addon")), 0);
  assert.equal(defaultAnnualDiscountPercent(null, true), 20);
  assert.equal(defaultAnnualDiscountPercent(null), 0);
  assert.doesNotMatch(commercialOfferDetail, /setAnnualDiscount\("15"\)|annualDiscount.*useState\("15"\)/);
  assert.match(commercialOfferDetail, /setAnnualDiscount\(String\(defaultAnnualDiscountPercent\(product, creatingPackage\)\)\)/);
  assert.match(commercialOfferDetail, /setYearly\(creatingPackage \? "" : dollars\(yearPrice\?\.unit_amount_cents\)\)/);
  assert.match(commercialOfferDetail, /onClick=\{\(\) => setYearly\(suggestedAnnualValue\.toFixed\(2\)\)\}/);
});

test("guardar precios conserva el borrador sin necesitar habilitar Stripe LIVE", () => {
  const savePrices = commercialOfferDetail.slice(commercialOfferDetail.indexOf("const savePrices = async"), commercialOfferDetail.indexOf("const synchronizePrices = async"));
  assert.match(savePrices, /platformAdminApi\.saveCatalogProductPrices\(product\.id/);
  assert.match(savePrices, /monthly_amount_cents: monthlyAmount/);
  assert.match(savePrices, /annual_amount_cents: annualAmount/);
  assert.doesNotMatch(savePrices, /liveSyncEnabled|liveConfirmation|synchronizeCatalogProductPrices|stripeSynced/);
  assert.match(commercialOfferDetail, /focusSection === "pricing" \? savePrices\(\) : saveProduct\(\)/);
  assert.match(commercialOfferDetail, /<details[\s\S]*onClick=\{\(\) => void synchronizePrices\(\)\}/);
});

test("guardar precios distingue una escritura confirmada de un fallo al recargar", async () => {
  const source = commercialOfferDetail.slice(commercialOfferDetail.indexOf("const savePrices = async"), commercialOfferDetail.indexOf("const synchronizePrices = async"));
  const events = [];
  const scope = {
    product: { id: 42 }, saving: false, monthly: "79.00", yearly: "758.40",
    cents: (value) => Math.round(Number(value) * 100),
    copy: { saved: "saved", saveError: "save failed", pricesSavedRefreshFailed: "saved; reload unavailable" },
    setFeedback: (value) => events.push(["feedback", value]),
    setSaving: (value) => events.push(["busy", value]),
    platformAdminApi: { saveCatalogProductPrices: async (...args) => events.push(["save", ...args]) },
    refresh: async () => { throw new Error("catalog unavailable"); },
    onClose: () => events.push(["close"]),
  };
  // Exercise the actual handler with a committed write followed by a failed read.
  await new Function(...Object.keys(scope), `${source}; return savePrices();`)(...Object.values(scope));
  assert.deepEqual(events, [
    ["busy", true], ["feedback", null],
    ["save", 42, { monthly_amount_cents: 7900, annual_amount_cents: 75840 }],
    ["feedback", "saved; reload unavailable"], ["busy", false],
  ]);
  events.length = 0;
  scope.platformAdminApi.saveCatalogProductPrices = async () => { throw new Error("save rejected"); };
  await new Function(...Object.keys(scope), `${source}; return savePrices();`)(...Object.values(scope));
  assert.deepEqual(events, [["busy", true], ["feedback", null], ["feedback", "save failed"], ["busy", false]]);
});

test("el editor bloquea los cambios y el cierre mientras guarda o conecta precios", () => {
  assert.match(commercialOfferDetail, /<fieldset disabled=\{saving\} aria-busy=\{saving\}/);
  assert.match(commercialOfferDetail, /onBusyChange\(saving\)/);
  assert.match(commercialOfferDetail, /return \(\) => onBusyChange\(false\)/);
  assert.match(commercialOfferWorkspace, /busy=\{editorBusy\}/);
  assert.match(commercialOfferWorkspace, /if \(!open && !editorBusy\) setSelection\(null\)/);
  assert.match(commercialOfferWorkspace, /onBusyChange=\{setEditorBusy\}/);
});

test("el modo mostrado procede del servidor y no presupone un entorno de prueba", () => {
  assert.equal(stripeEnvironmentLabel("TEST", true), "Test mode");
  assert.equal(stripeEnvironmentLabel("LIVE", true), "Live mode");
  assert.equal(stripeEnvironmentLabel("LIVE", false), "Modo real");
  assert.equal(stripeEnvironmentLabel(undefined, true), "Stripe mode unavailable");
  assert.equal(stripeEnvironmentLabel(null, false), "Modo de Stripe no disponible");
  assert.match(page, /stripeEnvironmentLabel\(catalog\?\.stripe_environment\?\.mode, locale\)/);
  assert.equal(stripeEnvironmentLabel("LIVE", "fr-CA"), "Mode réel");
});

test("el catálogo se prepara valida y publica como versión antes de cambiar la oferta activa", () => {
  assert.match(platformApi, /createCatalogDraft/);
  assert.match(platformApi, /validateCatalogDraft/);
  assert.match(platformApi, /publishCatalogDraft/);
  assert.match(platformApi, /endpoints\.platformAdmin\.catalog\}\/drafts/);
  assertLocalizedLabel(page, /Tienes cambios sin publicar/);
  assertLocalizedLabel(page, /Validar oferta/);
  assertLocalizedLabel(page, /Sincronizar y publicar oferta/);
  assert.match(page, /publishCatalogOffer/);
  assert.match(page, /stripeEnvironmentLabel/);
  assert.doesNotMatch(page, /workingVersion\?\.version_code/);
  assert.doesNotMatch(page, /draftVersion\.version_code} ·/);
  assert.match(page, /catalogValidation\.blockers/);
});

test("órdenes de módulos y operación de consultoría persisten por API", () => {
  assert.match(moduleWorkOrders, /platformAdminApi\.getModuleWorkOrders/);
  assert.match(moduleWorkOrders, /platformAdminApi\.createModuleWorkOrder/);
  assert.match(moduleWorkOrders, /platformAdminApi\.removeModuleWorkOrder/);
  assert.doesNotMatch(moduleWorkOrders, /localStorage/);
  assert.match(platformApi, /moduleWorkOrdersPath = `\$\{endpoints\.platformAdmin\.modules\}\/work-orders`/);
  assert.match(consulting, /operations = platformAdminApi/);
  assert.match(consulting, /operations\.getConsulting/);
  assert.match(consulting, /operations\.createConsultingConsultant/);
  assert.match(consulting, /operations\.createConsultingLocation/);
  assert.match(consulting, /operations\.createConsultingAppointment/);
  assert.match(platformApi, /getConsulting:/);
  assert.match(platformApi, /createConsultingConsultant:/);
  assert.match(platformApi, /createConsultingLocation:/);
  assert.match(platformApi, /createConsultingAppointment:/);
  assert.doesNotMatch(consulting, /localStorage/);
});

test("actividades globales muestran línea editable de usuarios activos", () => {
  assert.match(platformApi, /unique_active_users:\s*number/);
  assert.match(platformApi, /recent_events_has_more:\s*boolean/);
  assert.match(platformApi, /recentLimit=/);
  assert.match(allCompanyActivityPanel, /LineChart/);
  assert.match(allCompanyActivityPanel, /PLATFORM_ACTIVITY_CHART_STORAGE_KEY/);
  assert.match(allCompanyActivityPanel, /unique_active_users/);
  assertLocalizedLabel(allCompanyActivityPanel, /Active users/);
  assertLocalizedLabel(allCompanyActivityPanel, /Customize/);
  assertLocalizedLabel(allCompanyActivityPanel, /Load more activity/);
  assert.doesNotMatch(allCompanyActivityPanel, /BarChart/);
});
