import { CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { IndiceAdminWorkspaceHeader } from '../../components/frontend-os';
import type { BillingSelectionResponse, BillingSubscriptionResponse } from '../../api/billing';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  selection: BillingSelectionResponse | null;
  subscription: BillingSubscriptionResponse | null;
  loading: boolean;
  leaving: boolean;
  onBack: () => void;
  onRefresh: () => void;
};

export function BillingHero({ copy, selection, subscription, loading, leaving, onBack, onRefresh }: Props) {
  const accessActive = subscription?.access_allowed ?? selection?.access_allowed ?? false;
  return (
    <IndiceAdminWorkspaceHeader
      backLabel={copy.back}
      backBusy={leaving}
      backDisabled={loading || leaving}
      onBack={onBack}
      icon={<CreditCard />}
      title={copy.title}
      subtitle={copy.description}
      actions={(
        <>
          <span className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-medium ${accessActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> {accessActive ? copy.accessActive : copy.accessAttention}
          </span>
          <Button type="button" variant="outline" onClick={onRefresh} disabled={loading} className="h-10 rounded-xl bg-white dark:bg-slate-900">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {copy.refresh}
          </Button>
        </>
      )}
    />
  );
}
