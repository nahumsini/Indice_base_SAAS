import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { hookRuntime, loadTypescript } from './helpers/hook-runtime.mjs';

const root = resolve(import.meta.dirname, '../src');
const folder = resolve(root, 'app/Public/Investment');
const read = path => readFileSync(resolve(root, path), 'utf8');
const content = loadTypescript(resolve(folder, 'investmentContent.ts'), () => {
  throw new Error('Investment content must remain static');
});
const commercial = loadTypescript(resolve(folder, 'commercialPresentationContent.ts'), name => {
  if (name === './investmentContent') return content;
  throw new Error(`Commercial presentation must remain static: ${name}`);
});
const modules = loadTypescript(resolve(folder, 'investmentModules.ts'), () => {
  throw new Error('Investment module catalogue must remain static');
});
const proforma = loadTypescript(resolve(folder, 'investmentProforma.ts'), () => {
  throw new Error('Investment pro forma must remain static');
});
const ui = loadTypescript(resolve(folder, 'investmentUiCopy.ts'), () => {
  throw new Error('Investment UI copy must remain static');
});
const header = loadTypescript(resolve(root, 'app/components/header/translations/index.ts'), () => {
  throw new Error('Header translations must remain static');
});

const expectedTabs = [
  'overview',
  'modules',
  'market',
  'business',
  'partners',
  'ai',
  'proforma',
];
const expectedLocales = ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];
const expectedCommercialTabs = ['proposal', 'operation', 'capabilities', 'agents', 'pricing', 'implementation'];
const expectedTabEmojis = ['🧭', '🧩', '🎯', '💼', '🤝', '🤖', '📊'];
const expectedModuleIds = [
  'home-panel',
  'human-resources',
  'processes-tasks',
  'sales',
  'point-of-sale',
  'inventory',
  'expenses',
  'petty-cash',
  'receivables',
  'kpis',
];
const requiredUiFields = [
  'welcome', 'subtitle', 'document', 'sections', 'central', 'next', 'source', 'language',
  'currency', 'dark', 'learning', 'learningOn', 'learningHint', 'disclaimer', 'skip',
  'learn', 'night', 'light', 'overview', 'module', 'duration', 'durationLabel',
  'sectionsLabel', 'environment', 'reference', 'demo', 'toolsLabel', 'notificationsNew',
  'sampleNotification', 'now', 'fiveMinutesAgo', 'notificationFooter', 'profileName',
  'profileNote', 'kioskCenter', 'presentationContext',
];

test('the presentation exposes seven useful sections and safely falls back to overview', () => {
  assert.deepEqual(content.investmentTabs.map(tab => tab[0]), expectedTabs);
  assert.deepEqual(content.investmentLocaleCodes, expectedLocales);
  assert.deepEqual(Object.keys(content.investmentSections), expectedLocales);

  for (const locale of expectedLocales) {
    const sections = content.investmentSections[locale];
    const overviewParagraphs = content.investmentOverviewParagraphs[locale];
    assert.deepEqual(Object.keys(sections), expectedTabs);
    assert.equal(overviewParagraphs.length, 3, `${locale} needs exactly three overview paragraphs`);
    assert.ok(overviewParagraphs.every(paragraph => paragraph.trim().length > 40), `${locale} overview paragraphs must be substantive`);
    assert.ok(content.marketSource.titles[locale].trim().length > 0, `${locale} needs a market-source title`);
    assert.equal(content.investmentTabs.filter(([, labels]) => labels[locale]?.trim()).length, 7, `${locale} needs seven tab labels`);
    assert.ok(content.marketSignals.every(signal => signal.labels[locale]?.trim()), `${locale} needs every market-signal label`);
    for (const id of expectedTabs) {
      const section = sections[id];
      assert.ok(section.items.length >= 3, `${id} needs substantive presentation items`);
      assert.ok(section.evidence.length >= 3, `${id} needs supporting evidence`);
      for (const key of ['eyebrow', 'title', 'description', 'takeaway', 'takeawayDetail', 'itemsTitle', 'evidenceTitle', 'next']) {
        assert.ok(section[key].trim().length > 0, `${id}.${key} must not be empty`);
      }
    }
  }

  for (const value of [null, '', 'sales', 'success', 'MARKET', 'constructor', '__proto__', '<script>alert(1)</script>']) {
    assert.equal(content.resolveInvestmentTab(value), 'overview');
  }
  assert.equal(new URL(content.marketSource.url).hostname, 'www.inegi.org.mx');
  assert.match(content.marketSource.titles['es-MX'], /2024/);
});

test('all eight real locales have complete structural copy', () => {
  assert.deepEqual(ui.investmentLanguages.map(language => language.code), expectedLocales);
  assert.deepEqual(ui.investmentLanguages.map(language => language.flag), ['🇲🇽', '🇨🇴', '🇺🇸', '🇨🇦', '🇨🇦', '🇧🇷', '🇰🇷', '🇨🇳']);

  for (const locale of expectedLocales) {
    const copy = ui.getInvestmentUiCopy(locale);
    for (const field of requiredUiFields) {
      assert.equal(typeof copy[field], 'string', `${locale}.${field} must be text`);
      assert.ok(copy[field].trim().length > 0, `${locale}.${field} must not be empty`);
    }
    assert.equal(typeof header.getHeaderTranslations(locale).actions.profile, 'string');
  }
});

