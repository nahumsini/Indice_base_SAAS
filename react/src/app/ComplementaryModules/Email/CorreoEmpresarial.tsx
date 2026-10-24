import { canAccessModuleTab } from "../../access/tabScopeCatalog";
import { getCachedAuthSession } from "../../api/authSessionStore";
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Mail, Settings } from 'lucide-react';
import { LoadingBarOverlay } from '../../components/LoadingBarOverlay';
import { IndiceModuleShell } from '../../components/frontend-os';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { useAuthorizationRevision } from '../../hooks/useAuthorizationRevision';
import { EmailAccountsWorkspace } from './EmailAccountsWorkspace';
import { EmailMailboxWorkspace } from './EmailMailboxWorkspace';
import { LiveMailboxWorkspace } from './LiveMailboxWorkspace';
import { useEmailCopy } from './translations';

const tabs = ['mail', 'accounts'] as const;
export default function CorreoEmpresarial({ onNavigate, preview = false }: {
  onNavigate?: (page?: string) => void; preview?: boolean;
}) {
  const { copy } = useEmailCopy();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const revision = useAuthorizationRevision();
  const canOpenMailbox = preview || canAccessModuleTab("email", "mail", getCachedAuthSession());
  const canConfigureAccounts = preview || canAccessModuleTab("email", "accounts", getCachedAuthSession());
  const [previewTab, setPreviewTab] = useState<'mail' | 'accounts'>('mail');
  const { activeTab, setActiveTab, isTabLoading } = useRoutedModuleTab('mail', tabs);
  const tab = preview ? previewTab : activeTab;
  const changeTab = preview ? setPreviewTab : setActiveTab;
  const candidate = params.get('campaign');
  const campaign = candidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(candidate) ? candidate : null;
  return <IndiceModuleShell<'mail' | 'accounts'> containedWorkspace currentModule="email" title={copy.title} subtitle={copy.subtitle} tone="blue"
    activeTab={tab} onTabChange={changeTab} onNavigate={onNavigate}
    loadingOverlay={<LoadingBarOverlay isVisible={!preview && isTabLoading} title={copy.title} description={copy.subtitle} />}
    tabs={[{ id: 'mail', label: copy.mailbox, icon: <Mail className="h-4 w-4" /> }, { id: 'accounts', label: copy.accounts, icon: <Settings className="h-4 w-4" /> }]}>
    <div className="space-y-5" key={revision}>
      {preview && <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{copy.previewNotice}</p>}
      {tab === 'accounts' ? <EmailAccountsWorkspace onMailbox={canOpenMailbox ? () => changeTab('mail') : undefined} onReturn={campaign ? () => navigate(`/sales/mailing?campaign=${campaign}`) : undefined} />
        : preview ? <EmailMailboxWorkspace preview onAccounts={() => changeTab('accounts')} />
        : <LiveMailboxWorkspace onAccounts={canConfigureAccounts ? () => changeTab('accounts') : undefined} />}
    </div>
  </IndiceModuleShell>;
}
