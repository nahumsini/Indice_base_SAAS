import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const reactRoot = resolve(import.meta.dirname, '..');
const appRoot = join(reactRoot, 'src/app');
const posRoot = join(appRoot, 'BasicModules/PointOfSale');
const failures = [];

const supportedLocales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'];

const localeFiles = {
  'en-CA': 'en-CA.ts',
  'en-US': 'en-US.ts',
  'es-MX': 'es-MX.ts',
  'es-CO': 'es-CO.ts',
  'fr-CA': 'fr-CA.ts',
  'pt-BR': 'pt-BR.ts',
  'ko-CA': 'ko-CA.ts',
  'zh-CA': 'zh-CA.ts',
};

const expectedPosTitles = {
  'en-CA': 'Point of Sale',
  'en-US': 'Point of Sale',
  'es-MX': 'Punto de Venta',
  'es-CO': 'Punto de Venta',
  'fr-CA': 'Point de vente',
  'pt-BR': 'Ponto de Venda',
  'ko-CA': '판매 시점 관리',
  'zh-CA': '销售点',
};

const expectedTabLabels = {
  'en-CA': {
    kiosks: 'Kiosks',
    cajas: 'Registers & shifts',
    sale: 'Sale',
    cortes: 'Cash closings',
    clientes: 'Customers',
    kpis: 'KPIs',
  },
  'en-US': {
    kiosks: 'Kiosks',
    cajas: 'Registers & shifts',
    sale: 'Sale',
    cortes: 'Register closings',
    clientes: 'Customers',
    kpis: 'KPIs',
  },
  'es-MX': {
    kiosks: 'Kioscos',
    cajas: 'Cajas y turnos',
    sale: 'Venta',
    cortes: 'Cortes de caja',
    clientes: 'Clientes',
    kpis: 'KPIs',
  },
  'es-CO': {
    kiosks: 'Kioscos',
    cajas: 'Cajas y turnos',
    sale: 'Venta',
    cortes: 'Cierres de caja',
    clientes: 'Clientes',
    kpis: 'KPIs',
  },
  'fr-CA': {
    kiosks: 'Bornes',
    cajas: 'Caisses et quarts',
    sale: 'Vente',
    cortes: 'Fermetures de caisse',
    clientes: 'Clients',
    kpis: 'KPIs',
  },
  'pt-BR': {
    kiosks: 'Quiosques',
    cajas: 'Caixas e turnos',
    sale: 'Venda',
    cortes: 'Fechamentos de caixa',
    clientes: 'Clientes',
    kpis: 'KPIs',
  },
  'ko-CA': {
    kiosks: '키오스크',
    cajas: '계산대 및 근무조',
    sale: '판매',
    cortes: '현금 마감',
    clientes: '고객',
    kpis: 'KPIs',
  },
  'zh-CA': {
    kiosks: '自助终端',
    cajas: '收银台与班次',
    sale: '销售',
    cortes: '收银结算',
    clientes: '客户',
    kpis: 'KPIs',
  },
};

const tabAuditTargets = [
  {
    id: 'kiosks',
    component: 'KiosksWorkspace',
    importPath: './Kiosks/KiosksWorkspace',
    files: [
      'Kiosks/KiosksWorkspace.tsx',
      'Kiosks/KioskCenterWorkspace.tsx',
      'Kiosks/kioskTranslations.ts',
    ],
  },
  {
    id: 'cajas',
    component: 'CashRegistersWorkspace',
    importPath: './CashRegisters/CashRegistersWorkspace',
    files: [
      'CashRegisters/CashRegistersWorkspace.tsx',
      'CashRegisters/cashRegistersTranslations.ts',
      'Sale/components/CreateCashRegisterModal.tsx',
      'Sale/components/OpenShiftModal.tsx',
      'Sale/hooks/useSaleShift.ts',
    ],
  },
  {
    id: 'sale',
    component: 'Sale',
    importPath: './Sale/Sale',
    files: [
      'Sale/Sale.tsx',
      'PointOfSaleLegacyLocalizer.tsx',
      'Sale/components/SaleTicketPanel.tsx',
      'Sale/components/SalePaymentPanel.tsx',
      'Sale/hooks/useSaleCheckout.ts',
    ],
  },
  {
    id: 'cortes',
    component: 'Cortes',
    importPath: './Cortes',
    files: [
      'Cortes/Cortes.tsx',
      'Cortes/components/CortesHeader.tsx',
      'Cortes/components/CortesFiltersBar.tsx',
      'Cortes/components/CortesTable.tsx',
    ],
  },
  {
    id: 'clientes',
    component: 'Clientes',
    importPath: '../Sales/Contactos',
    files: [
      '../Sales/Contactos/Contactos.tsx',
      '../Sales/Contactos/index.ts',
    ],
  },
  {
    id: 'kpis',
    component: 'KPIs',
    importPath: './KPIs',
    files: [
      'KPIs/KPIs.tsx',
      'KPIs/posKpiTranslations.ts',
      'KPIs/components/PosKpiTitleBar.tsx',
      'KPIs/components/PosKpiFilters.tsx',
      'KPIs/components/PosKpiCashClosingTable.tsx',
    ],
  },
];

