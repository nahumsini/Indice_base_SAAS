import {
  Check,
  ChevronRight,
  CirclePlus,
  KeyRound,
  LockKeyhole,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { IntegrationsTranslations } from '../translations';

type ChatGptSetupVisualsProps = {
  copy: IntegrationsTranslations;
  endpoint: string;
  step: number;
};

function PreviewFrame({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="overflow-hidden rounded-xl border border-slate-700 bg-[#202020] p-3 text-white shadow-sm"
    >
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

function ToggleOn() {
  return (
    <span className="flex h-5 w-9 shrink-0 items-center justify-end rounded-full bg-[#2F7CF6] p-0.5">
      <span className="h-4 w-4 rounded-full bg-white shadow" />
    </span>
  );
}

function DeveloperModeVisual({ copy }: Pick<ChatGptSetupVisualsProps, 'copy'>) {
  const ui = copy.guide.chatGptUi;
  return (
    <div className="grid gap-2 sm:grid-cols-[0.78fr_1.22fr]">
      <PreviewFrame ariaLabel={copy.guide.visualLabels.settings}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-[11px] font-semibold">
          <Settings className="h-3.5 w-3.5" />
          {ui.settings}
        </div>
        <div className="mt-2 rounded-lg bg-white/10 px-2.5 py-2 text-[11px] ring-1 ring-inset ring-white/15">
          <div className="flex items-center justify-between">
            <span>{ui.apps}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-2 text-[11px]">
          <span>{ui.developerMode}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </PreviewFrame>

      <PreviewFrame ariaLabel={copy.guide.visualLabels.developerMode}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-[11px] font-semibold">
          <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />
          {ui.developerMode}
        </div>
        <div className="mt-2 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                {ui.developerMode}
                <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[8px] text-orange-300">{ui.developerModeRisk}</span>
              </div>
              <p className="mt-0.5 text-[9px] text-slate-400">{ui.developerModeDescription}</p>
            </div>
            <ToggleOn />
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold">{ui.developerModeCsp}</div>
              <p className="mt-0.5 text-[9px] text-slate-400">{ui.developerModeCspDescription}</p>
            </div>
            <ToggleOn />
          </div>
        </div>
      </PreviewFrame>
    </div>
  );
}

function AppsVisual({ copy }: Pick<ChatGptSetupVisualsProps, 'copy'>) {
  const ui = copy.guide.chatGptUi;
  return (
    <PreviewFrame ariaLabel={copy.guide.visualLabels.apps}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">{ui.apps}</p>
          <p className="mt-0.5 text-[9px] text-slate-400">ChatGPT</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-[9px] text-slate-300">
            <Search className="h-3 w-3" />
            {ui.searchApps}
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/20">
            <CirclePlus className="h-4 w-4" />
          </span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((item) => (
          <span key={item} className="h-9 rounded-lg bg-white/[0.06] ring-1 ring-inset ring-white/10" />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-400/35 bg-blue-500/10 p-2 text-[10px] text-blue-200">
        <CirclePlus className="h-3.5 w-3.5" />
        {ui.newApp}
      </div>
    </PreviewFrame>
  );
}

function FormVisual({ copy, endpoint }: Pick<ChatGptSetupVisualsProps, 'copy' | 'endpoint'>) {
  const ui = copy.guide.chatGptUi;
  const fieldClass = 'mt-1 rounded-md border border-white/15 bg-black/15 px-2 py-1.5 text-[9px] text-white';
  return (
    <PreviewFrame ariaLabel={copy.guide.visualLabels.form}>
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-semibold">
        <CirclePlus className="h-3.5 w-3.5" />
        {ui.newApp}
      </div>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <div className="text-[9px] text-slate-400">
          {ui.nameLabel}
          <div className={fieldClass}>{ui.nameValue}</div>
        </div>
        <div className="text-[9px] text-slate-400">
          {ui.authenticationLabel}
          <div className={fieldClass}>{ui.authenticationValue}</div>
        </div>
        <div className="text-[9px] text-slate-400 sm:col-span-2">
          {ui.descriptionLabel}
          <div className={fieldClass}>{ui.descriptionValue}</div>
        </div>
        <div className="text-[9px] text-slate-400 sm:col-span-2">
          <span className="flex items-center justify-between gap-2">
            <span>{ui.connectionLabel}</span>
            <span>{ui.serverUrl}</span>
          </span>
          <div className={`${fieldClass} break-all font-mono text-blue-200`}>{endpoint}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-orange-500/10 p-2 text-[9px] text-orange-200 ring-1 ring-inset ring-orange-400/20">
        <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" />{ui.acknowledgement}</span>
        <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-950">{ui.create}</span>
      </div>
    </PreviewFrame>
  );
}

function AuthorizationVisual({ copy }: Pick<ChatGptSetupVisualsProps, 'copy'>) {
  const ui = copy.guide.chatGptUi;
  return (
    <PreviewFrame ariaLabel={copy.guide.visualLabels.authorization}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-lg bg-white/[0.06] p-3 ring-1 ring-inset ring-white/10">
          <Sparkles className="h-5 w-5 text-blue-300" />
          <p className="mt-2 text-[10px] font-semibold">ChatGPT</p>
          <p className="mt-0.5 text-[9px] text-slate-400">{ui.create}</p>
        </div>
        <ChevronRight className="hidden h-4 w-4 text-slate-500 sm:block" />
        <div className="rounded-lg bg-emerald-500/10 p-3 ring-1 ring-inset ring-emerald-400/25">
          <LockKeyhole className="h-5 w-5 text-emerald-300" />
          <p className="mt-2 text-[10px] font-semibold">{ui.authorizationTitle}</p>
          <p className="mt-0.5 text-[9px] text-slate-300">{ui.authorizationDescription}</p>
          <span className="mt-2 inline-flex rounded-full bg-emerald-400 px-2.5 py-1 text-[9px] font-semibold text-emerald-950">{ui.login}</span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-semibold text-emerald-300">
        <Check className="h-3.5 w-3.5" />
        {ui.ready}
      </div>
    </PreviewFrame>
  );
}

export function ChatGptSetupVisual({ copy, endpoint, step }: ChatGptSetupVisualsProps) {
  if (step === 0) return <DeveloperModeVisual copy={copy} />;
  if (step === 1) return <AppsVisual copy={copy} />;
  if (step === 2) return <FormVisual copy={copy} endpoint={endpoint} />;
  return <AuthorizationVisual copy={copy} />;
}
