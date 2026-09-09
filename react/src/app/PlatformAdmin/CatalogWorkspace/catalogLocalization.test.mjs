import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
let languageCode = 'en-CA';
const cache = new Map();
function load(input) {
  const file = [input, `${input}.ts`, `${input}.tsx`, resolve(input, 'index.ts')].find((candidate) => existsSync(candidate) && /\.tsx?$/.test(candidate));
  assert.ok(file, `Missing module: ${input}`);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const source = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const localRequire = (id) => {
    if (id.endsWith('/shared/context')) return { useLanguage: () => ({ currentLanguage: { code: languageCode } }) };
    return id.startsWith('.') ? load(resolve(dirname(file), id)) : require(id);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const root = import.meta.dirname;
const { catalogTranslations, catalogLocale, getCatalogCopy, formatCatalogCopy } = load(resolve(root, 'translations/index.ts'));
const { catalogProductLabel, catalogModuleLabel, catalogModuleDescription, catalogCapabilityLabel, catalogConfigurationLabel } = load(resolve(root, 'catalogLabels.ts'));
const { countryLabel, flowOptionLabel, industryOptions, accessReasonOptions, moduleAvailabilityReasonOptions, revocationReasonOptions } = load(resolve(root, '../flowOptions.ts'));
const { buildModuleAvailabilityRows } = load(resolve(root, 'moduleAvailabilityModel.ts'));
const { stripeEnvironmentLabel } = load(resolve(root, 'commercialOfferPresentation.ts'));

test('all eight supported locale catalogs have complete keys and matching placeholders', () => {
  assert.deepEqual(Object.keys(catalogTranslations), ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']);
  const base = getCatalogCopy('en-CA');
  for (const [locale, copy] of Object.entries(catalogTranslations)) {
    assert.deepEqual(Object.keys(copy), Object.keys(base), locale);
    for (const [key, value] of Object.entries(copy)) {
      assert.equal(typeof value, 'string', `${locale}.${key}`);
      assert.ok(value.trim(), `${locale}.${key}`);
      assert.deepEqual(value.match(/\{\d+\}/g) ?? [], base[key].match(/\{\d+\}/g) ?? [], `${locale}.${key}`);
    }
    assert.equal(copy.publicarENSTRIPELIVE, 'PUBLICAR EN STRIPE LIVE');
  }
});

test('unsupported locales fall back to en-CA; regional and legacy inputs remain compatible', () => {
  for (const locale of ['en', 'es', 'fr', 'ko', 'zh', 'unknown', '__proto__']) assert.equal(catalogLocale(locale), 'en-CA');
  assert.equal(getCatalogCopy('en-US'), getCatalogCopy('en-CA'));
  assert.equal(getCatalogCopy('es-CO'), getCatalogCopy('es-MX'));
  assert.equal(getCatalogCopy(true), getCatalogCopy('en-CA'));
  assert.equal(getCatalogCopy(false), getCatalogCopy('es-MX'));
  assert.equal(stripeEnvironmentLabel('LIVE', 'fr-CA'), 'Mode réel');
  assert.equal(stripeEnvironmentLabel('TEST', false), 'Modo de prueba');
  assert.equal(formatCatalogCopy(getCatalogCopy('ko-CA').publishOfferInStripe, 'LIVE'), 'Stripe LIVE에 상품 게시');
});

test('known seeded module/product names translate, custom author text and unknown codes stay unchanged', () => {
  assert.equal(catalogProductLabel({ product_code: 'module_hr', display_name: 'Recursos Humanos' }, 'fr-CA'), 'Ressources humaines');
  assert.equal(catalogProductLabel({ product_code: 'module_hr', display_name: 'Our people package' }, 'fr-CA'), 'Our people package');
  assert.equal(catalogProductLabel({ product_code: 'controla', display_name: 'Controla' }, 'ko-CA'), 'Controla');
  assert.equal(catalogModuleLabel({ slug: 'processes', name: 'Procesos y Tareas' }, 'ko-CA'), '작업 및 프로세스');
  assert.equal(catalogModuleDescription({ slug: 'human_resources', description: 'Gestión de empleados, asistencia y nómina' }, 'zh-CA'), '员工、考勤与薪资管理');
  assert.equal(catalogModuleDescription({ slug: 'human_resources', description: 'Client-specific requirements' }, 'zh-CA'), 'Client-specific requirements');
  assert.equal(catalogCapabilityLabel('custom_module_code', 'fr-CA'), 'custom_module_code');
  assert.equal(catalogConfigurationLabel('released', 'pt-BR'), 'Publicado');
  assert.equal(catalogConfigurationLabel('future_status', 'pt-BR'), 'future_status');
});

test('module row rendering follows locale without changing source authority', () => {
  const module = { id: 5, slug: 'human_resources', name: 'Recursos Humanos', category: 'basic', description: '', assignment_enabled: true, is_core: false, is_active: true, lifecycle_status: 'released', access_model: 'tabs' };
  const before = structuredClone(module);
  const [row] = buildModuleAvailabilityRows([module], [], 'fr-CA');
  assert.equal(row.name, 'Ressources humaines');
  assert.equal(row.configurationLabel, 'Publié · Accès par onglet');
  assert.equal(row.description, 'Description opérationnelle à fournir.');
  assert.equal(row.module, module);
  assert.deepEqual(module, before);
});

test('all persisted form options have translations; arbitrary authored reasons are preserved', () => {
  const values = [...industryOptions, ...accessReasonOptions, ...moduleAvailabilityReasonOptions, ...revocationReasonOptions];
  for (const locale of ['en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA']) {
    for (const value of values) {
      if (locale === "pt-BR" && ["Seguros", "Código comprometido"].includes(value)) continue;
      assert.notEqual(flowOptionLabel(value, locale), value, `${locale}: ${value}`);
    }
  }
  assert.equal(flowOptionLabel('Custom customer arrangement', 'fr-CA'), 'Custom customer arrangement');
  assert.equal(countryLabel('CA', 'ko-CA'), '캐나다');
  assert.equal(countryLabel('CA', 'unknown'), 'Canada');
  assert.equal(accessReasonOptions[0], 'Demostración comercial');
});

test('Stripe panel renders the selected language independently of legacy english prop and leaves billing gates unchanged', () => {
  const { createElement } = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { StripeSetupPanel } = load(resolve(root, '../BillingWorkspace/StripeSetupPanel.tsx'));
  const environment = { mode: 'LIVE', enabled: false, catalog_live_sync_enabled: false };
  const before = structuredClone(environment);
  for (const locale of Object.keys(catalogTranslations)) {
    languageCode = locale;
    const markup = renderToStaticMarkup(createElement(StripeSetupPanel, { english: true, environment, onRefresh() {}, canDemoConnect: true, demoConnected: true }));
    const copy = getCatalogCopy(locale);
    assert.ok(markup.includes(copy.stripeConnection), locale);
    assert.ok(markup.includes(copy.demoConnectedSimulated), locale);
    assert.ok(markup.includes(copy.customerBilling), locale);
    assert.ok(!markup.includes('type="password"'));
  }
  assert.deepEqual(environment, before);
});

test('every backend catalog publication blocker has a localized message contract', () => {
  const { catalogValidationMessageKeys } = load(resolve(root, 'catalogValidationMessage.ts'));
  const backend = resolve(root, '../../../../../src/main/java/com/indice/erp/platformadmin');
  const management = readFileSync(resolve(backend, 'PlatformCatalogManagementService.java'), 'utf8');
  const localValidation = management.slice(management.indexOf('private List<Map<String, Object>> draftBlockers'), management.indexOf('private ProductRow product'));
  const stripeValidation = readFileSync(resolve(backend, 'PlatformCatalogStripeVerificationService.java'), 'utf8');
  const codes = new Set([
    ...Array.from(localValidation.matchAll(/"code"\s*,\s*"([A-Z_]+)"/g), match => match[1]),
    ...Array.from(stripeValidation.matchAll(/blocker\(\s*"([A-Z_]+)"/g), match => match[1]),
  ]);
  assert.equal(codes.size, 12);
  assert.deepEqual([...codes].sort(), Object.keys(catalogValidationMessageKeys).sort());
});

test('catalog blockers localize all codes, preserve product IDs and never expose backend/provider prose', () => {
  const { catalogValidationMessage, catalogValidationMessageKeys } = load(resolve(root, 'catalogValidationMessage.ts'));
  for (const locale of Object.keys(catalogTranslations)) {
    for (const code of Object.keys(catalogValidationMessageKeys)) {
      const blocker = { code, product_code: 'module_custom_customer', message: 'RAW_PROVIDER_PROSE' };
      const text = catalogValidationMessage(blocker, locale);
      assert.equal(text, `module_custom_customer: ${getCatalogCopy(locale)[catalogValidationMessageKeys[code]]}`);
      assert.ok(!text.includes('RAW_PROVIDER_PROSE'));
    }
    for (const code of ['FUTURE_BACKEND_CODE', '__proto__', 'constructor']) {
      assert.equal(catalogValidationMessage({ code, product_code: '', message: 'RAW_PROVIDER_PROSE' }, locale), getCatalogCopy(locale).validationReviewRequired);
    }
  }
  assert.equal(catalogValidationMessage({ code: 'EMPTY_OFFER', product_code: 'catalog', message: '' }, 'unknown'), `catalog: ${getCatalogCopy('en-CA').validationEmptyOffer}`);
});