function source(path) {
  return readFileSync(path, 'utf8');
}

function repoPath(path) {
  return relative(reactRoot, path).replaceAll('\\', '/');
}

function fail(message) {
  failures.push(message);
}

function expectFile(path, label) {
  if (!existsSync(path)) {
    fail(`${label} missing: ${repoPath(path)}`);
  }
}

function expectIncludes(file, content, needle, label) {
  if (!content.includes(needle)) {
    fail(`${repoPath(file)} missing ${label}: ${needle}`);
  }
}

function expectRegex(file, content, pattern, label) {
  if (!pattern.test(content)) {
    fail(`${repoPath(file)} missing ${label}: ${pattern}`);
  }
}

function auditShellTranslations() {
  const translationsIndex = join(posRoot, 'translations/index.ts');
  const translationsTypes = join(posRoot, 'translations/types.ts');
  const indexSource = source(translationsIndex);
  const typeSource = source(translationsTypes);

  for (const locale of supportedLocales) {
    const localeFile = join(posRoot, 'translations', localeFiles[locale]);
    expectFile(localeFile, `${locale} POS shell translation`);
    expectIncludes(translationsIndex, indexSource, `'${locale}'`, `${locale} registered in POS translations`);
    expectIncludes(translationsTypes, typeSource, `| '${locale}'`, `${locale} listed in POS locale type`);

    const localeSource = source(localeFile);
    expectIncludes(localeFile, localeSource, `title: '${expectedPosTitles[locale]}'`, `${locale} POS title`);
    for (const [tabId, label] of Object.entries(expectedTabLabels[locale])) {
      expectIncludes(localeFile, localeSource, `${tabId}: '${label}'`, `${locale} ${tabId} tab label`);
    }
  }

  for (const locale of ['es-MX', 'es-CO']) {
    const localeFile = join(posRoot, 'translations', localeFiles[locale]);
    const localeSource = source(localeFile);
    expectIncludes(localeFile, localeSource, `title: 'Punto de Venta'`, `${locale} professional Spanish title casing`);
    if (localeSource.includes(`title: 'Punto de venta'`)) {
      fail(`${repoPath(localeFile)} still uses sentence-case Spanish title casing.`);
    }
  }
}

function auditRoutedTabs() {
  const moduleFile = join(posRoot, 'PuntoDeVenta.tsx');
  const moduleSource = source(moduleFile);

  for (const tab of tabAuditTargets) {
    expectRegex(moduleFile, moduleSource, new RegExp(`['"]${tab.id}['"]\\s+as\\s+const`), `${tab.id} tab id`);
    expectRegex(moduleFile, moduleSource, new RegExp(`id:\\s*['"]${tab.id}['"][\\s\\S]*label:\\s*t\\.tabs\\.${tab.id}`), `${tab.id} translated label`);
    expectRegex(moduleFile, moduleSource, new RegExp(`const\\s+${tab.component}\\s*=\\s*lazy\\(\\(\\)\\s*=>\\s*import\\(['"]${escapeRegex(tab.importPath)}['"]\\)\\)`), `${tab.id} lazy component`);

    for (const tabFile of tab.files) {
      expectFile(resolve(posRoot, tabFile), `${tab.id} audit target`);
    }
  }
}

function auditKioskTranslations() {
  const kioskTranslationsFile = join(posRoot, 'Kiosks/kioskTranslations.ts');
  const kioskSource = source(kioskTranslationsFile);

  expectIncludes(kioskTranslationsFile, kioskSource, `type KioskCatalogSource = 'es-MX' | 'en-CA';`, 'reviewed kiosk catalog sources');
  expectIncludes(kioskTranslationsFile, kioskSource, `const enCA = {`, 'English kiosk catalog');
  expectIncludes(kioskTranslationsFile, kioskSource, `const esMX: PointOfSaleKioskTranslations = {`, 'Spanish kiosk catalog');

  for (const locale of supportedLocales) {
    expectRegex(kioskTranslationsFile, kioskSource, new RegExp(`['"]${locale}['"]:\\s*['"](es-MX|en-CA)['"]`), `${locale} kiosk locale fallback`);
  }
}

