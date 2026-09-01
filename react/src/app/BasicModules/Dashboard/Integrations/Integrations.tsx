import { useMemo, useState } from 'react';
import { Bot, CircleHelp, Lightbulb, Link2, Plus } from 'lucide-react';
import { useLanguage } from '../../../shared/context';
import { IndiceTitleBar, IndiceWorkspaceNavigation } from '../../../components/frontend-os';
import { Button } from '../../../components/ui/button';
import { ConnectionsWorkspace } from './components/ConnectionsWorkspace';
import { AiSetupGuide } from './components/AiSetupGuide';
import { AiQuestionIdeas } from './components/AiQuestionIdeas';
import { CreateAiConnectionWizard } from './components/CreateAiConnectionWizard';
import { RevokeAiConnectionDialog } from './components/RevokeAiConnectionDialog';
import { useAiConnections } from './hooks/useAiConnections';
import { getIntegrationsTranslations } from './translations';
import type { AiConnection } from '../../../api/aiConnections';

type WorkspaceSection = 'connections' | 'guide' | 'ideas';

export default function Integrations() {
  const { currentLanguage } = useLanguage();
  const copy = getIntegrationsTranslations(currentLanguage.code);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('connections');
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AiConnection | null>(null);
  const workspace = useAiConnections(copy);

  const navigationItems = useMemo(() => [
    { id: 'connections' as const, label: copy.navigation.connections, icon: <Link2 /> },
    { id: 'guide' as const, label: copy.navigation.guide, icon: <CircleHelp /> },
    { id: 'ideas' as const, label: copy.navigation.ideas, icon: <Lightbulb /> },
  ], [copy]);

  const startConnection = () => {
    setActiveSection('connections');
    setCreateOpen(true);
  };

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
            onClick={startConnection}
            className="h-11 rounded-xl bg-[#2563EB] px-5 text-white hover:bg-[#1D4ED8]"
          >
            <Plus className="h-4 w-4" />
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

      {activeSection === 'connections' ? (
        <ConnectionsWorkspace
          copy={copy}
          locale={currentLanguage.code}
          workspace={workspace}
          onCreate={startConnection}
          onRevoke={setRevokeTarget}
        />
      ) : null}
      {activeSection === 'guide' ? (
        <AiSetupGuide copy={copy} hasActiveConnection={workspace.activeCount > 0} onStart={startConnection} />
      ) : null}
      {activeSection === 'ideas' ? <AiQuestionIdeas copy={copy} /> : null}

      <CreateAiConnectionWizard
        copy={copy}
        open={createOpen}
        onCreate={workspace.createConnection}
        onOpenChange={setCreateOpen}
        onShowGuide={() => {
          setCreateOpen(false);
          setActiveSection('guide');
        }}
      />

      <RevokeAiConnectionDialog
        connection={revokeTarget}
        copy={copy}
        busy={workspace.revokingId === revokeTarget?.id}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (!revokeTarget) return;
          void workspace.revokeConnection(revokeTarget).then((revoked) => {
            if (revoked) setRevokeTarget(null);
          });
        }}
      />
    </section>
  );
}
