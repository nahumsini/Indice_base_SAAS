import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLearningModePreferences } from '../../src/app/hooks/useLearningModePreferences';
import { useLocalStorageState } from '../../src/app/hooks/useLocalStorageState';
import { clearBrowserLocalStorage, setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import { LearningModeSettingsModal } from '../../src/app/learningMode/components/LearningModeSettingsModal';
import { LanguageProvider } from '../../src/app/shared/context';
import { SimpleModuleLearningGuide } from '../../src/app/learningMode/components/SimpleModuleLearningGuide';
import { expensesLearningEnglish } from '../../src/app/BasicModules/Expenses/operationalGuidance/expensesLearningEnglish';
import { expensesLearningControls, expensesLearningLabels } from '../../src/app/BasicModules/Expenses/operationalGuidance/expensesLearningControls';
import { learningModeGuideThemes } from '../../src/app/learningMode/themes';
import { OperationalModuleGuide as HumanResourcesGuide } from '../../src/app/BasicModules/HumanResources/operationalGuidance/components/OperationalModuleGuide';
import { enCA as humanResourcesEnglish } from '../../src/app/BasicModules/HumanResources/operationalGuidance/translations/en-CA';
import { OperationalJourney } from '../../src/app/Dashboard/components/OperationalJourney';
import { buildOperationalJourneyView } from '../../src/app/Dashboard/operationalJourney';
import { useMainDashboardTranslations } from '../../src/app/Dashboard/hooks/useMainDashboardTranslations';
import '../../src/styles/index.css';

const session = (id = 9001, companyId = 9001) => ({ user: { id, role: 'admin', name: 'Synthetic user' }, company: { id: companyId, active: true, role: 'admin' } }) as never;
setCachedAuthSession(session());
setCachedCsrfToken('synthetic-csrf');
function Fixture() {
  const [identity, setIdentity] = useState(session());
  const preferences = useLearningModePreferences(identity);
  const [dark, setDark] = useLocalStorageState('indice.app.darkMode', false, true);
  const copy = useMainDashboardTranslations();
  const [guideTab, setGuideTab] = useState('expenses');
  const [hrTab, setHrTab] = useState('collaborators');
  const [showGuides, setShowGuides] = useState(false);
  const [open, setOpen] = useState(false);
  const [split, setSplit] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);
  Object.assign(window, { preferenceFixture: {
    preferences,
    switchUser(id: number, companyId = 9001) { const next = session(id, companyId); setCachedAuthSession(next); setCachedCsrfToken('synthetic-csrf'); setIdentity(next); },
    logout() { clearBrowserLocalStorage(); setCachedAuthSession(null); setIdentity(null as never); },
  } });
  return <>
    <output data-testid="active">{String(preferences.learningModeActive)}</output>
    <output data-testid="ready">{String(preferences.preferencesReady)}</output>
    <output data-testid="step">{preferences.learningStep}</output>
    <button onClick={() => setOpen(true)}>Settings</button>
    <button onClick={() => setDark(value => !value)}>Theme</button>
    <button onClick={() => setSplit(value => !value)}>Split</button>
    <LearningModeSettingsModal ready={preferences.preferencesReady} preferenceError={preferences.preferenceError} onRetry={preferences.retryPreferences} open={open} onOpenChange={setOpen} onSave={preferences.saveLearningModeSettings}
      currentSettings={{ active: preferences.learningModeActive, visible: preferences.learningModeVisible, step: preferences.learningStep }} />
    <button onClick={() => setShowGuides(value => !value)}>Guides</button>
    {showGuides && <>
      <section data-testid="expenses-guide"><SimpleModuleLearningGuide activeContextLabel={expensesLearningLabels[guideTab]}
        englishOverview={expensesLearningEnglish} activeJourneyId={guideTab} controls={expensesLearningControls[guideTab]}
        guideId="expenses-learning-guide" moduleTitle="Expenses" scopeId={`expenses-${guideTab}`} theme={learningModeGuideThemes.finance}
        journey={Object.entries(expensesLearningLabels).map(([id, label]) => ({ id, label, emoji: '📋' }))}
        onJourneyChange={setGuideTab} onPrimaryAction={() => {}} /></section>
      <section data-testid="hr-guide"><HumanResourcesGuide copy={humanResourcesEnglish} activeTabId={hrTab as never}
        availableTabIds={['collaborators', 'attendance', 'payroll']} onNavigateArea={setHrTab} onPrimaryAction={() => {}} /></section>
      <section data-testid="dashboard-guide"><OperationalJourney copy={copy.operationalJourney}
        stages={buildOperationalJourneyView(preferences.learningStep)} stageModules={{}}
        activeStageId={buildOperationalJourneyView(preferences.learningStep)[preferences.learningStep]?.id}
        onStageSelect={() => {}} onModuleClick={() => {}} onDismiss={() => preferences.setLearningModeVisible(false)} /></section>
    </>}
    {split && <iframe title="Secondary" src="/tests/browser/preferences.html?secondary=1" />}
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><Fixture /></LanguageProvider></StrictMode>);