test('the commercial presentation provides a six-stage localized narrative', () => {
  assert.deepEqual(commercial.commercialPresentationTabs.map(tab => tab[0]), expectedCommercialTabs);
  assert.deepEqual(Object.keys(commercial.commercialPresentationContent), expectedLocales);
  assert.equal(commercial.resolveCommercialPresentationTab('agents'), 'agents');
  for (const invalid of [null, '', 'overview', 'market', 'business', 'constructor']) {
    assert.equal(commercial.resolveCommercialPresentationTab(invalid), 'proposal');
  }

  for (const locale of expectedLocales) {
    const copy = commercial.commercialPresentationContent[locale];
    assert.equal(commercial.commercialPresentationTabs.filter(([, labels]) => labels[locale]?.trim()).length, 6);
    for (const field of ['subtitle', 'sectionSummary', 'centralLabel', 'footer']) {
      assert.ok(copy[field].trim().length > 0, `${locale}.${field} must not be empty`);
    }
    for (const tab of expectedCommercialTabs) {
      const section = copy[tab];
      for (const field of ['eyebrow', 'title', 'lead', 'next']) {
        assert.ok(section[field].trim().length > 0, `${locale}.${tab}.${field} must not be empty`);
      }
    }
    assert.equal(copy.proposal.frictions.length, 3);
    assert.equal(copy.proposal.results.length, 3);
    assert.equal(copy.operation.lanes.length, 3);
    assert.equal(copy.capabilities.pillars.length, 4);
    assert.equal(copy.capabilities.packages.length, 3);
    assert.equal(copy.agents.agents.length, 4);
    assert.equal(copy.agents.questions.length, 4);
    assert.equal(copy.pricing.plans.length, 3);
    assert.equal(copy.pricing.offerIncludes.length, 4);
    assert.equal(copy.implementation.steps.length, 4);
  }

  const spanish = commercial.commercialPresentationContent['es-MX'];
  assert.match(spanish.proposal.statement, /Tu equipo opera/);
  assert.match(spanish.capabilities.lead, /120 herramientas/);
  assert.match(spanish.agents.coordinatorDescription, /ChatGPT o Claude/);
  for (const plan of ['controla', 'escala', 'corporate']) {
    assert.deepEqual(commercial.commercialPlanPrices[plan], { monthlyMxn: null, annualMxn: null }, 'Unverified Mexico rates must not be invented or converted from the older USD catalog');
  }
  assert.equal(commercial.commercialPlanPrices.includedSeats, 10);
  assert.equal(commercial.commercialPlanPrices.additionalSeatMonthlyMxn, undefined);
  assert.equal(commercial.commercialPlanPrices.communityImplementationMxn, 4500);
  assert.equal(commercial.commercialPlanPrices.communityImplementationPeople, 10);
  assert.match(spanish.pricing.offerLabel, /Master Muñoz/);
  assert.match(spanish.pricing.offerDescription, /Carlos Muñoz/);
  assert.match(spanish.pricing.offerCondition, /suscripción mensual.*por separado/);
  assert.doesNotMatch(JSON.stringify(spanish.pricing), /USD/);
  assert.match(spanish.implementation.trialLabel, /15 días/);
  assert.match(spanish.implementation.supportDescription, /consultor/);
});

test('commercial copy reflects the new website offer without mixing the previous catalog', () => {
  const spanish = commercial.commercialPresentationContent['es-MX'];
  assert.match(spanish.proposal.lead, /sin multiplicar tu estructura gerencial/);
  assert.match(spanish.pricing.lead, /bloques de diez/);
  assert.match(spanish.pricing.lead, /una sola vez/);
  assert.match(spanish.capabilities.scopeNote, /Modo Aprendiz/);
  assert.match(spanish.agents.coordinatorDescription, /compatibilidad.*cuenta.*permisos/);
  assert.match(spanish.operation.lanes[2].description, /compatibilidad.*cuenta.*permisos/);
  assert.doesNotMatch(spanish.pricing.plans[0].includes.join(' '), /KPIs/);
  assert.match(spanish.pricing.plans[1].includes.join(' '), /Ventas o POS/);
  assert.match(spanish.pricing.plans[2].includes.join(' '), /Ventas y POS.*Cartera.*Módulo ejecutivo de KPIs/);
  assert.match(spanish.implementation.steps[1].description, /alta y la primera mensualidad/);
  assert.match(spanish.implementation.trialDescription, /antes de contratar/);
  const pendingLabels = ['Por confirmar', 'Por confirmar', 'To be confirmed', 'To be confirmed', 'À confirmer', 'A confirmar', '확인 예정', '待确认'];
  expectedLocales.forEach((locale, index) => {
    const pricing = commercial.commercialPresentationContent[locale].pricing;
    assert.equal(pricing.pendingPriceLabel, pendingLabels[index]);
    assert.match(pricing.commonItems[0], /10/);
    assert.match(pricing.beforeTaxLabel, /MXN/);
    assert.doesNotMatch(JSON.stringify(pricing), /\b220\b|\b1800\b|\b2700\b|\b3600\b|USD/);
  });
});

test('target profiles prioritize scaling companies with 10 to 30 employees', () => {
  const spanishMarket = content.investmentSections['es-MX'].market;
  const spanishProfiles = spanishMarket.items;
  assert.deepEqual(spanishProfiles.map(profile => profile.title), [
    'Empresas de 10 a 30 colaboradores',
    'Equipos con información dispersa',
    'Operaciones dependientes de personas clave',
  ]);
  assert.match(spanishProfiles[0].description, /desbordar el control manual/);
  assert.equal(spanishMarket.evidenceTitle, 'Señales de encaje');
  assert.deepEqual(spanishMarket.evidence.map(signal => signal.title), [
    'Momento de crecimiento',
    'Fricción operativa',
    'Dependencia crítica',
  ]);
  assert.match(spanishMarket.next, /costo del desorden/);

  for (const locale of expectedLocales) {
    const market = content.investmentSections[locale].market;
    const profiles = market.items;
    assert.equal(profiles.length, 3);
    assert.match(profiles[0].title, /10.*30/, `${locale} must retain the target company size`);
    assert.equal(market.evidence.length, 3);
    assert.ok(market.evidenceTitle.trim().length > 0);
    assert.ok(market.next.trim().length > 30);
  }
});

