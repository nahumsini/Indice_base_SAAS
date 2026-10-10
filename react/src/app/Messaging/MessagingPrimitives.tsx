import { ApiClientError } from '../lib/apiClient';
import { cn } from '../components/ui/utils';
import { messagingCopy } from './copy';

export const field = 'w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
export const button = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:hover:bg-slate-800';
export const primary = cn(button, 'border-[#143675] bg-[#143675] text-white hover:bg-[#204887] dark:border-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600');
type Copy = ReturnType<typeof messagingCopy>;
export type ComposerState = { dirty: boolean; busy: boolean };

export function ErrorNotice({ error, copy, retry }: { error: unknown; copy: Copy; retry?: () => void }) {
  if (!error) return null;
  const status = error instanceof ApiClientError ? error.status : 0;
  return <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
    {[401,403,404].includes(status) ? copy.denied : status === 409 ? copy.conflict : status === 429 ? copy.limited : copy.error}
    {retry && <button type="button" className={`${button} ml-2`} onClick={retry}>{copy.retry}</button>}
  </div>;
}
