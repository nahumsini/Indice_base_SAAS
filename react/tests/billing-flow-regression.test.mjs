import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const app = read("src/app/App.tsx");
const page = read("src/app/Billing/SubscriptionManagementPage.tsx");
const panel = read("src/app/Billing/components/BillingConfigurationPanel.tsx");
const userControl = read("src/app/Billing/components/BillingUserControl.tsx");
const priceSummary = read("src/app/Billing/components/BillingPriceSummary.tsx");
const overview = read("src/app/Billing/components/BillingOverviewBar.tsx");
const decisionGuide = read("src/app/Billing/components/BillingDecisionGuide.tsx");
const hero = read("src/app/Billing/components/BillingHero.tsx");
const adminWorkspaceHeader = read("src/app/components/frontend-os/IndiceAdminWorkspaceHeader.tsx");
const modules = read("src/app/Billing/components/ModuleSelectionPanel.tsx");
const productCard = read("src/app/Billing/components/BillingProductCard.tsx");
const actionDock = read("src/app/Billing/components/BillingActionDock.tsx");
const payment = read("src/app/Billing/components/BillingPaymentSection.tsx");
const presentation = read("src/app/Billing/billingPresentation.adapter.ts");
const formatters = read("src/app/Billing/billingFormatters.ts");
const translations = read("src/app/Billing/translations/index.ts");
const hook = read("src/app/Billing/hooks/useBillingManagement.ts");
const api = read("src/app/api/billing.ts");
const endpoints = read("src/app/api/endpoints.ts");
const header = read("src/app/components/Header.tsx");
const signup = read("src/app/Auth/SignupPage.tsx");

