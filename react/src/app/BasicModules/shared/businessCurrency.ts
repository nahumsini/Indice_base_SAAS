export const defaultBusinessCurrency = 'MXN';
export const businessPreferredCurrencyStorageKey = 'indice.business.preferredCurrency';
export const businessExchangeRateSettingsStorageKey = 'indice.business.exchangeRatesPerUsd';
export const legacyHrPreferredCurrencyStorageKey = 'indice.hr.employeesPreferredCurrency';
export const legacyHrExchangeRateSettingsStorageKey = 'indice.hr.employeesExchangeRatesPerUsd';
export const hrPreferredCurrencyStorageKey = businessPreferredCurrencyStorageKey;
export const hrExchangeRateSettingsStorageKey = businessExchangeRateSettingsStorageKey;

export const businessCurrencyOptions = [
  { code: 'MXN', locale: 'es-MX' },
  { code: 'CAD', locale: 'en-CA' },
  { code: 'USD', locale: 'en-US' },
  { code: 'COP', locale: 'es-CO' },
  { code: 'BRL', locale: 'pt-BR' },
] as const;

export const businessCurrencyCodes = businessCurrencyOptions.map((option) => option.code) as Array<BusinessCurrencyCode>;

export type BusinessCurrencyCode = (typeof businessCurrencyOptions)[number]['code'];
export type BusinessExchangeRatesPerUsd = Record<BusinessCurrencyCode, number>;
export type BusinessExchangeRateMode = 'daily_reference' | 'manual';
export type BusinessExchangeRateSource = 'official_daily_reference' | 'internal_daily_reference' | 'manual_override';

export interface BusinessExchangeRateSourceDetail {
  currencyCode: BusinessCurrencyCode;
  ratePerUsd: number;
  observedDate: string;
  institution: string;
  dataset: string;
  sourceUrl: string;
  licenseUrl: string;
  status: 'official' | 'fallback' | string;
  note?: string;
}

export interface BusinessExchangeRateMetadata {
  mode: BusinessExchangeRateMode;
  source: BusinessExchangeRateSource;
  sourceDate: string;
  updatedAt: string;
  sourceName?: string;
  sourceUrl?: string;
  licenseUrl?: string;
  sourceSummary?: string;
  sourceDetails?: BusinessExchangeRateSourceDetail[];
  warnings?: string[];
}

export interface BusinessExchangeRateSettings {
  ratesPerUsd: BusinessExchangeRatesPerUsd;
  metadata: BusinessExchangeRateMetadata;
}

export const businessExchangeBaseCurrency: BusinessCurrencyCode = 'USD';
export const businessExchangeOfficialDailySource: BusinessExchangeRateSource = 'official_daily_reference';
export const businessExchangeDailyReferenceSource: BusinessExchangeRateSource = 'internal_daily_reference';
export const businessExchangeManualSource: BusinessExchangeRateSource = 'manual_override';

const currencyLocaleByCode = new Map<string, string>(
  businessCurrencyOptions.map((option) => [option.code, option.locale]),
);

export const defaultBusinessExchangeRatesPerUsd: BusinessExchangeRatesPerUsd = {
  MXN: 18.45,
  CAD: 1.361624,
  USD: 1,
  COP: 4010.869565,
  BRL: 5.507463,
};

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function getBusinessExchangeDateValue(date = new Date()) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
}

function getBusinessExchangeTimestamp(date = new Date()) {
  return date.toISOString();
}

function roundCurrencyAmount(value: number) {
  return Number(value.toFixed(2));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function areBusinessExchangeRatesEqual(
  left: BusinessExchangeRatesPerUsd,
  right: BusinessExchangeRatesPerUsd,
) {
  return businessCurrencyCodes.every((currencyCode) => Math.abs(left[currencyCode] - right[currencyCode]) < 0.0000001);
}

function isBusinessExchangeRateMode(value: unknown): value is BusinessExchangeRateMode {
  return value === 'daily_reference' || value === 'manual';
}

function isBusinessExchangeRateSource(value: unknown): value is BusinessExchangeRateSource {
  return value === businessExchangeOfficialDailySource
    || value === businessExchangeDailyReferenceSource
    || value === businessExchangeManualSource;
}

export function normalizeBusinessCurrencyCode(value?: string | null, fallback = defaultBusinessCurrency) {
  const code = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

export function isBusinessCurrencyCode(value: string): value is BusinessCurrencyCode {
  const code = String(value ?? '').trim().toUpperCase();
  return businessCurrencyCodes.includes(code as BusinessCurrencyCode);
}

export function normalizeBusinessExchangeRatesPerUsd(
  value?: Partial<Record<string, string | number | null>> | null,
): BusinessExchangeRatesPerUsd {
  const normalizedRates = { ...defaultBusinessExchangeRatesPerUsd };

  businessCurrencyCodes.forEach((currencyCode) => {
    const parsedRate = Number(value?.[currencyCode]);
    if (Number.isFinite(parsedRate) && parsedRate > 0) {
      normalizedRates[currencyCode] = parsedRate;
    }
  });

  normalizedRates[businessExchangeBaseCurrency] = 1;
  return normalizedRates;
}

function normalizeBusinessExchangeRateSourceDetails(value?: unknown): BusinessExchangeRateSourceDetail[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isPlainRecord(item)) {
      return [];
    }

    const currencyCode = String(item.currencyCode ?? '').trim().toUpperCase();
    if (!isBusinessCurrencyCode(currencyCode)) {
      return [];
    }

    const ratePerUsd = Number(item.ratePerUsd);

    return [{
      currencyCode,
      ratePerUsd: Number.isFinite(ratePerUsd) && ratePerUsd > 0
        ? ratePerUsd
        : defaultBusinessExchangeRatesPerUsd[currencyCode],
      observedDate: typeof item.observedDate === 'string' ? item.observedDate : '',
      institution: typeof item.institution === 'string' ? item.institution : '',
      dataset: typeof item.dataset === 'string' ? item.dataset : '',
      sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl : '',
      licenseUrl: typeof item.licenseUrl === 'string' ? item.licenseUrl : '',
      status: typeof item.status === 'string' ? item.status : 'official',
      note: typeof item.note === 'string' ? item.note : undefined,
    }];
  });
}