test('the business model presents the documented customer journey without overstating consulting access', () => {
  const spanish = content.investmentSections['es-MX'].business;
  assert.equal(spanish.title, 'Del primer contacto al acompañamiento continuo.');
  assert.deepEqual(spanish.items.map(step => step.title), [
    'Contacto y confianza',
    'Consultoría inicial sin costo',
    'Implementación enfocada',
    'Seguimiento del consultor',
    'Sesión mensual incluida',
    'Otra mirada desde la red',
  ]);
  assert.match(spanish.items[1].description, /60 a 90 minutos/);
  assert.match(spanish.items[2].description, /contratar/);
  assert.match(spanish.items[4].description, /60 minutos/);
  assert.match(spanish.items[4].description, /no se acumula/);
  assert.match(spanish.items[5].description, /solicitar a su distribuidor o a otro consultor/);
  assert.match(spanish.items[5].description, /tema y la disponibilidad/);
  assert.equal(spanish.evidence.length, 3);

  for (const locale of expectedLocales) {
    const business = content.investmentSections[locale].business;
    const journeyUi = content.customerJourneyUi[locale];
    assert.equal(business.items.length, 6, `${locale} needs all six customer-journey steps`);
    assert.equal(journeyUi.phases.length, 2, `${locale} needs both journey phases`);
    assert.ok(journeyUi.highlight.trim().length > 0, `${locale} needs the pivotal-session label`);
    assert.ok(journeyUi.resultLabel.trim().length > 0, `${locale} needs the journey-result label`);
    assert.ok(business.items.every(step => step.description.trim().length > 20), `${locale} needs explanatory journey copy`);
  }
});

test('the distributor section summarizes the role and exposes the protected web certification library', () => {
  const spanish = content.investmentSections['es-MX'].partners;
  assert.equal(spanish.eyebrow, '05 · Distribuidores');
  assert.deepEqual(spanish.items.map(item => item.title), [
    'Abre la relación',
    'Diagnostica y propone',
    'Implementa y capacita',
    'Acompaña y retiene',
  ]);
  assert.deepEqual(spanish.evidence.map(item => item.title), [
    'Formación guiada',
    'Exámenes en línea',
    'Certificado verificable',
  ]);
  assert.match(spanish.evidence[0].description, /Siete etapas/);
  assert.match(spanish.evidence[1].description, /examen final/);
  assert.match(spanish.evidence[2].description, /365 días/);

  for (const locale of expectedLocales) {
    const partners = content.investmentSections[locale].partners;
    const portal = content.partnerPortalUi[locale];
    assert.equal(partners.items.length, 4, `${locale} needs the distributor work summary`);
    assert.equal(partners.evidence.length, 3, `${locale} needs the web certification path`);
    assert.deepEqual(portal.resources.map(resource => resource.id), ['consulting-guide', 'basic-modules', 'operating-manual']);
    assert.ok(portal.resources.every(resource => resource.title.trim().length > 0));
    assert.ok(portal.accessNote.trim().length > 0);
  }
});

test('the AI section distinguishes current MCP capabilities from provider and bulk-operation roadmap', () => {
  assert.deepEqual(content.investmentMcpMetrics, {
    currentTools: 32,
    roadmapTargetMonth: '2026-10',
    roadmapTargetToolsApprox: 64,
  });

  const spanish = content.investmentSections['es-MX'].ai;
  assert.match(spanish.title, /ChatGPT/);
  assert.match(spanish.takeaway, /32 herramientas/);
  assert.match(spanish.takeawayDetail, /24 de consulta/);
  assert.match(spanish.takeawayDetail, /8 de vista previa y ejecución/);
  assert.equal(spanish.items.length, 9);
  assert.equal(spanish.items.reduce((total, item) => total + Number(item.title.match(/· (\d+)$/)?.[1] ?? 0), 0), 32);
  assert.deepEqual(spanish.evidence.map(item => item.title), [
    'ChatGPT · Disponible',
    'Claude · En desarrollo',
    'Octubre de 2026 · Lanzamiento previsto',
  ]);
  assert.match(spanish.evidence[1].description, /todavía no forma parte/);
  assert.match(spanish.evidence[2].description, /cerca de 64 herramientas/);
  assert.match(spanish.evidence[2].description, /operaciones masivas/);

  for (const locale of expectedLocales) {
    const ai = content.investmentSections[locale].ai;
    const completeCopy = [ai.title, ai.description, ai.takeaway, ai.takeawayDetail, ...ai.items.flatMap(item => [item.title, item.description]), ...ai.evidence.flatMap(item => [item.title, item.description])].join(' ');
    assert.equal(ai.items.length, 9, `${locale} needs all nine current MCP capability groups`);
    assert.equal(ai.evidence.length, 3, `${locale} needs ChatGPT, Claude, and the October roadmap`);
    assert.match(completeCopy, /ChatGPT/, `${locale} needs the available ChatGPT connection`);
    assert.match(completeCopy, /Claude/, `${locale} needs the Claude development status`);
    assert.match(completeCopy, /32/, `${locale} needs the current tool count`);
    assert.match(completeCopy, /64/, `${locale} needs the approximate roadmap count`);
    assert.match(completeCopy, /2026/, `${locale} needs the roadmap date`);
  }
});

