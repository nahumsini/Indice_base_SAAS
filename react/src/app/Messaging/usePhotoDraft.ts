import { useCallback, useEffect, useRef, useState } from 'react';
import type { messagingApi } from './api';
import type { PhotoUpload } from './types';
import { AttachmentError, attachmentIssue, attachmentType } from './attachmentRules';

export type DraftPhoto = { key: string; file: File; preview: string; upload?: PhotoUpload; uploaded?: boolean; state: 'queued' | 'uploading' | 'ready' | 'failed' };
export function validPhotos(files: File[], existing: number) { return !attachmentIssue(files, existing); }
export function usePhotoDraft() {
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [error, setError] = useState<AttachmentError | null>(null);
  const current = useRef(photos);
  current.current = photos;
  const alive = useRef(true);
  const update = () => { if (alive.current) setPhotos([...current.current]); };
  const clear = useCallback(() => {
    current.current.forEach(photo => { if (photo.preview) URL.revokeObjectURL(photo.preview); });
    current.current = []; setPhotos([]); setError(null);
  }, []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; current.current.forEach(photo => { if (photo.preview) URL.revokeObjectURL(photo.preview); }); }; }, []);
  const add = (files: File[]) => {
    const issue = attachmentIssue(files, current.current.length);
    setError(issue);
    if (issue) return false;
    const next = [...current.current, ...files.map(file => ({ key: crypto.randomUUID(), file,
      preview: attachmentType(file).startsWith('image/') ? URL.createObjectURL(file) : '', state: 'queued' as const }))];
    current.current = next; update(); return true;
  };
  const remove = (key: string) => {
    const photo = current.current.find(item => item.key === key);
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
    current.current = current.current.filter(item => item.key !== key); setError(null); update();
  };
  const expired = () => current.current.some(photo => photo.upload && Date.parse(photo.upload.expiresAt) <= Date.now() + 10000);
  const upload = async (api: ReturnType<typeof messagingApi>, id: number, renew = false) => {
    const ids: string[] = [];
    for (const photo of current.current) {
      if (!alive.current) throw new AttachmentError('upload', photo.file.name);
      try {
        photo.state = 'uploading'; update();
        const stale = photo.upload && Date.parse(photo.upload.expiresAt) <= Date.now() + 10000;
        // Completed PUTs first retry the original send. A lost acknowledgement must keep IDs/key.
        if (!photo.upload || (stale && (!photo.uploaded || renew))) {
          photo.upload = await api.presignPhoto(id, photo.file, photo.key); photo.uploaded = false;
        }
        if (!alive.current) throw new AttachmentError('upload', photo.file.name);
        if (!photo.uploaded) {
          let result: Response;
          try { result = await fetch(photo.upload.uploadUrl, { method: 'PUT', body: photo.file, headers: photo.upload.uploadHeaders, credentials: 'omit' }); }
          catch { throw new AttachmentError('upload', photo.file.name); }
          if (!result.ok) throw new AttachmentError('upload', photo.file.name);
          photo.uploaded = true;
        }
        photo.state = 'ready'; update(); ids.push(photo.upload.id);
      } catch (failure) {
        photo.state = 'failed'; update();
        const status = failure && typeof failure === 'object' && 'status' in failure ? failure.status : null;
        if (status === 400) throw new AttachmentError('verification', photo.file.name);
        if ([413, 502, 503, 507].includes(Number(status))) throw new AttachmentError('storage', photo.file.name);
        throw failure;
      }
    }
    return ids.sort();
  };
  return { photos, error, add, remove, clear, upload, expired };
}
