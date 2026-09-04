import { useMemo, useState } from 'react';
import { Bot, CircleHelp, Lightbulb } from 'lucide-react';
import { useLanguage } from '../../../shared/context';
import { IndiceTitleBar, IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { Button } from '../../../components/ui/button';
import { AiSetupGuide } from './components/AiSetupGuide';
import { AiQuestionIdeas } from './components/AiQuestionIdeas';
import { getIntegrationsTranslations } from './translations';

type WorkspaceSection = 'guide' | 'ideas';

export default function Integrations() {
  const { currentLanguage } = useLanguage();
  const copy = getIntegrationsTranslations(currentLanguage.code);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('guide');

  const navigationItems = useMemo(() => [
    { id: 'guide' as const, label: copy.navigation.guide, icon: <CircleHelp /> },
    { id: 'ideas' as const, label: copy.navigation.ideas, icon: <Lightbulb /> },
  ], [copy]);

  return (
    <section className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon={<Bot className="h-6 w-6" />}
        title={copy.title}
        subtitle={copy.subtitle}
        actions={(
          <Button
            type="button"
            onClick={() => setActiveSection('guide')}
            className="h-11 rounded-xl bg-[#2563EB] px-5 text-white hover:bg-[#1D4ED8]"
          >
            <Bot className="h-4 w-4" />
            {copy.connectButton}
          </Button>
        )}
      />

      <IndiceWorkspaceNavigation<WorkspaceSection>
        ariaLabel={copy.navigation.ariaLabel}
        items={navigationItems}
        onValueChange={setActiveSection}
        tone="blue"
        value={activeSection}
      />

      {activeSection === 'guide' ? (
        <AiSetupGuide copy={copy} />
      ) : null}
      {activeSection === 'ideas' ? <AiQuestionIdeas copy={copy} /> : null}
    </section>
  );
}