test('the pro forma compounds monthly sales and keeps every financial assumption explicit', () => {
  assert.deepEqual(proforma.investmentProformaAssumptions, {
    currency: 'MXN',
    months: 12,
    baseMonthlyNewRevenueMxn: 15_000,
    scenarioMonthlyNewRevenueMxn: [10_000, 20_000, 30_000],
    networkConsultants: [30, 32, 60],
    distributorRate: 0.30,
    fiscalReserveRate: 0.13,
    capexRate: 0.20,
    promotionRate: 0.10,
    retentionRate: 1,
  });
  assert.ok(Math.abs(proforma.investmentProformaOperatingBalanceRate - 0.27) < 1e-12);
  assert.deepEqual(proforma.investmentProformaMilestones, [
    { month: 1, portfolioMrrMxn: 15_000, cumulativeRevenueMxn: 15_000 },
    { month: 3, portfolioMrrMxn: 45_000, cumulativeRevenueMxn: 90_000 },
    { month: 6, portfolioMrrMxn: 90_000, cumulativeRevenueMxn: 315_000 },
    { month: 12, portfolioMrrMxn: 180_000, cumulativeRevenueMxn: 1_170_000 },
  ]);
  assert.deepEqual(proforma.investmentProformaScenarios.map(scenario => ({
    monthly: scenario.monthlyNewRevenueMxn,
    yearOne: scenario.yearOneRevenueMxn,
    decemberMrr: scenario.decemberMrrMxn,
    channel: scenario.distributorAllocationMxn,
    balance: scenario.operatingBalanceMxn,
  })), [
    { monthly: 10_000, yearOne: 780_000, decemberMrr: 120_000, channel: 234_000, balance: 210_600 },
    { monthly: 20_000, yearOne: 1_560_000, decemberMrr: 240_000, channel: 468_000, balance: 421_200 },
    { monthly: 30_000, yearOne: 2_340_000, decemberMrr: 360_000, channel: 702_000, balance: 631_800 },
  ]);

  const [initial, territorial, mature] = proforma.investmentProformaNetworks;
  assert.deepEqual([initial.consultants, initial.aggregateMonthlyNewRevenueMxn, initial.decemberMrrMxn, initial.yearOneRevenueMxn, initial.operatingBalanceMxn], [30, 450_000, 5_400_000, 35_100_000, 9_477_000]);
  assert.deepEqual([territorial.consultants, territorial.decemberMrrMxn, territorial.yearOneRevenueMxn, territorial.operatingBalanceMxn], [32, 5_760_000, 37_440_000, 10_108_800]);
  assert.deepEqual([mature.consultants, mature.aggregateMonthlyNewRevenueMxn, mature.decemberMrrMxn, mature.yearOneRevenueMxn, mature.operatingBalanceMxn], [60, 900_000, 10_800_000, 70_200_000, 18_954_000]);

  const spanish = content.investmentSections['es-MX'].proforma;
  assert.match(spanish.title, /red nacional/);
  assert.match(spanish.description, /15,000 MXN/);
  assert.match(spanish.takeawayDetail, /35\.1 millones/);
  assert.match(spanish.takeawayDetail, /70\.2 millones/);
  assert.deepEqual(spanish.items.map(item => item.title), ['Ruta $10 mil', 'Ruta $20 mil', 'Ruta $30 mil']);
  assert.deepEqual(spanish.evidence.map(item => item.title), ['30 consultores', '32 entidades', '60 consultores']);

  for (const locale of expectedLocales) {
    const copy = proforma.investmentProformaCopy[locale];
    assert.equal(copy.assumptionPills.length, 4, `${locale} needs four visible assumptions`);
    assert.deepEqual(Object.keys(copy.networkLabels), ['30', '32', '60']);
    assert.match(copy.modelNote, /13%|13 %/);
    assert.match(copy.modelNote, /30%|30 %/);
    assert.ok(copy.modelNote.length > 100, `${locale} needs the responsible-reading qualification`);
  }
});

test('the module catalogue reflects the current product surfaces and tools in every locale', () => {
  assert.deepEqual(Object.keys(modules.investmentModuleCatalog), expectedLocales);

  for (const locale of expectedLocales) {
    const catalogue = modules.investmentModuleCatalog[locale];
    assert.deepEqual(catalogue.modules.map(module => module.id), expectedModuleIds);
    assert.equal(catalogue.modules.filter(module => module.kind === 'core').length, 2);
    assert.equal(catalogue.modules.filter(module => module.kind === 'operational').length, 8);
    assert.ok(Object.values(catalogue.columns).every(label => label.trim().length > 0));
    assert.ok(catalogue.description.trim().length > 40);
    assert.ok(catalogue.sharedNote.trim().length > 15);

    for (const module of catalogue.modules) {
      assert.equal(module.functions.length, 2, `${locale}/${module.id} needs two concise functions`);
      assert.ok(module.tools.length >= 3, `${locale}/${module.id} needs its visible tools`);
      assert.ok(module.name.trim().length > 0);
      assert.ok(module.functions.every(item => item.trim().length > 8));
      assert.ok(module.tools.every(item => item.trim().length > 0));
    }
  }

  const ids = modules.investmentModuleCatalog['es-MX'].modules.map(module => module.id);
  assert.equal(ids.includes('material-warehouse'), false);
  assert.equal(ids.includes('production'), false);
});

const jsx = (type, props) => ({ type, props: props ?? {} });
const nodes = node => {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
};
const textOf = node => {
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return textOf(node.props?.children);
};
const hasClass = (node, className) => String(node.props?.className ?? '').split(/\s+/).includes(className);

