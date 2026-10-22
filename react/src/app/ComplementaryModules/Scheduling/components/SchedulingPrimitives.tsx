import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactNode, type ReactElement, type ComponentProps } from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import { IndiceModalFrame, type IndiceModalType } from '../../../components/indice-modal/IndiceModalFrame';
import { IndiceModalValidation } from '../../../components/indice-modal/IndiceModalValidation';
import { getIndiceFilterControlClassName } from '../../../components/frontend-os/IndiceFilterBar';
import { MODULE_COLORS, type IndiceModuleTone } from '../../../styles/moduleColors';
import type { ReservationStatus } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getAuthorizationRevision } from '../../../api/authSessionStore';
import { ApiClientError } from '../../../lib/apiClient';
import { useLanguage } from '../../../shared/context';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { getSchedulingSetupCopy } from '../translations/schedulingSetupCopy';
import { SchedulingValidationError } from '../utils/setupValidation';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
export const controlClass = cn(getIndiceFilterControlClassName(schedulingTone), 'rounded-[12px] [color-scheme:light] dark:[color-scheme:dark] focus-within:border-[#FF6B5E] focus-within:ring-2 focus-within:ring-[#FF6B5E]/20');
export function ActionButton({ primary = false, className = '', ...props }: ComponentProps<typeof Button> & { primary?: boolean }) {
  return <Button type="button" variant={primary ? 'default' : 'outline'} className={`min-h-11 rounded-xl px-4 font-medium focus-visible:border-[var(--scheduling-accent,#FF6B5E)] focus-visible:ring-[var(--scheduling-accent,#FF6B5E)]/25 ${primary ? 'bg-[var(--scheduling-accent,#FF6B5E)] text-[var(--scheduling-accent-foreground,#222831)] hover:bg-[var(--scheduling-accent,#FF6B5E)] hover:brightness-95' : 'border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'} ${className}`} {...props} />;
}
export function Field({ label, children }: { label: string; children: ReactNode | ((id: string) => ReactNode) }) {
  const id = useId();
  const control = typeof children === 'function' ? children(id) : isValidElement(children) && ['input','select','textarea'].includes(String(children.type))
    ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children;
  return <div className="min-w-0 space-y-2"><label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>{control}</div>;
}
export function Feedback({ children, error = false, tone = schedulingTone }: { children: ReactNode; error?: boolean; tone?: IndiceModuleTone }) {
  const theme = MODULE_COLORS[tone];
  return <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm leading-6 ${error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200' : `${theme.border} ${theme.darkBorder} ${theme.lightBg} ${theme.darkBg} ${theme.text} ${theme.darkText}`}`}>{children}</div>;
}
const statusClass: Record<ReservationStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  NO_SHOW: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  PAUSED: 'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
};
export function StatusBadge({ status, copy }: { status: ReservationStatus; copy: SchedulingCopy }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusClass[status]}`}>{copy[status]}</span>;
}
/** One modal frame changes to a discard confirmation; it never opens a nested modal. */
export function EditorFrame({ title, description, copy, children, onSave, onClose, onSaved, modalType = 'standard-form', saveLabel, destructive = false, icon = schedulingEmoji.calendar, hasChanges = false, footerLayout = 'actions', footerSummary, discardDescription, discardLabel, navigation, validate, trackChanges = true }: {
  title: string; description: string; copy: SchedulingCopy; children: ReactNode | ((actions: { requestExit: (action: () => void) => void }) => ReactNode);
  onSave: () => Promise<unknown>; onClose: () => void; onSaved: () => void;
  modalType?: IndiceModalType;
  saveLabel?: string; destructive?: boolean;
  icon?: ReactNode;
  hasChanges?: boolean;
  footerLayout?: 'actions' | 'split';
  footerSummary?: ReactNode;
  discardDescription?: string;
  discardLabel?: string;
  navigation?: { stepLabel: string; backLabel: string; continueLabel: string; progress: ReactNode; onBack?: () => void; onContinue?: () => void; disabled?: boolean };
  validate?: () => string | undefined;
  trackChanges?: boolean;
}) {
  const formId = useId(), actorRevision=useRef(getAuthorizationRevision());
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { if (navigation) body.current?.scrollTo({ top: 0 }); }, [navigation?.stepLabel]);
  const { currentLanguage } = useLanguage(), op = getSchedulingOperationsCopy(currentLanguage.code);
  const setup = getSchedulingSetupCopy(currentLanguage.code);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  const exitAction = useRef<(() => void) | null>(null);
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const keepEditing = () => { exitAction.current = null; setDiscard(false); };
  const close = (action = onClose) => { if (!pending.current) { if (dirty || hasChanges) { exitAction.current = action; setDiscard(true); } else action(); } };
  const cancel = <ActionButton disabled={busy} className={footerLayout === 'split' ? '!border-[#222831]/25 !bg-transparent !text-[#222831] hover:!bg-white/20 dark:!border-white/40 dark:!text-white' : undefined} onClick={() => close()}>{copy.cancel}</ActionButton>;
  return <IndiceModalFrame open onOpenChange={open => { if (!open) { if (discard) keepEditing(); else close(); } }} busy={busy} tone={schedulingTone} closeLabel={copy.close}
    bodyRef={body}
    modalType={discard ? 'confirmation' : modalType} title={discard ? copy.discard : title} eyebrow={!discard ? navigation?.stepLabel : undefined}
    contentClassName="group/agenda-editor data-[dialog-compact-viewport=true]:!overflow-hidden"
    bodyClassName="group-data-[dialog-compact-viewport=true]/agenda-editor:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/agenda-editor:!overflow-y-auto"
    description={discard ? discardDescription ?? description : <span className="group-data-[dialog-compact-viewport=true]/agenda-editor:sr-only">{description}</span>} icon={<span className="text-xl leading-none">{icon}</span>}
    footerLeading={!discard && footerLayout === 'split' ? cancel : undefined} footerSummary={!discard ? footerSummary : undefined} footer={discard ? <>
      <ActionButton onClick={keepEditing}>{copy.keepEditing}</ActionButton><ActionButton data-modal-destructive={Boolean(discardLabel)||undefined} onClick={() => (exitAction.current ?? onClose)()}>{discardLabel ?? copy.close}</ActionButton>
    </> : <>{footerLayout === 'actions' ? cancel : null}{navigation?.onBack && <ActionButton disabled={busy} onClick={() => { setError(''); navigation.onBack?.(); }}>{navigation.backLabel}</ActionButton>}<ActionButton primary disabled={busy || navigation?.disabled} type="submit" form={formId} data-modal-destructive={destructive||undefined} style={destructive?{'--scheduling-accent':'#DC2626','--scheduling-accent-foreground':'#FFFFFF'} as React.CSSProperties:undefined}>{busy ? copy.loading : navigation?.onContinue ? navigation.continueLabel : saveLabel??copy.save}</ActionButton></>}>
    {!discard && <form id={formId} className="space-y-5" onChange={() => { if (trackChanges) setDirty(true); }} onSubmit={async event => {
      event.preventDefault(); if (pending.current) return; if(actorRevision.current!==getAuthorizationRevision()){setError(op.conflict);return;} const validation = validate?.(); if (validation) { setError(validation); return; } pending.current=true; setBusy(true); setError('');
      try { if (navigation?.onContinue) navigation.onContinue(); else { await onSave(); setDirty(false); onSaved(); } } catch (error) { const code=error instanceof SchedulingValidationError?error.code:error instanceof ApiClientError?(error.payload as {code?:string}|undefined)?.code:undefined;
        setError(code==='scheduling_hours_invalid'?setup.hoursInvalid:code==='scheduling_catalog_service_unavailable'?setup.unavailableService:code==='scheduling_employee_unavailable'?setup.unavailableEmployee:code==='scheduling_setup_required'?setup.setupRequired:error instanceof ApiClientError&&error.status===409?op.conflict:copy.error); } finally { pending.current=false; setBusy(false); }
    }}>{navigation?.progress}{error && (navigation ? <IndiceModalValidation messages={[error]} /> : <Feedback error>{error}</Feedback>)}<fieldset disabled={busy} className="min-w-0 space-y-5">{typeof children === 'function' ? children({ requestExit: close }) : children}</fieldset></form>}
  </IndiceModalFrame>;
}
