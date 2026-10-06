import { useEffect, useState, type CSSProperties } from 'react';
import { MessageSquare } from 'lucide-react';
import { IndiceModalFrame } from '../components/indice-modal';
import { messagingCopy } from './copy';
import { MessagingWorkspace, type ComposerState } from './MessagingWorkspace';

/** Operational workspace: one shared shell, independent inbox/thread scrolling. */
export function MessagingModal({ userId, locale, initialId, onClose }: {
  userId: number; locale: string; initialId: number | null; onClose: () => void;
}) {
  const copy = messagingCopy(locale);
  const [composer, setComposer] = useState<ComposerState>({ dirty: false, busy: false });
  const [confirmClose, setConfirmClose] = useState(false);
  const [viewport, setViewport] = useState<CSSProperties>();
  useEffect(() => {
    const visible = window.visualViewport;
    const resize = () => {
      // Mobile keyboards can shrink the visual viewport without changing dvh.
      setViewport(visible && window.innerWidth < 768 && visible.scale === 1
        ? { height: visible.height - 16, maxHeight: visible.height - 16, top: visible.offsetTop + visible.height / 2 }
        : undefined);
    };
    resize();
    visible?.addEventListener('resize', resize);
    visible?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    return () => { visible?.removeEventListener('resize', resize); visible?.removeEventListener('scroll', resize); window.removeEventListener('resize', resize); };
  }, []);
  const close = () => { if (!composer.busy) { if (composer.dirty) setConfirmClose(true); else onClose(); } };
  return <IndiceModalFrame open modalType="operational-workspace" tone="blue" icon={<MessageSquare size={20} />}
    title={copy.title} description={copy.subtitle} closeLabel={copy.close} busy={composer.busy}
    onOpenChange={value => { if (!value) close(); }} contentStyle={viewport}
    contentClassName="h-[92dvh] gap-0 max-md:max-w-[calc(100%-1rem)] max-md:rounded-2xl"
    bodyClassName="flex flex-col overflow-hidden p-0" footerClassName="px-4 py-2"
    footerSummary={<span className="text-xs">{composer.busy ? copy.sending : copy.subtitle}</span>}>
    {confirmClose && <div role="alert" className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 p-3 text-sm text-slate-900 dark:bg-amber-950 dark:text-white">
      <p className="flex-1">{copy.discardPrompt}</p>
      <button className="min-h-11 rounded-lg border px-3" onClick={() => setConfirmClose(false)}>{copy.keepWriting}</button>
      <button disabled={composer.busy} className="min-h-11 rounded-lg bg-blue-600 px-3 text-white disabled:opacity-50" onClick={onClose}>{copy.discard}</button>
    </div>}
    <MessagingWorkspace key={initialId ?? 'inbox'} portal="member" locale={locale} userId={userId} initialId={initialId} contained onComposerState={setComposer} />
  </IndiceModalFrame>;
}
