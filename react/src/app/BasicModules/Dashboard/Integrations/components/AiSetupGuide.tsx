import { useState } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Info,
  MessageCircleQuestion,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { INDICE_MCP_SERVER_URL } from '../constants';
import type { IntegrationsTranslations } from '../translations';
import { copyText } from '../utils';
import { ChatGptSetupVisual } from './ChatGptSetupVisuals';

type AiSetupGuideProps = {
  copy: IntegrationsTranslations;
};

const stepIcons = [Bot, ExternalLink, Copy, MessageCircleQuestion];

export function AiSetupGuide({ copy }: AiSetupGuideProps) {
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const copyEndpoint = async () => {
    try {
      await copyText(INDICE_MCP_SERVER_URL);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm dark:border-blue-900/60 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-5 dark:border-slate-700 dark:from-blue-950/40 dark:via-slate-900 dark:to-cyan-950/30">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-[#2563EB] dark:text-blue-300">{copy.navigation.guide}</p>
            <h3 className="mt-2 text-2xl font-medium text-slate-950 dark:text-white">{copy.guide.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.guide.description}</p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.guide.providerLabel}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.guide.providerDescription}</p>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="mt-4 flex w-full items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:border-blue-900/60 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
                <Bot className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-medium text-slate-950 dark:text-white">{copy.guide.providerLabel}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#2563EB] ring-1 ring-inset ring-blue-200 dark:bg-slate-900 dark:ring-blue-800">{copy.guide.providerBadge}</span>
                </span>
                <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                  {expanded ? copy.guide.closeAction : copy.guide.providerAction}
                </span>
              </span>
            </span>
            {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-[#2563EB]" /> : <ChevronDown className="h-5 w-5 shrink-0 text-[#2563EB]" />}
          </button>
        </div>
      </section>

      {expanded ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h3 className="text-xl font-medium text-slate-950 dark:text-white">{copy.guide.setupTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.guide.setupDescription}</p>
            </div>
            <div className="w-full rounded-xl border border-blue-200 bg-blue-50 p-3 lg:max-w-xl dark:border-blue-900/60 dark:bg-blue-950/30">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">{copy.guide.endpointLabel}</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-lg bg-white px-3 py-2.5 text-xs text-slate-800 ring-1 ring-inset ring-blue-100 dark:bg-slate-950 dark:text-slate-100 dark:ring-blue-900">{INDICE_MCP_SERVER_URL}</code>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyEndpoint()}
                  className="h-10 shrink-0 rounded-lg border-blue-300 bg-white text-[#2563EB] hover:bg-blue-100 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300"
                >
                  {copyStatus === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copyStatus === 'copied' ? copy.guide.copiedEndpoint : copy.guide.copyEndpoint}
                </Button>
              </div>
              {copyStatus === 'error' ? <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{copy.guide.copyEndpointError}</p> : null}
            </div>
          </div>

          <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div>
              <p className="text-sm font-medium text-amber-950 dark:text-amber-100">{copy.guide.availabilityTitle}</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/80 dark:text-amber-200/80">{copy.guide.availabilityDescription}</p>
            </div>
          </div>

          <ol className="mt-5 space-y-4">
            {copy.guide.steps.map((step, index) => {
              const Icon = stepIcons[index] ?? Check;
              return (
                <li key={step.label} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)] dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex items-start gap-3">
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10 text-[#2563EB] dark:text-[#93C5FD]">
                      <Icon className="h-5 w-5" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-xs font-medium text-white">{index + 1}</span>
                    </span>
                    <div>
                      <span className="block text-base font-medium text-slate-950 dark:text-white">{step.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</span>
                    </div>
                  </div>
                  <ChatGptSetupVisual copy={copy} endpoint={INDICE_MCP_SERVER_URL} step={index} />
                </li>
              );
            })}
          </ol>

          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{copy.guide.exampleLabel}</p>
            <blockquote className="mt-2 text-base font-medium leading-7 text-slate-950 dark:text-white">“{copy.guide.examplePrompt}”</blockquote>
          </div>
        </section>
      ) : null}
    </div>
  );
}