function pageHarness(initialSearch = '', pageProps = {}) {
  let params = new URLSearchParams(initialSearch);
  let changes = 0;
  const runtime = hookRuntime();
  const navigation = () => null;
  const dropdown = {
    DropdownMenu: () => null,
    DropdownMenuContent: () => null,
    DropdownMenuItem: () => null,
    DropdownMenuSeparator: () => null,
    DropdownMenuTrigger: () => null,
  };
  const classList = { contains: () => false };
  const pageDocument = {
    documentElement: { classList, lang: 'en-CA', style: { colorScheme: '' } },
    body: { classList },
  };
  const metadataTitles = [];
  const Page = loadTypescript(resolve(folder, 'InvestmentPage.tsx'), name => {
    if (name === 'react') return runtime.hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-router') {
      return {
        useSearchParams: () => [params, update => {
          params = typeof update === 'function' ? update(params) : update;
          changes++;
        }],
      };
    }
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (name.endsWith('IndiceWorkspaceNavigation')) return { IndiceWorkspaceNavigation: navigation };
    if (name.includes('components/ui/dropdown-menu')) return dropdown;
    if (name.includes('components/header/translations')) return header;
    if (name === './commercialPresentationContent') return commercial;
    if (name === './investmentContent') return content;
    if (name === './investmentModules') return modules;
    if (name === './investmentProforma') return proforma;
    if (name === './investmentUiCopy') return ui;
    if (name === './useInvestmentMetadata') {
      return { useInvestmentMetadata: title => metadataTitles.push(title) };
    }
    if (name.endsWith('.css')) return {};
    throw new Error(`Unexpected page dependency: ${name}`);
  }).default;

  const withDocument = callback => {
    const previous = globalThis.document;
    globalThis.document = pageDocument;
    try {
      return callback();
    } finally {
      globalThis.document = previous;
    }
  };
  let tree;
  const render = () => {
    tree = withDocument(() => runtime.render(() => Page(pageProps)));
    return nodes(tree);
  };
  render();

  return {
    render,
    all: () => nodes(tree),
    nav: () => nodes(tree).find(node => node.type === navigation)?.props,
    byClass: className => nodes(tree).filter(node => hasClass(node, className)),
    selectTab(id) {
      this.nav().onValueChange(id);
      render();
    },
    selectLanguage(locale) {
      const language = ui.investmentLanguages.find(option => option.code === locale);
      const option = nodes(tree).find(node => (
        node.type === dropdown.DropdownMenuItem
        && textOf(node).includes(language.name)
      ));
      assert.ok(option, `language option ${locale} must render`);
      option.props.onSelect();
      render();
    },
    setSearch(value) {
      params = new URLSearchParams(value);
      render();
    },
    close() {
      withDocument(() => runtime.unmount());
    },
    dropdown,
    pageDocument,
    metadataTitles,
    get params() { return params; },
    get changes() { return changes; },
  };
}

test('seven tabs and sections render while switching through all eight locales', () => {
  for (const locale of expectedLocales) {
    const page = pageHarness();
    try {
      page.selectLanguage(locale);
      const rootNode = page.byClass('investment-page')[0];
      assert.equal(rootNode.props.lang, locale);
      assert.deepEqual(page.nav().items.map(item => item.id), expectedTabs);
      assert.equal(page.nav().items.length, 7);
      assert.ok(page.metadataTitles.at(-1).includes(ui.getInvestmentUiCopy(locale).document));

      for (const id of expectedTabs) {
        page.selectTab(id);
        assert.equal(page.nav().value, id);
        assert.equal(page.params.get('tab'), id === 'overview' ? null : id);
        const panel = page.all().find(node => node.props?.role === 'tabpanel');
        assert.ok(panel, `${locale}/${id} must render a tab panel`);
        assert.ok(textOf(panel).trim().length > 100, `${locale}/${id} must render useful content`);
      }
    } finally {
      page.close();
    }
  }
});

test('tabs reflect direct URLs and invalid URL tabs safely render overview', () => {
  const page = pageHarness('tab=partners&ref=meeting');
  try {
    assert.equal(page.nav().value, 'partners');
    page.selectTab('market');
    assert.equal(page.nav().value, 'market');
    assert.equal(page.params.get('ref'), 'meeting');
    page.setSearch('tab=proforma&ref=meeting');
    assert.equal(page.nav().value, 'proforma');
    page.selectTab('overview');
    assert.equal(page.params.has('tab'), false);
    assert.equal(page.params.get('ref'), 'meeting');
    page.setSearch('tab=not-a-tab');
    assert.equal(page.nav().value, 'overview');
  } finally {
    page.close();
  }
});

test('the Carlos Muñoz client copy adds its personalized welcome and acknowledgement', () => {
  const page = pageHarness('', {
    welcomeName: 'Carlos Muñoz',
    showAcknowledgement: true,
    footerMessage: 'Muchos saludos también al señor Ricardo Moreno :P',
  });
  try {
    assert.match(textOf(page.byClass('investment-greeting')[0]), /Bienvenido, Carlos Muñoz/);
    assert.equal(page.nav().items.length, 8);
    assert.equal(page.nav().items.at(-1).label, 'Agradecimiento');
    page.selectLanguage('en-US');
    assert.match(textOf(page.byClass('investment-greeting')[0]), /Welcome, Carlos Muñoz/);
    page.selectTab('acknowledgement');
    assert.equal(page.params.get('tab'), 'acknowledgement');
    const acknowledgement = page.all().find(node => node.type?.name === 'CarlosAcknowledgement');
    assert.ok(acknowledgement);
    const message = textOf(acknowledgement.type(acknowledgement.props));
    assert.match(message, /un millón de empresarios en México se hagan chingones/);
    assert.match(message, /¿Dónde está la oportunidad\?/);
    assert.match(textOf(page.byClass('investment-footer')[0]), /Muchos saludos también al señor Ricardo Moreno :P/);
  } finally {
    page.close();
  }

  const generalPage = pageHarness('tab=acknowledgement');
  try {
    assert.equal(generalPage.nav().items.length, 7);
    assert.equal(generalPage.nav().value, 'overview');
    assert.equal(generalPage.byClass('investment-acknowledgement').length, 0);
  } finally {
    generalPage.close();
  }
});