function auditPurchaseOrderTranslations() {
  const purchaseOrderTranslationsRoot = join(posRoot, 'OrdenesCompra/translations');
  const indexFile = join(purchaseOrderTranslationsRoot, 'index.ts');
  const typesFile = join(purchaseOrderTranslationsRoot, 'types.ts');
  const indexSource = source(indexFile);
  const typeSource = source(typesFile);

  for (const locale of supportedLocales) {
    const localeFile = join(purchaseOrderTranslationsRoot, localeFiles[locale]);
    expectFile(localeFile, `${locale} purchase-order translation`);
    expectIncludes(indexFile, indexSource, `'${locale}':`, `${locale} registered in purchase-order translations`);
    expectIncludes(typesFile, typeSource, `'${locale}'`, `${locale} listed in purchase-order locale type`);
  }
}

function auditDashboardNaming() {
  const languageContextFile = join(appRoot, 'context/LanguageContext.tsx');
  const languageSource = source(languageContextFile);

  const expectedDashboardLabels = [
    ['Punto de Venta', 2],
    ['Point of Sale', 2],
    ['Point de vente', 1],
    ['Ponto de Venda', 1],
    ['판매 시점 관리', 1],
    ['销售点', 1],
  ];

  for (const [label, expectedCount] of expectedDashboardLabels) {
    const actualCount = countOccurrences(languageSource, `puntoVenta: '${label}'`);
    if (actualCount !== expectedCount) {
      fail(`Expected ${expectedCount} dashboard POS label(s) for "${label}", found ${actualCount}.`);
    }
  }

  if (languageSource.includes(`puntoVenta: 'Punto de venta'`)) {
    fail(`${repoPath(languageContextFile)} still has Spanish dashboard POS label "Punto de venta".`);
  }
}

function auditCortesVisibleCopy() {
  const cortesCopyFile = join(posRoot, 'Cortes/cortesTranslations.ts');
  const cortesCopySource = source(cortesCopyFile);
  const visibleCortesFiles = [
    'Cortes/Cortes.tsx',
    'Cortes/components/CortesHeader.tsx',
    'Cortes/components/CortesFiltersBar.tsx',
    'Cortes/components/CortesKpiArea.tsx',
    'Cortes/components/CortesTable.tsx',
    'Cortes/components/CortesDayView.tsx',
    'Cortes/components/CortesBulkActionsBar.tsx',
    'Cortes/components/CortesColumnsModal.tsx',
    'Cortes/components/CorteDetailModal.tsx',
  ];

  expectIncludes(cortesCopyFile, cortesCopySource, 'export const enCACortes = {', 'English Cortes copy catalog');
  expectIncludes(cortesCopyFile, cortesCopySource, 'export const esMXCortes', 'Spanish Cortes copy catalog');
  for (const locale of supportedLocales) {
    expectRegex(cortesCopyFile, cortesCopySource, new RegExp(`['"]${locale}['"]:\\s*(enCACortes|esMXCortes)`), `${locale} Cortes locale mapping`);
  }

  const forbiddenVisibleSpanish = [
    'Cortes de caja',
    'Consulta cierres por periodo',
    'Filtros',
    'Filtra por jornada',
    'Periodo',
    'Almacen',
    'Almacén',
    'Cajero',
    'Todos',
    'Historial de cortes',
    'No hay cortes con estos filtros',
    'Mostrando',
    'Cargando cortes reales',
    'Seleccionar cortes visibles',
    'Imprimir reporte',
    'Configurar columnas',
    'Detalle de corte',
    'Efectivo esperado',
  ];

  for (const visibleFile of visibleCortesFiles) {
    const filePath = join(posRoot, visibleFile);
    const content = source(filePath);
    for (const phrase of forbiddenVisibleSpanish) {
      if (content.includes(phrase)) {
        fail(`${repoPath(filePath)} has hardcoded visible Spanish text: ${phrase}`);
      }
    }
  }
}

