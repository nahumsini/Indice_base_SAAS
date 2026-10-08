import { cloneElement, isValidElement, useId, useState, type ReactNode, type ReactElement, type ComponentProps } from 'react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../components/ui/utils';
import { IndiceModalFrame, type IndiceModalType } from '../../../components/indice-modal/IndiceModalFrame';
import { getIndiceFilterControlClassName } from '../../../components/frontend-os/IndiceFilterBar';
import { MODULE_COLORS, type IndiceModuleTone } from '../../../styles/moduleColors';
import type { ReservationStatus } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

export const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
export const controlClass = cn(getIndiceFilterControlClassName(schedulingTone), 'rounded-[12px] [color-scheme:light] dark:[color-scheme:dark]');
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
export function EditorFrame({ title, description, copy, children, onSave, onClose, onSaved, modalType = 'standard-form', saveLabel, destructive = false, icon = schedulingEmoji.calendar }: {
  title: string; description: string; copy: SchedulingCopy; children: ReactNode;
  onSave: () => Promise<unknown>; onClose: () => void; onSaved: () => void;
  modalType?: IndiceModalType;
  saveLabel?: string; destructive?: boolean;
  icon?: ReactNode;
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const close = () => dirty ? setDiscard(true) : onClose();
  return <IndiceModalFrame open onOpenChange={open => { if (!open) close(); }} busy={busy} tone={schedulingTone} closeLabel={copy.close}
    modalType={discard ? 'confirmation' : modalType} title={discard ? copy.discard : title}
    description={description} icon={<span className="text-xl leading-none">{icon}</span>} footer={discard ? <>
      <ActionButton onClick={() => setDiscard(false)}>{copy.keepEditing}</ActionButton><ActionButton onClick={onClose}>{copy.close}</ActionButton>
    </> : <><ActionButton disabled={busy} onClick={close}>{copy.cancel}</ActionButton><ActionButton primary disabled={busy} type="submit" form={formId} data-modal-destructive={destructive||undefined} style={destructive?{'--scheduling-accent':'#DC2626','--scheduling-accent-foreground':'#FFFFFF'} as React.CSSProperties:undefined}>{busy ? copy.loading : saveLabel??copy.save}</ActionButton></>}>
    {!discard && <form id={formId} className="space-y-5" onChange={() => setDirty(true)} onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError(false);
      try { await onSave(); onSaved(); } catch { setError(true); } finally { setBusy(false); }
    }}>{error && <Feedback error>{copy.error}</Feedback>}{children}</form>}
  </IndiceModalFrame>;
}