test('the commercial presentation renders its six-stage client story independently', () => {
  const page = pageHarness('tab=business', {
    commercialPresentation: true,
    presentationName: 'Presentación comercial',
    welcomeMessage: 'Estimado cliente',
  });
  try {
    assert.deepEqual(page.nav().items.map(item => item.id), expectedCommercialTabs);
    assert.equal(page.nav().value, 'proposal');
    assert.match(textOf(page.byClass('investment-greeting')[0]), /Estimado cliente/);
    assert.doesNotMatch(textOf(page.byClass('investment-greeting')[0]), /inversionista/);
    assert.match(textOf(page.byClass('investment-module-identity')[0]), /Presentación comercial/);
    assert.match(textOf(page.byClass('investment-company-pill')[0]), /Presentación comercial/);
    assert.match(page.metadataTitles.at(-1), /Índice \| Presentación comercial/);
    assert.match(textOf(page.byClass('investment-module-identity')[0]), /ERP personalizado/);
    assert.ok(page.all().some(node => node.type === 'select' && node.props.value === 'MXN'));

    for (const tab of expectedCommercialTabs) {
      page.selectTab(tab);
      assert.equal(page.params.get('tab'), tab === 'proposal' ? null : tab);
      assert.equal(page.nav().value, tab);
      const panel = page.all().find(node => node.type?.name === 'CommercialPresentationPanel');
      assert.ok(panel, `${tab} must render the commercial panel`);
      assert.ok(textOf(panel.type(panel.props)).trim().length > 200, `${tab} must contain useful presentation copy`);
    }

    page.selectLanguage('en-US');
    assert.deepEqual(page.nav().items.map(item => item.label), ['The proposal', 'Connected operation', 'Capabilities', 'Lupita and her agents', 'Pricing', 'Implementation']);
    assert.match(textOf(page.byClass('investment-module-identity')[0]), /Customized ERP/);
  } finally {
    page.close();
  }
});

test('the overview explains Índice in concise prose while detailed sections retain their structure', () => {
  const page = pageHarness();
  try {
    assert.equal(page.byClass('investment-overview-copy').length, 1);
    assert.equal(page.byClass('investment-overview-lead').length, 1);
    assert.equal(page.byClass('investment-overview-paragraph').length, 3);
    assert.equal(page.byClass('investment-intro').length, 0);
    assert.equal(page.byClass('investment-card').length, 0);
    assert.equal(page.byClass('investment-next').length, 0);

    page.selectTab('modules');
    assert.equal(page.byClass('investment-overview-copy').length, 0);
    assert.equal(page.byClass('investment-intro').length, 1);
    assert.equal(page.byClass('investment-card').length, 0);
    const catalogComponent = page.all().find(node => node.type?.name === 'ModuleCatalogTable');
    assert.ok(catalogComponent);
    const catalogNodes = nodes(catalogComponent.type(catalogComponent.props));
    assert.equal(catalogNodes.filter(node => hasClass(node, 'investment-module-table')).length, 1);
    assert.equal(catalogNodes.filter(node => hasClass(node, 'investment-module-name')).length, 10);
    assert.equal(catalogNodes.filter(node => node.type === 'tbody')[0].props.children.length, 10);
    assert.equal(page.byClass('investment-next').length, 1);

    page.selectTab('market');
    assert.ok(page.byClass('investment-card').length >= 3);
    assert.equal(page.byClass('investment-module-table').length, 0);
    const evidenceComponent = page.all().find(node => node.type?.name === 'EvidenceList');
    assert.equal(evidenceComponent.props.emphasis, true);
    const evidenceNodes = nodes(evidenceComponent.type(evidenceComponent.props));
    assert.equal(evidenceNodes.filter(node => hasClass(node, 'investment-evidence--criteria')).length, 1);
    assert.equal(evidenceNodes.filter(node => hasClass(node, 'investment-criterion-number')).length, 3);
    assert.equal(page.byClass('investment-next--market').length, 1);

    page.selectTab('business');
    assert.equal(page.byClass('investment-card').length, 0);
    const journeyComponent = page.all().find(node => node.type?.name === 'CustomerJourney');
    assert.ok(journeyComponent);
    const journeyNodes = nodes(journeyComponent.type(journeyComponent.props));
    assert.equal(journeyNodes.filter(node => hasClass(node, 'investment-customer-phase')).length, 2);
    assert.equal(journeyNodes.filter(node => node.type === 'li').length, 6);
    assert.equal(journeyNodes.filter(node => hasClass(node, 'is-pivotal')).length, 1);
    assert.equal(journeyNodes.filter(node => hasClass(node, 'is-included')).length, 1);
    assert.equal(page.byClass('investment-next--business').length, 1);

    page.selectTab('partners');
    assert.equal(page.byClass('investment-card').length, 4);
    const academyComponent = page.all().find(node => node.type?.name === 'PartnerCertificationPanel');
    assert.ok(academyComponent);
    const academyNodes = nodes(academyComponent.type(academyComponent.props));
    assert.equal(academyNodes.filter(node => hasClass(node, 'investment-partner-certification-path')).length, 1);
    assert.equal(academyNodes.filter(node => hasClass(node, 'investment-partner-resources')).length, 1);
    const academyLinks = academyNodes.filter(node => node.type === 'a');
    assert.equal(academyLinks.length, 4);
    assert.equal(academyLinks[0].props.href, '/distributor-portal?tab=training');
    assert.deepEqual(academyLinks.slice(1).map(node => node.props.href), [
      '/api/v1/distributor-portal/training/resources/consulting-guide/pdf?download=true',
      '/api/v1/distributor-portal/training/resources/basic-modules/pdf?download=true',
      '/api/v1/distributor-portal/training/resources/operating-manual/pdf?download=true',
    ]);
    assert.ok(academyLinks.every(node => node.props.target === '_blank'));

    page.selectTab('ai');
    assert.equal(page.byClass('investment-items--ai').length, 1);
    assert.equal(page.byClass('investment-card').length, 9);
    const aiEvidenceComponent = page.all().find(node => node.type?.name === 'EvidenceList');
    assert.equal(aiEvidenceComponent.props.roadmap, true);
    const aiEvidenceNodes = nodes(aiEvidenceComponent.type(aiEvidenceComponent.props));
    assert.equal(aiEvidenceNodes.filter(node => hasClass(node, 'investment-evidence--ai')).length, 1);
    assert.equal(aiEvidenceNodes.filter(node => node.type === 'dl')[0].props.children.length, 3);

    page.selectTab('proforma');
    assert.equal(page.byClass('investment-card').length, 0);
    const proformaComponent = page.all().find(node => node.type?.name === 'ProformaPanel');
    assert.ok(proformaComponent);
    const proformaNodes = nodes(proformaComponent.type(proformaComponent.props));
    assert.equal(proformaNodes.filter(node => hasClass(node, 'investment-proforma')).length, 1);
    assert.equal(proformaNodes.filter(node => hasClass(node, 'investment-proforma-evolution'))[0].props.children[1].props.children.length, 4);
    assert.equal(proformaNodes.filter(node => hasClass(node, 'investment-proforma-scenarios'))[0].props.children[1].props.children.length, 3);
    assert.equal(proformaNodes.filter(node => hasClass(node, 'investment-proforma-allocation-legend'))[0].props.children.length, 5);
    assert.equal(proformaNodes.filter(node => hasClass(node, 'investment-proforma-network-grid'))[0].props.children.length, 3);
    assert.equal(proformaNodes.filter(node => hasClass(node, 'is-target')).length, 1);
    assert.equal(proformaNodes.filter(node => hasClass(node, 'investment-proforma-note')).length, 1);
  } finally {
    page.close();
  }
});

