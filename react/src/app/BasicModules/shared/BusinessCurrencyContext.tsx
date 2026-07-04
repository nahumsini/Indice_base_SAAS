import {
  createContext,
  useContext,
  useMemo,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import {
  businessExchangeRateSettingsStorageKey,
  businessPreferredCurrencyStorageKey,
  createBusinessDailyExchangeRateSettings,
  defaultBusinessCurrency,
  isBusinessCurrencyCode,
  legacyHrExchangeRateSettingsStorageKey,
  legacyHrPreferredCurrencyStorageKey,
  normalizeBusinessExchangeRateSettings,
  type BusinessExchangeRateMetadata,
  type BusinessExchangeRateSettings,
  type BusinessExchangeRatesPerUsd,
} from './businessCurrency';

type BusinessCurrencyContextValue = {
  exchangeRateMetadata: BusinessExchangeRateMetadata;
  exchangeRateSettings: BusinessExchangeRateSettings;
  exchangeRatesPerUsd: BusinessExchangeRatesPerUsd;
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

  const value = useMemo<BusinessCurrencyContextValue>(() => ({
    exchangeRateMetadata: exchangeRateSettings.metadata,
    exchangeRateSettings,
    exchangeRatesPerUsd: exchangeRateSettings.ratesPerUsd,
    preferredCurrency,
    setExchangeRateSettings,
    setPreferredCurrency,
  }), [exchangeRateSettings, preferredCurrency, setExchangeRateSettings, setPreferredCurrency]);

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
