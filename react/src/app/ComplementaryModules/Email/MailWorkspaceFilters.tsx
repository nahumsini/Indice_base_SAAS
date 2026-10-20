import {
  IndiceFilterBar, IndiceFilterDisclosureActions, IndiceFilterSearch, IndiceFilterSelect,
  useIndiceFilterDisclosureCopy,
} from '../../components/frontend-os';
import type { MailboxAccount } from './mailboxApi';
import { useEmailCopy } from './translations';
import { useMailboxCopy } from './mailboxCopy';
import { useMailWorkspaceCopy } from './mailWorkspaceCopy';

/** Controlled presentation: mailbox scope and all requests remain with the workspace owner. */
export function MailWorkspaceFilters({ accounts, accountId, query, quick, busy, className,
  onQuery, onAccount, onQuick, onClear,
}: {
  accounts: MailboxAccount[]; accountId: string; query: string; quick: string; busy: boolean;
  className?: string;
  onQuery: (value: string) => void; onAccount: (value: string) => void;
  onQuick: (value: string) => void; onClear: () => void;
}) {
  const { copy } = useEmailCopy(); const text = useMailboxCopy();
  const work = useMailWorkspaceCopy(); const filterCopy = useIndiceFilterDisclosureCopy();
  return <fieldset disabled={busy} className={`min-w-0 ${className ?? ''}`}>
    <IndiceFilterBar title={work.filters} gridClassName="lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,.8fr)]"
      summary={<IndiceFilterDisclosureActions tone="blue" showAdvancedToggle={false}
        activeAdvancedCount={0} isAdvancedOpen={false} onToggleAdvanced={() => {}}
        advancedLabel={filterCopy.moreFilters} clearLabel={filterCopy.clearFilters}
        hasActiveFilters={!!query || quick !== 'ALL'} onClear={onClear} />}>
      <IndiceFilterSearch tone="blue" label={copy.search} placeholder={work.search}
        value={query} onValueChange={onQuery} onClear={() => onQuery('')} clearLabel={work.clearSearch} />
      <IndiceFilterSelect tone="blue" label={text.account} value={accountId} onValueChange={onAccount}
        options={accounts.map(account => ({ value: account.id, label: `${account.label} · ${account.email}`, disabled: busy }))} />
      <IndiceFilterSelect tone="blue" label={work.showMessages} value={quick} onValueChange={onQuick}
        options={[{ value: 'ALL', label: work.all }, { value: 'UNREAD', label: copy.notRead }, { value: 'STARRED', label: copy.starred }].map(option => ({ ...option, disabled: busy }))} />
    </IndiceFilterBar>
  </fieldset>;
}
