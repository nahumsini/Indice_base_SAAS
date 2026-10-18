import { Mail, MessageCircle } from 'lucide-react';
import { SalesTitleBar } from './components/SalesTitleBar';
import { useSalesTranslations } from './hooks/useSalesTranslations';

function SalesCommunicationWorkspace({ channel }: { channel: 'mailing' | 'whatsapping' }) {
  const copy = useSalesTranslations();
  const Icon = channel === 'mailing' ? Mail : MessageCircle;

  return (
    <div className="space-y-6">
      <SalesTitleBar
        icon={<Icon className="h-5 w-5" aria-hidden="true" />}
        title={copy.tabs[channel]}
        subtitle={channel === 'mailing'
          ? copy.communicationWorkspace.mailingSubtitle
          : copy.communicationWorkspace.whatsappingSubtitle}
      />
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <Icon className="mx-auto mb-4 h-8 w-8 text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden="true" />
        <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          {copy.communicationWorkspace.pendingTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
          {copy.communicationWorkspace.pendingDescription}
        </p>
      </section>
    </div>
  );
}

export function Whatsapping() {
  return <SalesCommunicationWorkspace channel="whatsapping" />;
}
