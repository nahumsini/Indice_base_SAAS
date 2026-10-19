import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { workspaceStateApi } from '../../api/workspaceState';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import {
  businessExchangeOfficialDailySource, getBusinessExchangeDateValue,
  type BusinessExchangeRateMetadata, type BusinessExchangeRateSettings, type BusinessExchangeRatesPerUsd,
} from './businessCurrency';
import {
  currencyPreferenceActor, currencyPreferenceModule, currencyPreferenceTab,
  defaultBusinessCurrencyPreferences, parseBusinessCurrencyPreferences, type BusinessCurrencyPreferences,
} from './businessCurrencyPreferences';
import { fetchBusinessDailyExchangeRateSettings } from './businessExchangeRatesApi';

type BusinessCurrencyContextValue = {
  exchangeRateMetadata: BusinessExchangeRateMetadata;
  exchangeRateSettings: BusinessExchangeRateSettings;
  exchangeRatesPerUsd: BusinessExchangeRatesPerUsd;
  isLoadingDailyExchangeRates: boolean;
  refreshDailyExchangeRateSettings: () => Promise<BusinessExchangeRateSettings>;
  preferredCurrency: string;
  preferenceScope: string | null;
  preferencesReady: boolean;
  preferenceError: 'load' | null;
  retryPreferences: () => void;
  savePreferences: (preferences: BusinessCurrencyPreferences) => Promise<void>;
};

type CurrencyContext = {
  actor: string;
  valid: boolean;
  ready: boolean;
  revision: number;
  saving: boolean;
  preferences: BusinessCurrencyPreferences;
};
type Snapshot = { actor: string; preferences: BusinessCurrencyPreferences; ready: boolean; loadingRates: boolean; error: 'load' | null };
const BusinessCurrencyContext = createContext<BusinessCurrencyContextValue | null>(null);

export function BusinessCurrencyProvider({ children }: { children: ReactNode }) {
  useAuthorizationRevision();
  const actor = currencyPreferenceActor(getCachedAuthSession());
  const [reload, setReload] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const defaults = useMemo(defaultBusinessCurrencyPreferences, [actor]);
  const contextRef = useRef<CurrencyContext | null>(null);
  const isCurrent = useCallback((context: CurrencyContext) => context.valid && contextRef.current === context
    && currencyPreferenceActor(getCachedAuthSession()) === context.actor, []);

  useEffect(() => {
    if (!actor) { contextRef.current = null; setSnapshot(null); return; }
    const context: CurrencyContext = {
      actor, valid: true, ready: false, revision: 0, saving: false,
      preferences: defaultBusinessCurrencyPreferences(),
    };
    contextRef.current = context;
    setSnapshot({ actor, preferences: context.preferences, ready: false, loadingRates: false, error: null });
    void workspaceStateApi.get(currencyPreferenceModule, currencyPreferenceTab).then(async response => {
      if (!isCurrent(context)) return;
      const missing = response.state && typeof response.state === 'object'
        && !Array.isArray(response.state) && Object.keys(response.state).length === 0;
      const preferences = parseBusinessCurrencyPreferences(response.state);
      if (!preferences && !missing) throw new Error('Unsupported currency preferences.');
      // Old browser-wide values have no reliable owner and are never copied into an account.
      context.preferences = preferences ?? defaultBusinessCurrencyPreferences();
      context.ready = true;
      setSnapshot({ actor, preferences: context.preferences, ready: true, loadingRates: false, error: null });
      const settings = context.preferences.exchangeRateSettings;
      const currentDay = getBusinessExchangeDateValue();
      if (settings.metadata.mode !== 'daily_reference'
        || (settings.metadata.source === businessExchangeOfficialDailySource && settings.metadata.updatedAt.slice(0, 10) === currentDay)) return;
      const revision = context.revision;
      try {
        const daily = await fetchBusinessDailyExchangeRateSettings();
        if (!isCurrent(context) || context.revision !== revision) return;
        context.preferences = { ...context.preferences, exchangeRateSettings: daily };
        setSnapshot({ actor, preferences: context.preferences, ready: true, loadingRates: false, error: null });
      } catch { /* Keep the attributed stored/internal reference; never replace a manual choice. */ }
    }).catch(() => {
      if (isCurrent(context)) setSnapshot({ actor, preferences: context.preferences, ready: false, loadingRates: false, error: 'load' });
    });
    return () => { context.valid = false; };
  }, [actor, isCurrent, reload]);

  const savePreferences = useCallback(async (preferences: BusinessCurrencyPreferences) => {
    const context = contextRef.current;
    const next = parseBusinessCurrencyPreferences(preferences);
    if (!context || !context.ready || !isCurrent(context) || context.saving || !next) throw new Error('Currency preferences are not ready.');
    context.saving = true;
    context.revision++;
    try {
      const response = await workspaceStateApi.save(currencyPreferenceModule, currencyPreferenceTab, next);
      if (!isCurrent(context)) throw new Error('Currency preference account changed.');
      const confirmed = parseBusinessCurrencyPreferences(response.state);
      if (!confirmed) throw new Error('Unsupported currency preference response.');
      context.preferences = confirmed;
      setSnapshot({ actor: context.actor, preferences: confirmed, ready: true, loadingRates: false, error: null });
    } finally { context.saving = false; }
  }, [isCurrent]);

  const refreshDailyExchangeRateSettings = useCallback(async () => {
    const context = contextRef.current;
    if (!context || !context.ready || !isCurrent(context)) throw new Error('Currency preferences are not ready.');
    setSnapshot(current => current?.actor === context.actor ? { ...current, loadingRates: true } : current);
    try {
      const reference = await fetchBusinessDailyExchangeRateSettings({ forceRefresh: true });
      if (!isCurrent(context)) throw new Error('Currency preference account changed.');
      return reference;
    } finally {
      if (isCurrent(context)) setSnapshot(current => current?.actor === context.actor ? { ...current, loadingRates: false } : current);
    }
  }, [isCurrent]);
  const current = snapshot?.actor === actor ? snapshot : null;
  const preferences = current?.preferences ?? defaults;
  const exchangeRateSettings = preferences.exchangeRateSettings;
  const value: BusinessCurrencyContextValue = {
    exchangeRateMetadata: exchangeRateSettings.metadata, exchangeRateSettings,
    exchangeRatesPerUsd: exchangeRateSettings.ratesPerUsd, preferredCurrency: preferences.preferredCurrency,
    isLoadingDailyExchangeRates: current?.loadingRates ?? false,
    preferenceScope: actor, preferencesReady: current?.ready ?? false, preferenceError: current?.error ?? null,
    retryPreferences: () => setReload(value => value + 1), savePreferences, refreshDailyExchangeRateSettings,
  };
  return <BusinessCurrencyContext.Provider value={value}>{children}</BusinessCurrencyContext.Provider>;
}

export function usePreferredBusinessCurrency() {
  const value = useContext(BusinessCurrencyContext);
  if (!value) throw new Error('usePreferredBusinessCurrency must be used within BusinessCurrencyProvider.');
  return value;
}
