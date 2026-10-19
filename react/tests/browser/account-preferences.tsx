import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Header } from '../../src/app/components/Header';
import { LanguageProvider } from '../../src/app/shared/context';
import { WorkbarLayoutProvider } from '../../src/app/components/workbar/WorkbarLayoutContext';
import { BusinessCurrencyProvider, usePreferredBusinessCurrency } from '../../src/app/BasicModules/shared/BusinessCurrencyContext';
import { useLearningModePreferences } from '../../src/app/hooks/useLearningModePreferences';
import { setCachedAuthSession, setCachedCsrfToken, clearBrowserLocalStorage } from '../../src/app/api/authSessionStore';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import '../../src/styles/index.css';

const session = (id = 9001, companyId = 9001, role = 'admin', modules = ['config_center'], tabs = ['config_center.profile', 'config_center.business-structure']): AuthSessionResponse => ({
  user: { id, role, name: 'Synthetic user', module_slugs: modules, tab_permissions_configured: true, tab_permission_keys: tabs },
  company: { id: companyId, name: 'Synthetic company', active: true, role, commercial_account_type: 'SUPER_ADMIN', user_company_id: id,
    scope: { type: 'corporate_office', unit_id: null, business_id: null } }, companies: [], csrfToken: 'synthetic-csrf',
});
setCachedAuthSession(session()); setCachedCsrfToken('synthetic-csrf');
function Fixture() {
  const [identity, setIdentity] = useState<AuthSessionResponse | null>(session());
  const [dark, setDark] = useState(false);
  const preferences = useLearningModePreferences(identity);
  const currency = usePreferredBusinessCurrency();
  Object.assign(window, { accountFixture: {
    currency,
    switchUser(id: number, companyId = 9001, role = 'admin', modules?: string[], tabs?: string[]) {
      const next = session(id, companyId, role, modules, tabs);
      setCachedAuthSession(next); setCachedCsrfToken('synthetic-csrf'); setIdentity(next);
    },
    logout() { clearBrowserLocalStorage(); setCachedAuthSession(null); setIdentity(null); },
  } });
  return <>
    <Header learningModeActive={preferences.learningModeActive} learningModeVisible={preferences.learningModeVisible}
      learningStep={preferences.learningStep} onSaveLearningModeSettings={preferences.saveLearningModeSettings}
      learningPreferencesReady={preferences.preferencesReady} learningPreferenceError={preferences.preferenceError}
      onRetryLearningPreferences={preferences.retryPreferences} darkMode={dark}
      onToggleDarkMode={() => { setDark(!dark); document.documentElement.classList.toggle('dark', !dark); }} />
    <main><output data-testid="ready">{String(currency.preferencesReady)}</output>
      <output data-testid="currency">{currency.preferredCurrency}</output>
      <output data-testid="scope">{currency.preferenceScope}</output></main>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><LanguageProvider><BusinessCurrencyProvider><WorkbarLayoutProvider><Fixture /></WorkbarLayoutProvider></BusinessCurrencyProvider></LanguageProvider></BrowserRouter></StrictMode>);
