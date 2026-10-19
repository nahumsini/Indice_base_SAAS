import { useEffect, useRef, useState } from 'react';
import { Check, Download, FileText, ImagePlus, LoaderCircle, Plus, X } from 'lucide-react';
import { useMessagingApi } from './MessagingTransportContext';
import { photoCopy } from './photoCopy';
import { attachmentCopy, attachmentErrorText } from './attachmentCopy';
import { attachmentAccept, formatBytes } from './attachmentRules';
import type { MessagingPortal, PhotoAttachment } from './types';
import type { DraftPhoto } from './usePhotoDraft';
import { button } from './MessagingPrimitives';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

export function PhotoPicker({ photos, disabled, locale, onAdd, onRemove, error }: {
  photos: DraftPhoto[]; disabled: boolean; locale: string; onAdd: (files: File[]) => boolean; onRemove: (key: string) => void; error?: unknown;
}) {
  const c = attachmentCopy(locale);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const change = (event: React.ChangeEvent<HTMLInputElement>) => { onAdd(Array.from(event.target.files ?? [])); event.target.value = ''; };
  const errorText = attachmentErrorText(error, locale);
  return <>
    {photos.length > 0 && <ul aria-label={c.files} className="chat-attachment-drafts">{photos.map(photo => <li key={photo.key} className="chat-attachment-draft">
      {photo.preview ? <img src={photo.preview} alt={photo.file.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-10 shrink-0 items-center justify-center text-blue-600 dark:text-blue-300"><FileText size={28}/></span>}
      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium" title={photo.file.name}>{photo.file.name}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{formatBytes(photo.file.size)}</span><span role="status" className={`flex items-center gap-1 text-xs ${photo.state === 'failed' ? 'text-red-600 dark:text-red-300' : 'text-blue-700 dark:text-blue-200'}`}>
        {photo.state === 'uploading' ? <LoaderCircle size={12} className="animate-spin"/> : photo.state === 'ready' ? <Check size={12}/> : null}{c[photo.state]}</span></span>
      <button type="button" aria-label={`${c.remove}: ${photo.file.name}`} disabled={disabled} onClick={() => onRemove(photo.key)} className={`${button} shrink-0 border-transparent px-2`}><X size={16}/></button>
    </li>)}</ul>}
    {errorText && <p role="alert" className="col-span-full text-sm text-red-600 dark:text-red-300">{errorText}</p>}
    <div className="chat-attach-control"><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" className={`${button} border-transparent bg-slate-100 px-3 dark:bg-slate-800`} aria-label={c.attach} disabled={disabled || photos.length >= 5}><Plus size={20}/></button></PopoverTrigger>
      <PopoverContent side="top" align="start" className="z-[100] w-72 space-y-2 rounded-2xl p-3">
        <button type="button" className={`${button} w-full justify-start border-transparent`} onClick={() => { photoInput.current?.click(); setOpen(false); }}><ImagePlus size={19}/>{c.photos}</button>
        <button type="button" className={`${button} w-full justify-start border-transparent`} onClick={() => { fileInput.current?.click(); setOpen(false); }}><FileText size={19}/>{c.files}</button><p className="px-2 text-xs leading-relaxed text-slate-500 dark:text-slate-300">{c.help}</p>
      </PopoverContent></Popover>
      <input ref={photoInput} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label={c.photos} className="sr-only" disabled={disabled} onChange={change}/>
      <input ref={fileInput} type="file" multiple accept={attachmentAccept} aria-label={c.files} className="sr-only" disabled={disabled} onChange={change}/>
    </div>
  </>;
}

export function MessagePhoto({ photo, portal, conversationId, locale, onLoad }: {
  photo: PhotoAttachment; portal: MessagingPortal; conversationId: number; locale: string; onLoad?: () => void;
}) {
  const c = photoCopy(locale);
  const api = useMessagingApi(portal);
  const image = photo.contentType.startsWith('image/');
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl(null); setFailed(false);
    if (image) api.photo(conversationId, photo.id).then(result => { if (active) setUrl(result.url); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [api, conversationId, photo.id, revision, image]);
  if (!image) return <MessageDocument key={`${portal}:${conversationId}:${photo.id}`} photo={photo} portal={portal} conversationId={conversationId} locale={locale}/>;
  if (failed) return <div className="my-2 text-sm"><p>{c.failed}</p><button type="button" className={button} onClick={() => setRevision(value => value + 1)}>{c.retry}</button></div>;
  if (!url) return <p role="status" className="my-2 text-xs">{c.preparing}</p>;
  return <button type="button" className="relative my-2 block max-w-full overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
    aria-label={`${expanded ? c.reduce : c.enlarge}: ${photo.fileName}`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
    <img src={url} alt={photo.fileName} referrerPolicy="no-referrer" onError={() => setFailed(true)} onLoad={onLoad}
      className={expanded ? 'max-h-[65dvh] max-w-full object-contain' : 'max-h-60 w-64 max-w-full object-contain'} />
    {expanded && <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/80 px-3 py-2 text-xs text-white">{c.reduce}</span>}
  </button>;
}


/** Reserve the browser tab during the tap, before requesting its private download link. */
function MessageDocument({ photo, portal, conversationId, locale }: {
  photo: PhotoAttachment; portal: MessagingPortal; conversationId: number; locale: string;
}) {
  const c = attachmentCopy(locale);
  const api = useMessagingApi(portal);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const [prepared, setPrepared] = useState<{ url: string; expires: number } | null>(null);
  const pending = useRef<Window | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const value = ++generation.current;
    return () => { if (generation.current === value) generation.current++; pending.current?.close(); pending.current = null; };
  }, []);
  useEffect(() => {
    if (!prepared) return;
    const timer = setTimeout(() => setPrepared(null), Math.max(0, prepared.expires - Date.now()));
    return () => clearTimeout(timer);
  }, [prepared]);
  const openFile = async () => {
    if (busy.current) return;
    busy.current = true; setOpening(true); setFailed(false); setPrepared(null);
    const value = generation.current;
    let popup: Window | null = null;
    try {
      popup = window.open('about:blank', '_blank');
      if (popup) {
        popup.opener = null;
        popup.document.title = c.preparingFile;
        if (popup.document.body) popup.document.body.textContent = c.preparingFile;
      }
    } catch { popup?.close(); popup = null; }
    pending.current = popup;
    try {
      const result = await api.photo(conversationId, photo.id);
      if (generation.current !== value) { popup?.close(); return; }
      const url = new URL(result.url, window.location.href);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('invalid_attachment_url');
      if (popup && !popup.closed) popup.location.replace(url.href);
      else setPrepared({ url: url.href, expires: Date.now() + 50000 });
    } catch {
      popup?.close();
      if (generation.current === value) setFailed(true);
    } finally {
      if (pending.current === popup) pending.current = null;
      busy.current = false;
      if (generation.current === value) setOpening(false);
    }
  };
  const contents = <><FileText size={28} className="shrink-0"/><span className="min-w-0 flex-1 text-left"><span className="block truncate font-medium" title={photo.fileName}>{photo.fileName}</span><span className="block text-xs opacity-75">{photo.fileName.split('.').pop()?.toUpperCase()} · {formatBytes(photo.sizeBytes)}</span></span>{opening ? <LoaderCircle size={18} className="shrink-0 animate-spin"/> : <Download size={18} className="shrink-0"/>}</>;
  return <div className="my-2">
    {prepared ? <a href={prepared.url} target="_blank" rel="noopener noreferrer" className="chat-file-card" aria-label={`${c.open}: ${photo.fileName}`} onClick={event => {
      if (prepared.expires <= Date.now()) { event.preventDefault(); void openFile(); }
    }}>{contents}</a> : <button type="button" className="chat-file-card" disabled={opening} onClick={() => void openFile()} aria-label={`${c.open}: ${photo.fileName}`}>{contents}</button>}
    {opening && <p role="status" className="mt-1 text-xs">{c.preparingFile}</p>}
    {prepared && <p role="status" className="mt-1 text-xs">{c.openReady}</p>}
    {failed && <p role="alert" className="mt-1 text-xs">{c.downloadError}</p>}
  </div>;
}