function auditCashRegistersVisibleCopy() {
  const copyFile = join(posRoot, 'CashRegisters/cashRegistersTranslations.ts');
  const copySource = source(copyFile);
  const visibleFiles = [
    'CashRegisters/CashRegistersWorkspace.tsx',
    'Sale/components/CreateCashRegisterModal.tsx',
  ];

  expectIncludes(copyFile, copySource, 'export const enCACashRegisters = {', 'English cash-register copy catalog');
  expectIncludes(copyFile, copySource, 'export const esMXCashRegisters', 'Spanish cash-register copy catalog');
  for (const locale of supportedLocales) {
    expectRegex(copyFile, copySource, new RegExp(`['"]${locale}['"]:\\s*(enCACashRegisters|esMXCashRegisters)`), `${locale} cash-register locale mapping`);
  }

  const forbiddenVisibleSpanish = [
    'Administración operativa',
    'Administra las cajas',
    'Cajas activas',
    'Turnos abiertos',
    'Cortes cerrados hoy',
    'Ventas de hoy',
    'Operación de cajas',
    'Supervisa sesiones',
    'Buscar almacén',
    'Todas las cajas',
    'Sesiones abiertas',
    'Cortes de hoy',
    'Cargando cajas',
    'Sin caja configurada',
    'Preparar caja',
    'Crear caja',
    'Código de caja',
    'Nombre de caja',
  ];

  for (const visibleFile of visibleFiles) {
    const filePath = join(posRoot, visibleFile);
    const content = source(filePath);
    for (const phrase of forbiddenVisibleSpanish) {
      if (content.includes(phrase)) {
        fail(`${repoPath(filePath)} has hardcoded visible Spanish text: ${phrase}`);
      }
    }
  }
}

function auditKpiVisibleCopy() {
  const copyFile = join(posRoot, 'KPIs/posKpiTranslations.ts');
  const copySource = source(copyFile);
  const visibleFiles = [
    'KPIs/KPIs.tsx',
    'KPIs/components/PosKpiTitleBar.tsx',
    'KPIs/components/PosKpiFilters.tsx',
    'KPIs/components/PosKpiContextStrip.tsx',
    'KPIs/components/PosKpiSignals.tsx',
    'KPIs/components/PosKpiOperatingPanels.tsx',
    'KPIs/components/PosKpiCashClosingTable.tsx',
  ];

  expectIncludes(copyFile, copySource, 'export const enCAPosKpi = {', 'English KPI copy catalog');
  expectIncludes(copyFile, copySource, 'export const esMXPosKpi', 'Spanish KPI copy catalog');
  for (const locale of supportedLocales) {
    expectRegex(copyFile, copySource, new RegExp(`['"]${locale}['"]:\\s*(enCAPosKpi|esMXPosKpi)`), `${locale} KPI locale mapping`);
  }

  const forbiddenVisibleSpanish = [
    'Retail operativo',
    'KPIs de punto de venta',
    'Filtros de lectura POS',
    'Actualizar KPIs',
    'Cargando cierres reales',
    'Moneda preferida',
    'Cierres leídos',
    'Señales ejecutivas POS',
    'Precisión de caja',
    'Ventas por cierre',
    'Mezcla de pago',
    'Cajas con venta',
    'Almacenes POS',
    'Divisas POS',
    'Cierres que alimentan los KPIs',
    'Venta total',
    'Efectivo esperado',
  ];

  for (const visibleFile of visibleFiles) {
    const filePath = join(posRoot, visibleFile);
    const content = source(filePath);
    for (const phrase of forbiddenVisibleSpanish) {
      if (content.includes(phrase)) {
        fail(`${repoPath(filePath)} has hardcoded visible Spanish text: ${phrase}`);
      }
    }
  }
}

