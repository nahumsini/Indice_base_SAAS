import { Bot, CheckCircle2, KeyRound, MessageCircleQuestion, PlugZap } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { IntegrationsTranslations } from '../translations';

type AiSetupGuideProps = {
  copy: IntegrationsTranslations;
  hasActiveConnection: boolean;
  onStart: () => void;
};

const stepIcons = [Bot, KeyRound, PlugZap, MessageCircleQuestion];

export function AiSetupGuide({ copy, hasActiveConnection, onStart }: AiSetupGuideProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="max-w-3xl">
          <h3 className="text-xl font-medium text-slate-950 dark:text-white">{copy.guide.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.guide.description}</p>
        </div>

        <ol className="mt-6 space-y-3">
          {copy.guide.steps.map((step, index) => {
            const Icon = stepIcons[index] ?? CheckCircle2;
            return (
              <li key={step.label} className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#93C5FD]">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-xs font-medium text-white">{index + 1}</span>
                </span>
                <span>
                  <span className="block text-base font-medium text-slate-950 dark:text-white">{step.label}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <aside className="space-y-4">
        <div className={`rounded-xl border p-5 ${hasActiveConnection ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30' : 'border-[#2563EB]/30 bg-[#2563EB]/5 dark:border-[#2563EB]/35 dark:bg-[#2563EB]/10'}`}>
          <CheckCircle2 className={`h-7 w-7 ${hasActiveConnection ? 'text-emerald-700 dark:text-emerald-300' : 'text-[#2563EB] dark:text-[#93C5FD]'}`} />
          <h3 className="mt-3 text-base font-medium text-slate-950 dark:text-white">
            {hasActiveConnection ? copy.guide.readyTitle : copy.guide.pendingTitle}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {hasActiveConnection ? copy.guide.readyDescription : copy.guide.pendingDescription}
          </p>
          {!hasActiveConnection ? (
            <Button type="button" onClick={onStart} className="mt-4 h-11 w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8]">
              {copy.guide.startAction}
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-950/30">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{copy.guide.exampleLabel}</p>
          <blockquote className="mt-2 text-base font-medium leading-7 text-slate-950 dark:text-white">“{copy.guide.examplePrompt}”</blockquote>
        </div>
      </aside>
    </div>
  );
}
