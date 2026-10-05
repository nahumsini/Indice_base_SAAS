import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { messagingApi } from './api';
import { photoCopy } from './photoCopy';
import type { MessagingPortal, PhotoAttachment } from './types';
import type { DraftPhoto } from './usePhotoDraft';

const control = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 px-3 text-sm focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-slate-600';
export function PhotoPicker({ photos, disabled, locale, onAdd, onRemove }: {
  photos: DraftPhoto[]; disabled: boolean; locale: string; onAdd: (files: File[]) => boolean; onRemove: (key: string) => void;
}) {
  const c = photoCopy(locale);
  const input = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);
  return <div className="space-y-2">
    <div className="flex items-center gap-2"><button type="button" className={control} aria-label={c.attach} title={c.help} disabled={disabled || photos.length >= 5} onClick={() => input.current?.click()}><ImagePlus size={18} /></button>
      <p className="text-xs text-slate-500 dark:text-slate-400">{c.help}</p></div>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label={c.attach} className="sr-only" disabled={disabled}
      onChange={event => { setInvalid(!onAdd(Array.from(event.target.files ?? []))); event.target.value = ''; }} />
    {invalid && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{c.invalid}</p>}
    {photos.length > 0 && <ul className="flex max-h-28 gap-2 overflow-x-auto">{photos.map(photo => <li key={photo.key} className="relative shrink-0">
      <img src={photo.preview} alt={photo.file.name} className="h-24 w-24 rounded-xl object-cover" />
      <button type="button" aria-label={`${c.remove}: ${photo.file.name}`} disabled={disabled} onClick={() => { onRemove(photo.key); setInvalid(false); }} className={`${control} absolute right-0 top-0 bg-white/95 text-slate-900`}><X size={16} /></button>
    </li>)}</ul>}
  </div>;
}

export function MessagePhoto({ photo, portal, conversationId, locale, onLoad }: {
  photo: PhotoAttachment; portal: MessagingPortal; conversationId: number; locale: string; onLoad?: () => void;
}) {
  const c = photoCopy(locale);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl(null); setFailed(false);
    messagingApi(portal).photo(conversationId, photo.id).then(result => { if (active) setUrl(result.url); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [portal, conversationId, photo.id, revision]);
  if (failed) return <div className="my-2 text-sm"><p>{c.failed}</p><button type="button" className={control} onClick={() => setRevision(value => value + 1)}>{c.retry}</button></div>;
  if (!url) return <p role="status" className="my-2 text-xs">{c.preparing}</p>;
  return <button type="button" className="my-2 block max-w-full overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500"
    aria-label={`${expanded ? c.reduce : c.enlarge}: ${photo.fileName}`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
    <img src={url} alt={photo.fileName} referrerPolicy="no-referrer" onError={() => setFailed(true)} onLoad={onLoad}
      className={expanded ? 'max-h-[65dvh] max-w-full object-contain' : 'max-h-60 w-64 max-w-full object-contain'} />
  </button>;
}
