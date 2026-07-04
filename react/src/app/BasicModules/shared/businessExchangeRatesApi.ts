import { apiClient } from '../../lib/apiClient';
import {
  createBusinessOfficialExchangeRateSettings,
  isBusinessCurrencyCode,
  type BusinessExchangeRateSettings,
  type BusinessExchangeRateSourceDetail,
} from './businessCurrency';

type ApiExchangeRateMetadata = {
  sourceDate?: string;
  updatedAt?: string;
  sourceName?: string;
  sourceUrl?: string;
  licenseUrl?: string;
  sourceSummary?: string;
};

type ApiExchangeRateSource = {
  currencyCode?: string;
  ratePerUsd?: number | string;
  observedDate?: string;
  institution?: string;
  dataset?: string;
  sourceUrl?: string;
  licenseUrl?: string;
  status?: string;
  note?: string;
};

type ApiExchangeRatesResponse = {
  ratesPerUsd?: Record<string, number | string | null>;
  metadata?: ApiExchangeRateMetadata;
  sources?: ApiExchangeRateSource[];
  warnings?: string[];
};

function normalizeSourceDetail(source: ApiExchangeRateSource): BusinessExchangeRateSourceDetail | null {
  const currencyCode = String(source.currencyCode ?? '').trim().toUpperCase();
  const ratePerUsd = Number(source.ratePerUsd);

  if (!isBusinessCurrencyCode(currencyCode) || !Number.isFinite(ratePerUsd) || ratePerUsd <= 0) {
    return null;
  }

  return {
    currencyCode,
    ratePerUsd,
    observedDate: typeof source.observedDate === 'string' ? source.observedDate : '',
    institution: typeof source.institution === 'string' ? source.institution : '',
    dataset: typeof source.dataset === 'string' ? source.dataset : '',
    sourceUrl: typeof source.sourceUrl === 'string' ? source.sourceUrl : '',
    licenseUrl: typeof source.licenseUrl === 'string' ? source.licenseUrl : '',
    status: typeof source.status === 'string' ? source.status : 'official',
    note: typeof source.note === 'string' ? source.note : undefined,
  };
}

export async function fetchBusinessDailyExchangeRateSettings(): Promise<BusinessExchangeRateSettings> {
  const response = await apiClient<ApiExchangeRatesResponse>('/api/v1/exchange-rates/daily');
  const sourceDetails = (response.sources ?? [])
    .map(normalizeSourceDetail)
    .filter((source): source is BusinessExchangeRateSourceDetail => Boolean(source));

  return createBusinessOfficialExchangeRateSettings(response.ratesPerUsd ?? {}, {
    sourceDate: response.metadata?.sourceDate,
    updatedAt: response.metadata?.updatedAt,
    sourceName: response.metadata?.sourceName,
    sourceUrl: response.metadata?.sourceUrl,
    licenseUrl: response.metadata?.licenseUrl,
    sourceSummary: response.metadata?.sourceSummary,
    sourceDetails,
    warnings: response.warnings ?? [],
  });
}