function normalizeBusinessExchangeRateWarnings(value?: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export function createBusinessDailyExchangeRateSettings(date = new Date()): BusinessExchangeRateSettings {
  const sourceDate = getBusinessExchangeDateValue(date);

  return {
    ratesPerUsd: { ...defaultBusinessExchangeRatesPerUsd },
    metadata: {
      mode: 'daily_reference',
      source: businessExchangeDailyReferenceSource,
      sourceDate,
      updatedAt: getBusinessExchangeTimestamp(date),
      sourceName: 'Referencia diaria interna',
      sourceSummary: 'Tasas internas usadas como respaldo operativo cuando una fuente oficial no esta disponible.',
    },
  };
}

export function createBusinessOfficialExchangeRateSettings(
  ratesPerUsd: Partial<Record<string, string | number | null>>,
  metadata: Partial<BusinessExchangeRateMetadata> = {},
  date = new Date(),
): BusinessExchangeRateSettings {
  const sourceDate = typeof metadata.sourceDate === 'string' && metadata.sourceDate.trim()
    ? metadata.sourceDate
    : getBusinessExchangeDateValue(date);

  return {
    ratesPerUsd: normalizeBusinessExchangeRatesPerUsd(ratesPerUsd),
    metadata: {
      mode: 'daily_reference',
      source: businessExchangeOfficialDailySource,
      sourceDate,
      updatedAt: typeof metadata.updatedAt === 'string' && metadata.updatedAt.trim()
        ? metadata.updatedAt
        : getBusinessExchangeTimestamp(date),
      sourceName: typeof metadata.sourceName === 'string' && metadata.sourceName.trim()
        ? metadata.sourceName
        : 'Fuentes oficiales',
      sourceUrl: typeof metadata.sourceUrl === 'string' ? metadata.sourceUrl : '',
      licenseUrl: typeof metadata.licenseUrl === 'string' ? metadata.licenseUrl : '',
      sourceSummary: typeof metadata.sourceSummary === 'string' && metadata.sourceSummary.trim()
        ? metadata.sourceSummary
        : 'Tasas informativas consultadas desde fuentes oficiales disponibles para estimaciones operativas.',
      sourceDetails: normalizeBusinessExchangeRateSourceDetails(metadata.sourceDetails),
      warnings: normalizeBusinessExchangeRateWarnings(metadata.warnings),
    },
  };
}

export function createBusinessManualExchangeRateSettings(
  ratesPerUsd: BusinessExchangeRatesPerUsd,
  date = new Date(),
): BusinessExchangeRateSettings {
  const sourceDate = getBusinessExchangeDateValue(date);

  return {
    ratesPerUsd: normalizeBusinessExchangeRatesPerUsd(ratesPerUsd),
    metadata: {
      mode: 'manual',
      source: businessExchangeManualSource,
      sourceDate,
      updatedAt: getBusinessExchangeTimestamp(date),
    },
  };
}

export function normalizeBusinessExchangeRateSettings(value?: unknown): BusinessExchangeRateSettings {
  const storedRecord = isPlainRecord(value) ? value : null;
  const ratesRecord = isPlainRecord(storedRecord?.ratesPerUsd)
    ? storedRecord.ratesPerUsd
    : storedRecord;
  const ratesPerUsd = normalizeBusinessExchangeRatesPerUsd(
    ratesRecord as Partial<Record<string, string | number | null>> | null,
  );
  const metadataRecord = isPlainRecord(storedRecord?.metadata) ? storedRecord.metadata : null;
  const hasSettingsShape = Boolean(storedRecord && 'ratesPerUsd' in storedRecord);
  const hasLegacyRatesShape = Boolean(storedRecord && !hasSettingsShape && businessCurrencyCodes.some((code) => code in storedRecord));
  const inferredMode: BusinessExchangeRateMode = hasLegacyRatesShape
    && !areBusinessExchangeRatesEqual(ratesPerUsd, defaultBusinessExchangeRatesPerUsd)
    ? 'manual'
    : 'daily_reference';
  const mode: BusinessExchangeRateMode = isBusinessExchangeRateMode(metadataRecord?.mode)
    ? metadataRecord.mode
    : inferredMode;
  const source: BusinessExchangeRateSource = isBusinessExchangeRateSource(metadataRecord?.source)
    ? metadataRecord.source
    : mode === 'manual'
      ? businessExchangeManualSource
      : businessExchangeDailyReferenceSource;
  const today = getBusinessExchangeDateValue();
  const sourceDate = typeof metadataRecord?.sourceDate === 'string' && metadataRecord.sourceDate.trim()
    ? metadataRecord.sourceDate
    : today;
  const fallbackUpdatedAtDate = new Date(`${sourceDate}T00:00:00`);
  const fallbackUpdatedAt = Number.isNaN(fallbackUpdatedAtDate.getTime())
    ? getBusinessExchangeTimestamp()
    : fallbackUpdatedAtDate.toISOString();
  const updatedAt = typeof metadataRecord?.updatedAt === 'string' && metadataRecord.updatedAt.trim()
    ? metadataRecord.updatedAt
    : fallbackUpdatedAt;
  const sourceName = typeof metadataRecord?.sourceName === 'string' && metadataRecord.sourceName.trim()
    ? metadataRecord.sourceName
    : undefined;
  const sourceUrl = typeof metadataRecord?.sourceUrl === 'string'
    ? metadataRecord.sourceUrl
    : undefined;
  const licenseUrl = typeof metadataRecord?.licenseUrl === 'string'
    ? metadataRecord.licenseUrl
    : undefined;
  const sourceSummary = typeof metadataRecord?.sourceSummary === 'string' && metadataRecord.sourceSummary.trim()
    ? metadataRecord.sourceSummary
    : undefined;
  const sourceDetails = normalizeBusinessExchangeRateSourceDetails(metadataRecord?.sourceDetails);
  const warnings = normalizeBusinessExchangeRateWarnings(metadataRecord?.warnings);

  return {
    ratesPerUsd,
    metadata: {
      mode,
      source,
      sourceDate,
      updatedAt,
      sourceName,
      sourceUrl,
      licenseUrl,
      sourceSummary,
      sourceDetails,
      warnings,
    },
  };
}

export function getBusinessExchangeRatePerUsd(
  currencyCode?: string | null,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  const normalizedCurrency = normalizeBusinessCurrencyCode(currencyCode);
  const rates = exchangeRatesPerUsd ?? defaultBusinessExchangeRatesPerUsd;
  return rates[normalizedCurrency as BusinessCurrencyCode] ?? rates[businessExchangeBaseCurrency];
}

export function getBusinessCurrencyLocale(currencyCode?: string | null) {
  const code = normalizeBusinessCurrencyCode(currencyCode);
  return currencyLocaleByCode.get(code) ?? 'en-CA';
}

export function formatBusinessCurrencyAmount(
  value: number,
  currencyCode?: string | null,
  options: Intl.NumberFormatOptions = {},
) {
  const amount = Number.isFinite(value) ? value : 0;
  const currency = normalizeBusinessCurrencyCode(currencyCode);

  try {
    return new Intl.NumberFormat(getBusinessCurrencyLocale(currency), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      ...options,
    }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat('en-CA', options).format(amount)}`;
  }
}

export function convertBusinessCurrencyAmount(
  amount: number,
  sourceCurrency?: string | null,
  targetCurrency?: string | null,
  exchangeRatesPerUsd?: BusinessExchangeRatesPerUsd,
) {
  const source = normalizeBusinessCurrencyCode(sourceCurrency);
  const target = normalizeBusinessCurrencyCode(targetCurrency);
  const exchangeRate = source === target
    ? 1
    : getBusinessExchangeRatePerUsd(target, exchangeRatesPerUsd) / getBusinessExchangeRatePerUsd(source, exchangeRatesPerUsd);

  return roundCurrencyAmount((Number.isFinite(amount) ? amount : 0) * exchangeRate);
}

export function formatBusinessCurrencyBreakdown<TItem>(
  items: TItem[],
  getAmount: (item: TItem) => number,
  getCurrency: (item: TItem) => string | null | undefined,
) {
  const totalsByCurrency = items.reduce<Map<string, number>>((totals, item) => {
    const currency = normalizeBusinessCurrencyCode(getCurrency(item));
    totals.set(currency, (totals.get(currency) ?? 0) + getAmount(item));
    return totals;
  }, new Map());

  if (totalsByCurrency.size === 0) {
    return formatBusinessCurrencyAmount(0);
  }

  return Array.from(totalsByCurrency.entries())
    .map(([currency, total]) => formatBusinessCurrencyAmount(total, currency))
    .join(' / ');
}
