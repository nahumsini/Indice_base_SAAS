import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import {
  businessExchangeRateSettingsStorageKey,
  businessExchangeOfficialDailySource,
  businessPreferredCurrencyStorageKey,
  createBusinessDailyExchangeRateSettings,
  defaultBusinessCurrency,
  getBusinessExchangeDateValue,
  isBusinessCurrencyCode,
  legacyHrExchangeRateSettingsStorageKey,
  legacyHrPreferredCurrencyStorageKey,
  normalizeBusinessExchangeRateSettings,
  type BusinessExchangeRateMetadata,
  type BusinessExchangeRateSettings,
  type BusinessExchangeRatesPerUsd,
} from './businessCurrency';
import { fetchBusinessDailyExchangeRateSettings } from './businessExchangeRatesApi';

type BusinessCurrencyContextValue = {
  exchangeRateMetadata: BusinessExchangeRateMetadata;
  exchangeRateSettings: BusinessExchangeRateSettings;
  exchangeRatesPerUsd: BusinessExchangeRatesPerUsd;
  isLoadingDailyExchangeRates: boolean;
  loadDailyExchangeRateSettings: () => Promise<BusinessExchangeRateSettings>;
  refreshDailyExchangeRateSettings: () => Promise<BusinessExchangeRateSettings>;
  preferredCurrency: string;
  setExchangeRateSettings: Dispatch<SetStateAction<unknown>>;
  setPreferredCurrency: Dispatch<SetStateAction<string>>;
};

const BusinessCurrencyContext = createContext<BusinessCurrencyContextValue | null>(null);

function readStoredJsonValue(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue === null ? null : JSON.parse(storedValue);
  } catch {
    return null;
  }
}

function resolveInitialPreferredCurrency() {
  const storedPreferredCurrency = readStoredJsonValue(businessPreferredCurrencyStorageKey);
  if (typeof storedPreferredCurrency === 'string' && isBusinessCurrencyCode(storedPreferredCurrency)) {
    return storedPreferredCurrency;
  }

  const legacyPreferredCurrency = readStoredJsonValue(legacyHrPreferredCurrencyStorageKey);
  if (typeof legacyPreferredCurrency === 'string' && isBusinessCurrencyCode(legacyPreferredCurrency)) {
    return legacyPreferredCurrency;
  }

  return defaultBusinessCurrency;
}

function resolveInitialExchangeRateSettings() {
  return readStoredJsonValue(businessExchangeRateSettingsStorageKey)
    ?? readStoredJsonValue(legacyHrExchangeRateSettingsStorageKey)
    ?? createBusinessDailyExchangeRateSettings();
}

export function BusinessCurrencyProvider({ children }: { children: ReactNode }) {
  const [isLoadingDailyExchangeRates, setIsLoadingDailyExchangeRates] = useState(false);
  const dailyExchangeRateLoadAttemptRef = useRef('');
  const [storedPreferredCurrency, setPreferredCurrency] = useLocalStorageState<string>(
    businessPreferredCurrencyStorageKey,
    resolveInitialPreferredCurrency(),
  );
  const [storedExchangeRateSettings, setExchangeRateSettings] = useLocalStorageState<unknown>(
    businessExchangeRateSettingsStorageKey,
    resolveInitialExchangeRateSettings(),
  );
  const preferredCurrency = isBusinessCurrencyCode(storedPreferredCurrency)
    ? storedPreferredCurrency
    : defaultBusinessCurrency;
  const exchangeRateSettings = useMemo(
    () => normalizeBusinessExchangeRateSettings(storedExchangeRateSettings),
    [storedExchangeRateSettings],
  );
  const loadDailyExchangeRateSettings = useCallback(async () => {
    setIsLoadingDailyExchangeRates(true);
    try {
      const officialSettings = await fetchBusinessDailyExchangeRateSettings();
      setExchangeRateSettings(officialSettings);
      return officialSettings;
    } catch {
      const fallbackSettings = createBusinessDailyExchangeRateSettings();
      setExchangeRateSettings(fallbackSettings);
      return fallbackSettings;
    } finally {
      setIsLoadingDailyExchangeRates(false);
    }
  }, [setExchangeRateSettings]);
  const refreshDailyExchangeRateSettings = useCallback(async () => {
    setIsLoadingDailyExchangeRates(true);
    try {
      return await fetchBusinessDailyExchangeRateSettings({ forceRefresh: true });
    } finally {
      setIsLoadingDailyExchangeRates(false);
    }
  }, []);

  useEffect(() => {
    if (exchangeRateSettings.metadata.mode !== 'daily_reference') {
      return;
    }

    const today = getBusinessExchangeDateValue();
    const alreadyLoadedOfficialReference = exchangeRateSettings.metadata.source === businessExchangeOfficialDailySource
      && exchangeRateSettings.metadata.updatedAt.slice(0, 10) === today;

    if (alreadyLoadedOfficialReference) {
      return;
    }

    if (dailyExchangeRateLoadAttemptRef.current === today) {
      return;
    }

    dailyExchangeRateLoadAttemptRef.current = today;
    void loadDailyExchangeRateSettings();
  }, [
    exchangeRateSettings.metadata.mode,
    exchangeRateSettings.metadata.source,
    exchangeRateSettings.metadata.updatedAt,
    loadDailyExchangeRateSettings,
  ]);

  const value = useMemo<BusinessCurrencyContextValue>(() => ({
    exchangeRateMetadata: exchangeRateSettings.metadata,
    exchangeRateSettings,
    exchangeRatesPerUsd: exchangeRateSettings.ratesPerUsd,
    isLoadingDailyExchangeRates,
    loadDailyExchangeRateSettings,
    preferredCurrency,
    refreshDailyExchangeRateSettings,
    setExchangeRateSettings,
    setPreferredCurrency,
  }), [
    exchangeRateSettings,
    isLoadingDailyExchangeRates,
    loadDailyExchangeRateSettings,
    preferredCurrency,
    refreshDailyExchangeRateSettings,
    setExchangeRateSettings,
    setPreferredCurrency,
  ]);

  return (
    <BusinessCurrencyContext.Provider value={value}>
      {children}
    </BusinessCurrencyContext.Provider>
  );
}

export function usePreferredBusinessCurrency() {
  const value = useContext(BusinessCurrencyContext);
  if (!value) {
    throw new Error('usePreferredBusinessCurrency must be used within BusinessCurrencyProvider.');
  }
  return value;
}