test('the simulated header and module-style workbar expose static presentation tools', () => {
  const page = pageHarness();
  try {
    assert.equal(page.byClass('investment-header').length, 1);
    assert.equal(page.byClass('investment-workbar').length, 1);
    assert.equal(page.byClass('investment-module-identity').length, 1);
    assert.equal(page.byClass('investment-module-titlebar').length, 1);
    assert.equal(page.byClass('investment-kpi-strip').length, 0);
    assert.deepEqual(page.nav().items.map(item => textOf(item.icon)), expectedTabEmojis);
    assert.ok(page.nav().items.every(item => hasClass(item.icon, 'investment-tab-emoji')));
    assert.equal(page.byClass('investment-notification-item').length, 6);
    assert.equal(page.byClass('investment-profile-item').length, 7);
    assert.equal(page.byClass('investment-profile-logout').length, 1);
    assert.equal(page.byClass('investment-language-option-flag').length, 8);

    for (const item of [...page.byClass('investment-notification-item'), ...page.byClass('investment-profile-item'), ...page.byClass('investment-profile-logout')]) {
      let prevented = false;
      item.props.onSelect({ preventDefault: () => { prevented = true; } });
      assert.equal(prevented, true, 'demo menu actions must remain inert');
    }
    assert.equal(page.params.toString(), '');
  } finally {
    page.close();
  }
});

test('dark mode is local component state and restores the document color scheme', () => {
  const page = pageHarness();
  try {
    assert.equal(page.byClass('investment-dark').length, 0);
    assert.equal(page.pageDocument.documentElement.style.colorScheme, 'light');
    const darkButton = page.all().find(node => (
      node.type === 'button'
      && node.props?.title === ui.getInvestmentUiCopy('es-MX').dark
      && node.props?.['aria-pressed'] === false
    ));
    assert.ok(darkButton);
    darkButton.props.onClick();
    page.render();
    assert.equal(page.byClass('investment-dark').length, 1);
    assert.equal(page.pageDocument.documentElement.style.colorScheme, 'dark');
    const lightButton = page.all().find(node => (
      node.type === 'button'
      && node.props?.['aria-pressed'] === true
      && node.props?.title === header.getHeaderTranslations('es-MX').actions.lightMode
    ));
    assert.ok(lightButton);
    lightButton.props.onClick();
    page.render();
    assert.equal(page.byClass('investment-dark').length, 0);
    assert.equal(page.pageDocument.documentElement.style.colorScheme, 'light');
  } finally {
    page.close();
  }
  assert.equal(page.pageDocument.documentElement.style.colorScheme, '');
});

