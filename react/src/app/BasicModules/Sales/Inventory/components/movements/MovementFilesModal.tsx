import { useEffect, useRef, useState } from 'react';
import { Download, Paperclip } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { IndiceModalValidation } from '../../../../../components/indice-modal';
import { useLanguage } from '../../../../../shared/context';
import { getFormFeedbackCopy } from '../../../../../components/indice-modal/formFeedbackCopy';
import { SalesModalFrame } from '../../../components/SalesModalFrame';
import { inventoryMovementFiles, movementFileError, movementFileAccept, validMovementFile, type MovementFileUploadState } from '../../services/inventoryMovementFiles';
import { getMovementFileCopy } from '../../translations/movementFileCopy';
import type { InventoryMovementAttachment, InventoryOperationalMovement } from '../../types/inventoryTypes';

export function MovementFilesModal({ movement, onClose, onFileCountChange }: { movement: InventoryOperationalMovement; onClose: () => void; onFileCountChange?: (count: number) => void }) {
  const { currentLanguage } = useLanguage();
  const copy = getMovementFileCopy(currentLanguage.code);
  const feedback = getFormFeedbackCopy(currentLanguage.code);
  const [files, setFiles] = useState<InventoryMovementAttachment[]>([]);
  const [pending, setPending] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const busyRef = useRef(false);
  const filesRef = useRef<InventoryMovementAttachment[]>([]);
  const states = useRef(new Map<File, MovementFileUploadState>());
  const refresh = async () => { setLoading(true); setError(''); try { const loaded = await inventoryMovementFiles.list(movement.id); filesRef.current = loaded; setFiles(loaded); onFileCountChange?.(loaded.length); } catch { setError(copy.loadFailed); } finally { setLoading(false); } };
  useEffect(() => {
    let active = true;
    inventoryMovementFiles.list(movement.id).then(result => { if (active) { filesRef.current = result; setFiles(result); onFileCountChange?.(result.length); } }).catch(() => { if (active) setError(copy.loadFailed); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [movement.id, copy.loadFailed]);
  const upload = async () => {
    if (busyRef.current || pending.length === 0) return;
    busyRef.current = true; setBusy(true); setError('');
    const failed: File[] = [];
    const failures: string[] = [];
    for (const file of pending) {
      const state = states.current.get(file) ?? {};
      states.current.set(file, state);
      try { const saved = await inventoryMovementFiles.upload(movement.id, file, state); filesRef.current = [...filesRef.current.filter(item => item.id !== saved.id), saved]; setFiles(filesRef.current); onFileCountChange?.(filesRef.current.length); }
      catch (error) { failed.push(file); failures.push(`${file.name}: ${movementFileError(error, copy.failed)}`); }
    }
    setPending(failed);
    if (failed.length) setError(failures.join(' · '));
    busyRef.current = false; setBusy(false);
  };
  const download = async (file: InventoryMovementAttachment) => {
    setError('');
    try {
      const url = await inventoryMovementFiles.download(movement.id, file.id);
      const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click();
    } catch { setError(copy.loadFailed); }
  };
  return <SalesModalFrame open onOpenChange={open => { if (!open && !busyRef.current) onClose(); }} title={copy.title}
    description={`${movement.movementNumber} · ${movement.productName}`} icon={<Paperclip className="h-5 w-5" />} closeLabel={copy.close}
    modalType="standard-form" busy={busy} bodyClassName="space-y-4" footer={<>
      <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{copy.close}</Button>
      <Button type="button" disabled={busy || !pending.length} onClick={() => void upload()}>{busy ? feedback.saving : copy.add}</Button>
    </>}>
    <IndiceModalValidation messages={error ? [error] : []} />
    <p className="text-sm text-slate-600 dark:text-slate-300">{copy.help}</p>
    {loading ? <p role="status">{copy.loading}</p> : !files.length ? <p className="text-sm text-slate-500">{copy.empty}</p> : null}
    <Button type="button" variant="outline" disabled={busy || loading} onClick={() => void refresh()}>{copy.retryLoad}</Button>
    {files.map(file => <div key={file.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><span className="min-w-0 flex-1 break-all text-sm">{file.name}</span><Button type="button" variant="outline" onClick={() => void download(file)} aria-label={`${copy.download}: ${file.name}`}><Download className="h-4 w-4" />{copy.download}</Button></div>)}
    {movement.status !== 'cancelled' ? <label className="block rounded-xl border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">{copy.add}<input className="mt-2 block w-full" type="file" accept={movementFileAccept} multiple disabled={busy || loading} onChange={event => {
      const next = Array.from(event.target.files ?? []);
      event.target.value = '';
      if (next.some(file => !validMovementFile(file)) || next.length + pending.length + files.length > 10) { setError(copy.invalid); return; }
      setPending(current => [...current, ...next]); setError('');
    }} /></label> : null}
    {pending.map((file, index) => <div key={`${file.name}-${index}`} className="flex min-w-0 items-center gap-2 text-sm"><span className="min-w-0 flex-1 break-all">{file.name}</span><Button type="button" variant="ghost" disabled={busy} onClick={() => setPending(current => current.filter((_, at) => at !== index))}>{copy.remove}</Button></div>)}
  </SalesModalFrame>;
}
