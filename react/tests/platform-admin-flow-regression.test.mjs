import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

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

test("la tabla tolera respuestas antiguas sin tipo de cuenta", () => {
  assert.match(customerRow, /normalizeAccountType\(company\.user_type\)/);
  assert.match(customerRow, /return "SUPER_ADMIN"/);
  assert.match(customerRow, /<UserTypeBadge type=\{accountType\}/);
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
const companyAccess = read("src/app/PlatformAdmin/CompanyAccount/CompanyAccessTab.tsx");
const adjustment = read("src/app/PlatformAdmin/BenefitAdjustmentModal.tsx");
const consulting = read("src/app/PlatformAdmin/ConsultingAdminTab.tsx");
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
const workspaceNavigation = read(
  "src/app/components/frontend-os/IndiceWorkspaceNavigation.tsx",
);
const frontendOperatingSystem = read(
  "../docs/indice-frontend-operating-system-v2.md",
);

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
  assert.match(page, /Tickets de sistema/);
  assert.match(page, /context\?\.can_manage_system_tickets/);
  assert.match(page, /portal="root"/);
  assert.match(systemTickets, /ticket\.distributor_name/);
  assert.match(systemTickets, /systemTicketsApi\.update/);
  assert.match(systemTicketsApi, /endpoints\.platformAdmin\.systemTickets/);
  assert.match(systemTickets, /systemTicketsApi\.create\(portal, form\)/);
  assert.match(systemTickets, /setCreateOpen\(true\)/);
  assert.doesNotMatch(systemTickets, /localStorage/);
});