function fakeDocument(initialContents = []) {
  const elements = [];
  const create = initial => ({
    name: 'robots',
    isConnected: false,
    value: initial,
    get content() { return this.value; },
    set content(value) { this.value = value; },
    getAttribute() { return this.value; },
    setAttribute(_name, value) { this.value = value; },
    removeAttribute() { this.value = null; },
    remove() {
      elements.splice(elements.indexOf(this), 1);
      this.isConnected = false;
    },
  });
  const head = {
    querySelectorAll: () => [...elements],
    appendChild: element => {
      elements.push(element);
      element.isConnected = true;
    },
  };
  initialContents.forEach(value => head.appendChild(create(value)));
  return { title: 'Original', head, createElement: () => create(null), elements };
}

for (const initialContents of [[], ['index, follow'], [null], ['index', 'archive']]) {
  test(`metadata follows the localized title and restores prior document state: ${JSON.stringify(initialContents)}`, () => {
    const previous = globalThis.document;
    const doc = fakeDocument(initialContents);
    globalThis.document = doc;
    try {
      for (let strictPass = 0; strictPass < 2; strictPass++) {
        const runtime = hookRuntime();
        const { useInvestmentMetadata } = loadTypescript(resolve(folder, 'useInvestmentMetadata.ts'), name => {
          if (name === 'react') return runtime.hooks;
          throw new Error(`Unexpected metadata dependency: ${name}`);
        });
        let title = 'Índice | Presentación ejecutiva';
        runtime.render(() => useInvestmentMetadata(title));
        assert.equal(doc.title, title);
        assert.ok(doc.elements.every(element => element.content === 'noindex, nofollow, noarchive'));
        title = 'Índice | Executive presentation';
        runtime.render(() => useInvestmentMetadata(title));
        assert.equal(doc.title, title);
        runtime.unmount();
        assert.equal(doc.title, 'Original');
        assert.deepEqual(doc.elements.map(element => element.content), initialContents);
      }
    } finally {
      globalThis.document = previous;
    }
  });
}

test('the public route has no session loader and existing routes keep their protection', () => {
  const routes = read('app/routes.tsx');
  const investmentRoute = routes.match(/\{\s*\/\/ Public editorial page[\s\S]*?\n  \},/)[0];
  const clientRoute = routes.match(/\{\s*\/\/ Personalized public copy[\s\S]*?\n  \},/)[0];
  const presentationRoute = routes.match(/\{\s*\/\/ Public commercial exposition[\s\S]*?\n  \},/)[0];
  assert.match(investmentRoute, /id: 'investment'/);
  assert.match(investmentRoute, /path: '\/investment'/);
  assert.doesNotMatch(investmentRoute, /loader:/);
  assert.match(clientRoute, /id: 'investment-carlos-munoz'/);
  assert.match(clientRoute, /path: '\/Mrcarlosmunoz'/);
  assert.match(clientRoute, /welcomeName="Carlos Muñoz"/);
  assert.match(clientRoute, /showAcknowledgement/);
  assert.match(clientRoute, /footerMessage="Muchos saludos también al señor Ricardo Moreno :P"/);
  assert.doesNotMatch(clientRoute, /loader:/);
  assert.match(presentationRoute, /id: 'presentation'/);
  assert.match(presentationRoute, /path: '\/presentation'/);
  assert.match(presentationRoute, /presentationName="Presentación comercial"/);
  assert.match(presentationRoute, /welcomeMessage="Estimado cliente"/);
  assert.match(presentationRoute, /commercialPresentation/);
  assert.doesNotMatch(presentationRoute, /hiddenTabs=/);
  assert.doesNotMatch(presentationRoute, /loader:/);
  assert.match(routes, /path: '\/:pageId\/\*',[\s\S]*?loader: requireAuthenticatedSession/);
  const main = read('main.tsx');
  assert.match(main, /useSyncExternalStore\(router.subscribe/);
  assert.match(main, /publicPresentationRouteIds\.has\(match\.route\.id\)/);
  assert.match(main, /'investment-carlos-munoz'/);
  assert.match(main, /'presentation'/);
  assert.match(main, /if \(isInvestment\) return children/);
  assert.match(main, /<FavoritesProvider><PettyCashProvider>\{children\}/);
});

test('no links to investment are added to existing application surfaces', () => {
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (path !== folder) scan(path);
      } else if (/\.(tsx?|html)$/.test(path) && !path.endsWith('routes.tsx')) {
        assert.doesNotMatch(readFileSync(path, 'utf8'), /(?:href|to)\s*=\s*["'][^"']*\/investment/, path);
      }
    }
  }
  scan(resolve(root, 'app'));
});

test('the demo uses static data without business APIs, persistence, or unsafe HTML', () => {
  const pageSource = readFileSync(resolve(folder, 'InvestmentPage.tsx'), 'utf8');
  assert.match(pageSource, /DropdownMenu/);
  assert.match(pageSource, /getHeaderTranslations/);
  assert.match(pageSource, /getInvestmentUiCopy/);
  assert.match(pageSource, /useInvestmentMetadata\(`Índice \| \$\{presentationName \?\? copy\.document\}`\)/);
  assert.match(pageSource, /investment-notifications-menu/);
  assert.match(pageSource, /investment-profile-menu/);

  for (const file of ['InvestmentPage.tsx', 'commercialPresentationContent.ts', 'investmentContent.ts', 'investmentModules.ts', 'investmentUiCopy.ts', 'useInvestmentMetadata.ts']) {
    const source = readFileSync(resolve(folder, file), 'utf8');
    assert.doesNotMatch(source, /\bfetch\(|apiClient|authApi|useNotifications|dangerouslySetInnerHTML|localStorage|sessionStorage/);
  }
});