test("billing es una pantalla real del ERP y no una ruta paralela", () => {
  assert.match(app, /currentPage === ['"]billing['"]/);
  assert.match(app, /<SubscriptionManagementPage/);
  assert.match(header, /navigate\(['"]\/billing['"]\)/);
  assert.match(page, /BillingHero/);
});

test("el administrador de cuenta conserva contexto y hace navegables sus tres decisiones", () => {
  assert.match(page, /data-billing-sticky-header/);
  assert.match(page, /sticky top-0 z-30/);
  assert.match(page, /BillingDecisionGuide/);
  assert.match(hero, /IndiceAdminWorkspaceHeader/);
  assert.match(adminWorkspaceHeader, /data-indice-admin-workspace-header/);
  assert.match(decisionGuide, /copy\.configurationGuide/);
  assert.match(decisionGuide, /IndiceWorkspaceNavigation/);
  assert.match(decisionGuide, /tone="blue"/);
  assert.match(decisionGuide, /scrollIntoView/);
  assert.match(modules, /id="billing-plan"/);
  assert.match(userControl, /id="billing-people"/);
  assert.match(payment, /id="billing-payment"/);
});

test("la consulta delegada limpia el contexto y vuelve al portal de origen", () => {
  assert.match(hook, /await managedCompanyApi\.clear\(\)/);
  assert.match(hook, /authority_mode === ['"]PLATFORM_ROOT['"][\s\S]*['"]\/platform-admin['"]/);
  assert.match(hook, /authority_mode === ['"]DISTRIBUTOR_PORTFOLIO['"][\s\S]*['"]\/distributor-portal['"]/);
  assert.match(hook, /navigate\(destination, \{ replace: true \}\)/);
  assert.match(page, /leaving=\{billing\.action === ['"]back['"]\}/);
});

test("el selector de clientes abre el ERP del cliente en modo consultoría", () => {
  assert.match(header, /managedCompanyApi\.activate\(companyId\)[\s\S]*window\.location\.assign\(['"]\/dashboard['"]\)/);
  assert.match(header, /Consulta operativa · Solo lectura/);
  assert.match(header, /Consultando \$\{managedContext\.active_company\.name\}/);
  assert.match(header, /Ves su interfaz y sus datos como superadministrador\. Los cambios están bloqueados\./);
  assert.match(header, /handleManagedCompanyClear/);
});

test("la selección siempre viene del catálogo comercial del backend", () => {
  assert.match(hook, /billingApi\.selection/);
  assert.match(modules, /groups\.map/);
  assert.match(modules, /groupedProducts\.map/);
  assert.match(modules, /product_type === ['"]BASIC['"]/);
  assert.match(modules, /product_type === ['"]ADDON['"]/);
  assert.match(page, /available_products/);
  assert.match(modules, /product\.product_code/);
  assert.doesNotMatch(modules, /basic_hr[\s\S]*basic_process_tasks/);
  assert.match(api, /selection/);
  assert.match(endpoints, /selection:\s*['"]\/api\/v1\/billing\/subscription\/selection['"]/);
});

test("una cortesía se conecta a Stripe conservando el periodo restante", () => {
  assert.match(panel, /selection\.payment_method_required/);
  assert.match(panel, /onActivate/);
  assert.match(hook, /billingApi\.activate/);
  assert.match(hook, /window\.location\.assign\(response\.checkout_url\)/);
  assert.match(api, /remaining_trial_days/);
});

test("el alta por cortesía no depende de precios publicados", () => {
  assert.match(signup, /const courtesyRequested = form\.courtesyCode\.trim\(\)\.length > 0/);
  assert.match(signup, /&& \(courtesyRequested \|\| estimatedAmount !== null\)/);
});

test("los cambios respetan capacidad y se cobran en el corte correspondiente", () => {
  assert.match(userControl, /minimumExtra/);
  assert.match(userControl, /visible\.used_seats - props\.visible\.included_seats/);
  assert.match(priceSummary, /TRIAL_END/);
  assert.match(priceSummary, /NEXT_INVOICE/);
  assert.doesNotMatch(priceSummary, /IMMEDIATE_PRORATION/);
  assert.match(hook, /billingApi\.previewSelection/);
  assert.match(hook, /billingApi\.updateSelection/);
});

function billingPreviewScenario({ changed, previewRequest }) {
  const start = hook.indexOf('    if (state.loading || readOnly || !state.selection) return;');
  const end = hook.indexOf('\n  }, [copy.emptySelection', start);
  assert.ok(start > 0 && end > start, 'preview effect must be present');
  const savedSelection = { catalog_version: 'agreed-v1', estimated_amount_cents: 7900 };
  let current = { loading: false, selection: savedSelection, preview: null, error: '' };
  let scheduled = null;
  let calls = 0;
  const scope = {
    state: current, readOnly: false, hasChanges: changed,
    payload: { product_codes: ['module_hr'], billing_interval: 'MONTH', extra_seats: 1 },
    window: { setTimeout: (callback) => { scheduled = callback; return 1; }, clearTimeout: () => { scheduled = null; } },
    billingApi: { previewSelection: async () => { calls += 1; return previewRequest(); } },
    setState: (update) => { current = update(current); },
    copy: { emptySelection: 'empty selection' },
  };
  const cleanup = new Function(...Object.keys(scope), hook.slice(start, end))(...Object.values(scope));
  return { cleanup, run: () => scheduled?.(), current: () => current, calls: () => calls, savedSelection };
}

test('abrir un contrato histórico conserva su precio sin solicitar un catálogo nuevo', () => {
  const scenario = billingPreviewScenario({ changed: false, previewRequest: () => { throw new Error('must not quote'); } });
  scenario.run();
  assert.equal(scenario.calls(), 0);
  assert.equal(scenario.current().preview, scenario.savedSelection);
  assert.equal(scenario.current().preview.estimated_amount_cents, 7900);
});

test('un cambio explícito sigue obteniendo la nueva cotización del backend', async () => {
  const quote = { catalog_version: 'new-v2', estimated_amount_cents: 9900 };
  const scenario = billingPreviewScenario({ changed: true, previewRequest: async () => quote });
  await scenario.run();
  assert.equal(scenario.calls(), 1);
  assert.equal(scenario.current().preview, quote);
  scenario.cleanup();
});

test('una respuesta anterior no sustituye el contrato restaurado ni muestra errores obsoletos', async () => {
  for (const failed of [false, true]) {
    let resolveRequest;
    let rejectRequest;
    const pending = new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; });
    const scenario = billingPreviewScenario({ changed: true, previewRequest: () => pending });
    const completed = scenario.run();
    scenario.cleanup();
    if (failed) rejectRequest(new Error('outdated quote failed'));
    else resolveRequest({ catalog_version: 'outdated-v2', estimated_amount_cents: 9900 });
    await completed;
    assert.equal(scenario.current().preview, null);
    assert.equal(scenario.current().error, '');
  }
});

test("la experiencia expresa usuarios totales y calcula incluidos, adicionales y disponibles", () => {
  assert.match(page, /BillingOverviewBar/);
  assert.match(overview, /selection\.included_seats \+ selection\.extra_seats/);
  assert.match(userControl, /licensedUsers = props\.visible\.included_seats \+ props\.extraSeats/);
  assert.match(userControl, /normalized - props\.visible\.included_seats/);
  assert.match(userControl, /type="number"/);
  assert.match(userControl, /availableUsers/);
  assert.match(userControl, /pendingInvitations/);
});

test("la interfaz presenta el contrato actual y el próximo corte sin filtrar códigos internos", () => {
  assert.match(overview, /toBillingPresentation/);
  assert.match(overview, /currentModuleCount/);
  assert.match(overview, /targetModuleCount/);
  assert.doesNotMatch(overview, /selection\.offer_code/);
  assert.match(formatters, /Intl\.NumberFormat\(locale/);
  assert.match(formatters, /Intl\.DateTimeFormat\(locale/);
});

test("los módulos tienen identidad localizada y no contienen nombres de producto codificados", () => {
  assert.match(modules, /BillingProductCard/);
  assert.match(productCard, /copy\.moduleNames/);
  assert.match(productCard, /copy\.capabilityNames/);
  assert.match(productCard, /formatBillingMoney/);
  assert.doesNotMatch(productCard, /basic_hr|basic_process_tasks|basic_expenses/);
  assert.match(translations, /moduleNamesEs/);
  assert.match(translations, /moduleNamesEn/);
});

test("billing mantiene una sola acción comercial primaria según el estado", () => {
  assert.match(panel, /BillingActionDock/);
  assert.match(presentation, /'ACTIVATE' \| 'RETRY_SYNC' \| 'SCHEDULE' \| 'NONE'/);
  assert.match(actionDock, /isActivation \? props\.onActivate : props\.onSave/);
  assert.doesNotMatch(payment, /onActivate/);
  assert.match(payment, /variant="outline"/);
});

test("el backend consulta el nombre real del estado comercial y proyecta la capacidad", () => {
  const service = read("../src/main/java/com/indice/erp/billing/subscription/BillingProductSelectionService.java");
  assert.match(service, /SELECT state FROM company_commercial_states WHERE company_id = \?/);
  assert.doesNotMatch(service, /SELECT status FROM company_commercial_states WHERE company_id = \?/);
  assert.match(service, /selection\.includedSeats\(\) \+ selection\.extraSeats\(\) \+ snapshot\.benefitExtra\(\)/);
});
