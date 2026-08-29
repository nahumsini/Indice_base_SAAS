import { ArrowRight, CalendarClock, RotateCcw, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { BillingPrimaryAction } from '../billingPresentation.adapter';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  primaryAction: BillingPrimaryAction;
  action: string;
  hasChanges: boolean;
  hasProducts: boolean;
  activationAvailable: boolean;
  activationHelp: string;
  onReset: () => void;
  onSave: () => void;
  onActivate: () => void;
};

export function BillingActionDock(props: Props) {
  const busy = Boolean(props.action);
  const isActivation = props.primaryAction === 'ACTIVATE';
  const isRetry = props.primaryAction === 'RETRY_SYNC';
  const hasPrimaryAction = props.primaryAction !== 'NONE';

  const primaryLabel = props.action === 'activate'
    ? props.copy.activating
    : props.action === 'save'
      ? props.copy.saving
      : isActivation
        ? props.copy.activateStripe
        : isRetry
          ? props.copy.retrySync
          : props.copy.scheduleChanges;

  return (
    <footer className="border-t border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      {isActivation && props.hasChanges ? (
        <Button
          type="button"
          variant="outline"
          onClick={props.onSave}
          disabled={!props.hasProducts || busy}
          className="mb-2 h-10 w-full rounded-xl bg-white dark:bg-slate-900"
        >
          <Save className="h-4 w-4" /> {props.copy.saveDraft}
        </Button>
      ) : null}

      <div className={`grid gap-2 ${hasPrimaryAction ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        <Button
          type="button"
          variant="outline"
          aria-label={props.copy.reset}
          title={props.copy.reset}
          onClick={props.onReset}
          disabled={!props.hasChanges || busy}
          className="h-11 rounded-xl bg-white px-3 dark:bg-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          <span className={hasPrimaryAction ? 'sr-only' : ''}>{props.copy.reset}</span>
        </Button>

        {hasPrimaryAction ? (
          <Button
            type="button"
            onClick={isActivation ? props.onActivate : props.onSave}
            disabled={!props.hasProducts || busy || (isActivation && !props.activationAvailable)}
            title={isActivation && !props.activationAvailable ? props.activationHelp : undefined}
            className="h-11 min-w-0 justify-between rounded-xl bg-[#177D66] px-4 font-medium hover:bg-[#126653]"
          >
            <span className="truncate">{primaryLabel}</span>
            {isActivation ? <ArrowRight className="h-4 w-4 shrink-0" /> : <CalendarClock className="h-4 w-4 shrink-0" />}
          </Button>
        ) : (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            {props.copy.noPendingChanges}
          </p>
        )}
      </div>
    </footer>
  );
}
