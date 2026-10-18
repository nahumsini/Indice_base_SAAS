import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useEmailCopy } from './translations';

type Draft = { address: string; subject: string; body: string };
export function PreviewComposer({ initial, onClose, onSave }: { initial: Draft; onClose: () => void; onSave: (draft: Draft) => void }) {
  const { copy } = useEmailCopy();const [value, setValue] = useState(initial);const [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(initial) !== JSON.stringify(value);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault();event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function close() { dirty ? setDiscard(true) : onClose(); }
  return <IndiceModalFrame open tone="blue" modalType={discard ? 'confirmation' : 'standard-form'} icon={<Mail className="h-5 w-5" />}
    title={discard ? copy.discardTitle : copy.composeTitle} description={discard ? copy.discardDescription : copy.composeDescription} closeLabel={copy.cancel}
    onOpenChange={open => { if (!open) discard ? setDiscard(false) : close(); }}
    footerLeading={<Button className="h-11 rounded-xl !border-white !bg-white px-5 !text-slate-600 hover:!bg-white/90" variant="outline" onClick={() => discard ? setDiscard(false) : close()}>{discard ? copy.keepEditing : copy.cancel}</Button>}
    footer={discard ? <Button data-modal-destructive onClick={onClose}>{copy.discard}</Button> : <Button onClick={() => onSave(value)}>{copy.saveDraft}</Button>}>
    {!discard && <div className="space-y-4">
      <label className="block space-y-2 text-sm"><span>{copy.to}</span><Input className="h-11" type="email" value={value.address} maxLength={240} onChange={e => setValue(v => ({ ...v, address: e.target.value }))} /></label>
      <label className="block space-y-2 text-sm"><span>{copy.subject}</span><Input className="h-11" value={value.subject} maxLength={240} onChange={e => setValue(v => ({ ...v, subject: e.target.value }))} /></label>
      <label className="block space-y-2 text-sm"><span>{copy.message}</span><Textarea className="min-h-56" value={value.body} maxLength={20000} onChange={e => setValue(v => ({ ...v, body: e.target.value }))} /></label>
    </div>}
  </IndiceModalFrame>;
}
