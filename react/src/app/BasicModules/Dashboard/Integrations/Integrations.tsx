import { useMemo } from 'react';
import { Bot, CircleHelp, Lightbulb } from 'lucide-react';
import { useLanguage } from '../../../shared/context';
import { IndiceTitleBar, IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { Button } from '../../../components/ui/button';
import { AiSetupGuide } from './components/AiSetupGuide';
import { AiQuestionIdeas } from './components/AiQuestionIdeas';
import { ManageAiConnections } from './components/ManageAiConnections';
import { getIntegrationsTranslations } from './translations';

import { useIntegrationSection, type WorkspaceSection } from './useIntegrationSection';

export default function Integrations({ navigationInHeader = false }: { navigationInHeader?: boolean }) {
  const { currentLanguage } = useLanguage();
  const copy = getIntegrationsTranslations(currentLanguage.code);
  const { section: activeSection, setSection: setActiveSection } = useIntegrationSection();

  const navigationItems = useMemo(() => [
    { id: 'connections' as const, label: copy.navigation.connections, icon: <Bot /> },
    { id: 'guide' as const, label: copy.navigation.guide, icon: <CircleHelp /> },
    { id: 'ideas' as const, label: copy.navigation.ideas, icon: <Lightbulb /> },
  ], [copy]);

  return (
    <section className="space-y-5">
      {activeSection !== 'connections' && <IndiceTitleBar
        tone="blue"
        icon={<Bot className="h-6 w-6" />}
        title={activeSection === 'guide' ? copy.navigation.guide : copy.navigation.ideas}
        subtitle={activeSection === 'guide' ? copy.guide.description : copy.ideas.description}
        actions={activeSection === 'ideas' ? (
          <Button
            type="button"
            onClick={() => setActiveSection('guide')}
            className="h-11 rounded-xl bg-[#2563EB] px-5 text-white hover:bg-[#1D4ED8]"
          >
            <Bot className="h-4 w-4" />
            {copy.connectButton}
          </Button>
        ) : undefined}
      />}

      {!navigationInHeader && <IndiceWorkspaceNavigation<WorkspaceSection>
        ariaLabel={copy.navigation.ariaLabel}
        variant="workbar"
        moduleId="home-panel"
        items={navigationItems}
        onValueChange={setActiveSection}
        tone="blue"
        value={activeSection}
      />}

      {activeSection === 'connections' ? (
        <ManageAiConnections copy={copy} locale={currentLanguage.code} onConnect={() => setActiveSection('guide')} />
      ) : null}
      {activeSection === 'guide' ? (
        <AiSetupGuide copy={copy} />
      ) : null}
      {activeSection === 'ideas' ? <AiQuestionIdeas copy={copy} /> : null}
    </section>
  );
}