function auditSaleLegacyLocalizer() {
  const moduleFile = join(posRoot, 'PuntoDeVenta.tsx');
  const moduleSource = source(moduleFile);
  const localizerFile = join(posRoot, 'PointOfSaleLegacyLocalizer.tsx');
  const localizerSource = source(localizerFile);

  expectIncludes(
    moduleFile,
    moduleSource,
    `import { PointOfSaleLegacyLocalizer } from './PointOfSaleLegacyLocalizer';`,
    'POS legacy localizer import',
  );
  expectIncludes(
    moduleFile,
    moduleSource,
    'const locale = usePointOfSaleResolvedLocale();',
    'resolved POS locale for legacy localizer',
  );
  expectIncludes(
    moduleFile,
    moduleSource,
    '<PointOfSaleLegacyLocalizer locale={locale}>',
    'legacy localizer wrapping routed POS content',
  );

  const expectedLocaleLanguages = {
    'en-CA': 'en',
    'en-US': 'en',
    'es-MX': 'es',
    'es-CO': 'es',
    'fr-CA': 'fr',
    'pt-BR': 'pt',
    'ko-CA': 'ko',
    'zh-CA': 'zh',
  };
  for (const [locale, language] of Object.entries(expectedLocaleLanguages)) {
    expectIncludes(localizerFile, localizerSource, `'${locale}': '${language}'`, `${locale} legacy localizer language`);
  }

  const expectedSalePhrases = [
    [`'Ticket actual': 'Current ticket'`, `fr: 'Ticket actuel'`, `pt: 'Ticket atual'`, `ko: '현재 티켓'`, `zh: '当前小票'`],
    [`'Escanea código de barras...': 'Scan barcode...'`, `fr: 'Balayez le code-barres...'`, `pt: 'Escaneie o código de barras...'`, `ko: '바코드 스캔...'`, `zh: '扫描条形码...'`],
    [`'Abrir caja': 'Open register'`, `fr: 'Ouvrir la caisse'`, `pt: 'Abrir caixa'`, `ko: '계산대 열기'`, `zh: '打开收银台'`],
    [`'Cobro POS': 'POS checkout'`, `fr: 'Encaissement PDV'`, `pt: 'Cobrança POS'`, `ko: 'POS 결제'`, `zh: 'POS 收款'`],
    [`'Pago completo': 'Payment complete'`, `fr: 'Paiement complet'`, `pt: 'Pagamento completo'`, `ko: '결제 완료'`, `zh: '付款完成'`],
    [`'No hay una caja configurada. Crea una caja desde la configuración POS antes de abrir turno.': 'No register is configured. Create a register from POS settings before opening a shift.'`, `fr: 'Aucune caisse n’est configurée. Créez une caisse depuis la configuration PDV avant d’ouvrir un quart.'`, `pt: 'Nenhuma caixa está configurada. Crie uma caixa na configuração POS antes de abrir o turno.'`, `ko: '설정된 계산대가 없습니다. 교대를 열기 전에 POS 설정에서 계산대를 생성하세요.'`, `zh: '尚未配置收银台。开班前请在 POS 设置中创建收银台。'`],
  ];

  for (const phraseGroup of expectedSalePhrases) {
    for (const expected of phraseGroup) {
      expectIncludes(localizerFile, localizerSource, expected, `Sale legacy phrase coverage ${expected}`);
    }
  }

  const expectedDynamicRules = [
    'articulo|artículo|articulos|artículos',
    'productos disponibles · se agregan directamente al ticket',
    'Stock insuficiente para',
    'Devolución total|Devolución parcial',
  ];
  for (const expectedRule of expectedDynamicRules) {
    expectIncludes(localizerFile, localizerSource, expectedRule, `Sale dynamic localizer rule ${expectedRule}`);
  }
}

function auditKnownSpanishRuntimeMessages() {
  const shiftHookFile = join(posRoot, 'Sale/hooks/useSaleShift.ts');
  const shiftHookSource = source(shiftHookFile);

  expectIncludes(
    shiftHookFile,
    shiftHookSource,
    'No hay una caja configurada. Crea una caja desde la configuración POS antes de abrir turno.',
    'Spanish missing-register runtime message',
  );

  for (const forbiddenText of [
    'No cash register configured.',
    'Create a cash register from POS setup before opening a shift.',
  ]) {
    if (shiftHookSource.includes(forbiddenText)) {
      fail(`${repoPath(shiftHookFile)} still contains English runtime text: ${forbiddenText}`);
    }
  }
}

function countOccurrences(sourceText, needle) {
  return sourceText.split(needle).length - 1;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

auditShellTranslations();
auditRoutedTabs();
auditKioskTranslations();
auditPurchaseOrderTranslations();
auditDashboardNaming();
auditCortesVisibleCopy();
auditCashRegistersVisibleCopy();
auditKpiVisibleCopy();
auditSaleLegacyLocalizer();
auditKnownSpanishRuntimeMessages();

if (failures.length > 0) {
  console.error('POS i18n audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('POS i18n audit passed.');
for (const tab of tabAuditTargets) {
  console.log(`- ${tab.id}: labels checked in ${supportedLocales.length} locales; ${tab.files.length} source target(s) present.`);
}
