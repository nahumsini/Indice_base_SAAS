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
const modules = read("src/app/Billing/components/ModuleSelectionPanel.tsx");
const hook = read("src/app/Billing/hooks/useBillingManagement.ts");
const api = read("src/app/api/billing.ts");
const endpoints = read("src/app/api/endpoints.ts");
const header = read("src/app/components/Header.tsx");

test("billing es una pantalla real del ERP y no una ruta paralela", () => {
  assert.match(app, /currentPage === ['"]billing['"]/);
  assert.match(app, /<SubscriptionManagementPage/);
  assert.match(header, /navigate\(['"]\/billing['"]\)/);
  assert.match(page, /BillingHero/);
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

test("los cambios respetan capacidad y se cobran en el corte correspondiente", () => {
  assert.match(userControl, /minimumExtra/);
  assert.match(userControl, /visible\.used_seats - props\.visible\.included_seats/);
  assert.match(priceSummary, /TRIAL_END/);
  assert.match(priceSummary, /NEXT_INVOICE/);
  assert.doesNotMatch(priceSummary, /IMMEDIATE_PRORATION/);
  assert.match(hook, /billingApi\.previewSelection/);
  assert.match(hook, /billingApi\.updateSelection/);
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

test("el backend consulta el nombre real del estado comercial y proyecta la capacidad", () => {
  const service = read("../src/main/java/com/indice/erp/billing/subscription/BillingProductSelectionService.java");
  assert.match(service, /SELECT state FROM company_commercial_states WHERE company_id = \?/);
  assert.doesNotMatch(service, /SELECT status FROM company_commercial_states WHERE company_id = \?/);
  assert.match(service, /selection\.includedSeats\(\) \+ selection\.extraSeats\(\) \+ snapshot\.benefitExtra\(\)/);
});