test("clientes concentra el acceso promocional sin recuperar la pestaña eliminada", () => {
  assert.doesNotMatch(page, /id:\s*["']courtesy["']/);
  assert.match(page, /Acceso promocional/);
  assert.match(page, /courtesyFeedback/);
  assert.match(page, /IndiceModalValidation/);
});

test("catálogo y módulos guía un flujo operativo de disponibilidad producto y publicación", () => {
  assert.match(page, /es: "Catálogo y módulos"/);
  assert.match(page, /en: "Catalog & modules"/);
  assert.doesNotMatch(page, /id: "modules", es: "Módulos"/);
  assert.match(page, /type CatalogWorkspaceView = "modules" \| "products" \| "prices"/);
  assert.match(page, /Catálogo y módulos/);
  assert.match(page, /Disponibilidad/);
  assert.match(page, /Productos y paquetes/);
  assert.match(page, /Precios y publicación/);
  assert.match(page, /Sincronizar complementos/);
  assert.match(page, /<ModuleAvailabilityWorkspace/);
  assert.match(page, /Valida la oferta antes de publicarla/);
  assert.match(page, /Validar oferta/);
  assert.match(page, /Publicar oferta/);
  assert.doesNotMatch(page, /Qué haces aquí|Afecta a|Siguiente paso/);
  assert.match(page, /<CatalogTab[\s\S]*view=\{view\}/);
  assert.match(page, /<IndiceWorkspaceNavigation/);
  assert.match(page, /variant="workflow"/);
  assert.match(page, /catalog-step/);
});

test("la navegación interna comparte motor accesible y memoria de contexto", () => {
  assert.match(page, /variant="sections"/);
  assert.match(page, /primary-navigation/);
  assert.match(page, /useWorkspaceNavigationMemory/);
  assert.match(workspaceNavigation, /variant\?: 'sections' \| 'workflow'/);
  assert.match(workspaceNavigation, /role="tablist"/);
  assert.match(workspaceNavigation, /role="tab"/);
  assert.match(workspaceNavigation, /aria-selected/);
  assert.match(workspaceNavigation, /tabs\[nextIndex\]\?\.click\(\)/);
  assert.match(workspaceNavigation, /ArrowLeft/);
  assert.match(workspaceNavigation, /ArrowRight/);
  assert.match(workspaceNavigation, /Home/);
  assert.match(workspaceNavigation, /End/);
  assert.match(frontendOperatingSystem, /Internal Workspace Navigation Engine/);
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
  assert.match(accountFlow, /const hasBasicProduct = selectableProducts\.some/);
  assert.match(accountFlow, /product\.product_type\.toUpperCase\(\) === ["']BASIC["']/);
  assert.match(accountFlow, /if \(!hasBasicProduct\)/);
  assert.match(accountFlow, /result\.modules_applied === true/);
  assert.match(accountFlow, /confirmedProducts\.has\(code\)/);
  assert.match(accountSuccess, /copy\.success\.loadedModules/);
  assert.match(accountSuccess, /created\.products/);
});

test("cuenta de prueba rápida prepara datos y conserva la revisión de acceso", () => {
  assert.match(page, /Cuenta de prueba rápida/);
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

test("clientes resume facturacion mensual cuentas activas y usuarios reales", () => {
  assert.match(page, /projected_monthly_billing_cents/);
  assert.match(page, /active_customer_companies/);
  assert.match(page, /customer_active_users/);
  assert.match(page, /Facturaci.n mensual/);
  assert.match(page, /usuarios activos totales/);
});

test("la prueba sólo permite periodos controlados de 7 15 o 30 días", () => {
  assert.match(accountAccessStep, /trialDayOptions/);
  assert.match(
    trialExtension,
    /const options: TrialExtensionDays\[\] = \[7, 15, 30\]/,
  );
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
  assert.match(accountSpanishCopy, /Volver a iniciar sesión/);
  assert.match(accountFlow, /returnTo = "\/platform-admin"/);
  assert.match(accountFlow, /state: \{ authenticationExpired: true, returnTo \}/);
  assert.match(accountDraft, /temporary_password: omittedPassword/);
  assert.match(accountDraft, /Never persist the temporary password/);
  assert.match(page, /hasAccountCreationDraft\(\)/);
});

test("tipo de cuenta se persiste sin permitir conceder Root desde el alta", () => {
  assert.match(page, /Tipo de cuenta/);
  assert.match(customerRow, /UserTypeBadge/);
  assert.match(page, /value: "ROOT", label: "Root"/);
  assert.match(accountUtils, /account_type: "SUPER_ADMIN"/);
  assert.match(accountCompanyStep, /<option value="SUPER_ADMIN">/);
  assert.match(accountCompanyStep, /<option value="DISTRIBUTOR">/);
  assert.doesNotMatch(accountCompanyStep, /<option value="ROOT">/);
});

test("el tipo de cuenta se edita por modal y conserva Root fuera del flujo", () => {
  assert.match(customerTableCopy, /editType: "Editar tipo de usuario"/);
  assert.match(customerRow, /accountType !== "ROOT"/);
  assert.match(page, /AccountTypeEditModal/);
  assert.match(accountTypeEdit, /Editar tipo de usuario/);
  assert.match(accountTypeEdit, /<option value="SUPER_ADMIN">/);
  assert.match(accountTypeEdit, /<option value="DISTRIBUTOR">/);
  assert.doesNotMatch(accountTypeEdit, /<option value="ROOT">/);
  assert.match(platformApi, /updateCompanyAccountType/);
  assert.match(platformApi, /\/account-type/);
});

test("el estado comercial distingue activo prueba demo e inactivo", () => {
  assert.match(customerTableUtils, /basicCommercialStatus/);
  assert.match(page, /value: "active", label: english \? "Active" : "Activa"/);
  assert.match(page, /value: "trial", label: english \? "Trial" : "Prueba"/);
  assert.match(page, /value: "demo", label: "Demo"/);
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
  assert.match(page, /baja lógica/);
  assert.match(platformApi, /method: 'DELETE'/);
});

test("Root habilita demos públicas por empresa sin modificar el login normal", () => {
  assert.match(platformApi, /public_demo_enabled\?: boolean/);
  assert.match(platformApi, /updatePublicDemoAccess/);
  assert.match(platformApi, /\/public-demo/);
  assert.match(companyOverview, /Demo pública con credenciales/);
  assert.match(companyOverview, /role="switch"/);
  assert.match(companyOverview, /\/demo/);
  assert.match(page, /updatePublicDemoAccess/);
});

test("la tabla de clientes conserva identidad y acciones con el patrón Índice", () => {
  assert.match(customerTable, /IndiceTableShell pagination=\{pagination\}/);
  assert.match(customerTable, /IndiceOperationalTable/);
  assert.match(customerTable, /IndiceTableHeaderRow/);
  assert.match(customerTable, /usePersistentColumnWidths/);
  assert.match(customerTable, /tone="blue"/);
  assert.match(customerRow, /IndiceTableActionGroup/);
  assert.match(customerTableCopy, /manage: "Administrar"/);
});

test("la tabla separa el creador histórico del distribuidor vigente", () => {
  assert.match(customerTableCopy, /commercialOrigin: "Origen"/);
  assert.match(customerTableCopy, /createdByDistributor: "Creado por distribuidor"/);
  assert.match(customerTableCopy, /distributorAccount: "Cuenta distribuidora"/);
  assert.match(customerTraceability, /company\.creation_origin === "DISTRIBUTOR_PORTAL"/);
  assert.match(customerTraceability, /company\.created_by_distributor_company_name/);
  assert.match(customerTraceability, /company\.distributor_company_name/);
  assert.match(customerTraceability, /copy\.currentDistributor/);
  assert.match(customerTraceability, /copy\.originNotRegistered/);
  assert.match(customerTraceability, /text-sm font-medium/);
  assert.match(customerTraceability, /text-xs leading-4/);
  assert.match(customerTraceability, /grid h-9 w-9/);
  assert.doesNotMatch(customerTraceability, /shadow-sm/);
  assert.match(customerTableUtils, /case "distributor"/);
  assert.match(platformApi, /creation_origin\?:/);
  assert.match(platformApi, /distributor_company_name\?: string \| null/);
  assert.match(page, /company\.distributor_company_name/);
});

test("una cuenta cliente asigna cambia o retira su distribuidor por modal", () => {
  assert.match(customerRow, /accountType === "SUPER_ADMIN"/);
  assert.match(customerRow, /onAssignDistributor/);
  assert.match(customerTableCopy, /assignDistributor: "Asignar distribuidor"/);
  assert.match(page, /DistributorAssignmentModal/);
  assert.match(page, /updateCompanyDistributor/);
  assert.match(distributorAssignment, /distributors\.map/);
  assert.match(distributorAssignment, /value="direct"/);
  assert.match(distributorAssignment, /Desvincular distribuidor/);
  assert.match(platformApi, /\/distributor/);
});

test("la entrega de la cuenta permite copiar todos los datos de acceso", () => {
  assert.match(accountSpanishCopy, /Copiar datos/);
  assert.match(accountSpanishCopy, /Datos copiados/);
  assert.match(accountSuccess, /copy\.success\.loginPage/);
  assert.match(accountSuccess, /copy\.success\.password/);
  assert.match(accountSuccess, /writeClipboard/);
});

test("la cuenta separa módulos activos de los disponibles para agregar", () => {
  assert.match(companyModules, /Módulos activos/);
  assert.match(companyModules, /Disponibles para agregar/);
  assert.match(companyModules, /availableCatalogProducts/);
  assert.match(companyModules, /Sólo aparecen módulos publicados y listos comercialmente/);
  assert.match(companyModules, /onUpdateTrialProducts\(\[\.\.\.trialSelection, product\.product_code\]\)/);
  assert.match(companyModules, /onGrant\(product\.product_code\)/);
  assert.match(companyModules, /Esta cuenta ya tiene todos los módulos disponibles del catálogo/);
});

test("usuarios incluidos ocupan y liberan lugares con invitaciones controladas", () => {
  assert.match(customerTableColumns, /users: copy\.users/);
  assert.match(customerRow, /onOpenUsers\(company\)/);
  assert.match(customerRow, /copy\.manageUsers/);
  assert.match(page, /openCompanyUsers/);
  assert.match(page, /CustomerUsersModal/);
  assert.match(customerUsersModal, /CompanyActivityTab/);
  assert.match(customerUsersModal, /showBilling=\{false\}/);
  assert.match(companyActivity, /Capacidad de usuarios/);
  assert.match(companyActivity, /El propietario ocupa un lugar/);
  assert.match(companyActivity, /Activos/);
  assert.match(companyActivity, /Invitaciones/);
  assert.match(companyActivity, /Inactivos/);
  assert.match(companyActivity, /Invitar usuario/);
  assert.match(companyActivity, /lugar quedó reservado/);
  assert.match(companyActivity, /Desactivar y liberar lugar/);
  assert.match(companyActivity, /Reactivar/);
  assert.match(companyActivity, /available < 1/);
  assert.match(companyActivity, /Ajustar lugares/);
  assert.match(platformApi, /inviteCompanyUser/);
  assert.match(platformApi, /cancelCompanyUserInvitation/);
  assert.match(platformApi, /resendCompanyUserInvitation/);
  assert.match(platformApi, /updateCompanyUserStatus/);
});

test("sesiones nacen con cuenta horario destino y consultor sin exigir enlace", () => {
  assert.match(session, /companies\.map/);
  assert.match(session, /locations[\s\S]*filter\(\(location\) => location\.active\)/);
  assert.match(session, /consultants\.map/);
  assert.doesNotMatch(session, /Enlace HTTPS de reunión/);
  assert.doesNotMatch(session, /pattern="https:\/\/\.\*"/);
  assert.match(session, /value\.mode === "VIRTUAL" \|\| value\.serviceLocationCode/);
  assert.match(session, /footer=\{[\s\S]*<>[\s\S]*Cancelar[\s\S]*Siguiente[\s\S]*<\/>/);
  assert.match(session, /new Date\(value\.startAt\) <= new Date\(\)/);
  assert.match(consulting, /companies=\{companies\}/);
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
  assert.match(consulting, /Trazabilidad de la solicitud/);
  assert.match(consulting, /appointment\.booked_by_user_id/);
  assert.match(consulting, /Puedes reasignar/);
});

test("la cuenta se administra en un workspace compacto con pestañas directas", () => {
  assert.doesNotMatch(company, /IndiceModalWizardStepper/);
  assert.match(company, /role="tablist"/);
  assert.match(company, /id:\s*["']overview["']/);
  assert.match(company, /id:\s*["']modules["']/);
  assert.match(company, /id:\s*["']activity["']/);
  assert.match(company, /id:\s*["']access["']/);
  assert.match(company, /modalType="operational-workspace"/);
  assert.match(company, /tone="blue"/);
  assert.match(company, /onOpenChange=\{\(nextOpen\)/);
  assert.match(company, /footerSummary=/);
  assert.match(company, />\s*Cerrar\s*</);
  assert.match(company, /className="cursor-pointer"/);
  assert.match(company, /Number\.isFinite/);
  assert.doesNotMatch(company, /h-\[92dvh\]/);
  assert.doesNotMatch(company, /Siguiente|Anterior|Paso \d/);
  assert.match(company, /BenefitAdjustmentModal/);
  assert.match(companyAccess, /Crear ajuste/);
  assert.match(adjustment, /accessReasonOptions/);
  assert.match(adjustment, /extraSeatOptions/);
  assert.match(adjustment, /Selecciona un módulo/);
});

test("catálogo presenta módulos y monedas controladas en lenguaje operativo", () => {
  assert.match(page, /Módulos incluidos/);
  assert.match(page, /product\.capabilities\.includes\(module\.slug\)/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /Importe.*price\.currency/);
  assert.match(page, /Referencia de cobro de Stripe/);
  assert.doesNotMatch(page, /Capacidades \(separadas por coma\)/);
  assert.doesNotMatch(page, /Código facturable/);
});

test("precios del catálogo agrupa variantes técnicas por producto comercial", () => {
  assert.match(page, /buildCatalogPriceGroups/);
  assert.match(page, /Productos con precio/);
  assert.match(page, /Requieren atención/);
  assert.match(page, /Listos para vender/);
  assert.match(page, /Precios comerciales/);
  assert.match(page, /Mensual/);
  assert.match(page, /Anual/);
  assert.match(page, /catalogPriceTypeLabel/);
  assert.match(page, /IndiceTableActionGroup/);
  assert.doesNotMatch(page, /priceIntervalFilter/);
});

test("Root crea paquetes y administra sus módulos incluidos desde la interfaz", () => {
  assert.match(page, /Nuevo paquete/);
  assert.match(page, /createCatalogProduct/);
  assert.match(page, /capabilities: target\.value\.capabilities/);
  assert.match(page, /modules\.filter\(\(module\) => module\.assignment_enabled\)/);
  assert.match(page, /product\.capabilities\.includes\(module\.slug\)/);
  assert.match(page, /Módulos incluidos/);
  assert.match(platformApi, /createCatalogProduct/);
  assert.match(platformApi, /capabilities: string\[\]/);
});

test("el catálogo se prepara valida y publica como versión antes de cambiar la oferta activa", () => {
  assert.match(platformApi, /createCatalogDraft/);
  assert.match(platformApi, /validateCatalogDraft/);
  assert.match(platformApi, /publishCatalogDraft/);
  assert.match(platformApi, /endpoints\.platformAdmin\.catalog\}\/drafts/);
  assert.match(page, /Oferta en preparación/);
  assert.match(page, /Validar oferta/);
  assert.match(page, /Publicar oferta/);
  assert.match(page, /Stripe test/);
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
  assert.match(allCompanyActivityPanel, /Active users/);
  assert.match(allCompanyActivityPanel, /Customize/);
  assert.match(allCompanyActivityPanel, /Load more activity/);
  assert.doesNotMatch(allCompanyActivityPanel, /BarChart/);
});
