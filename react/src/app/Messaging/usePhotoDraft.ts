import { useCallback, useEffect, useRef, useState } from 'react';
import type { messagingApi } from './api';
import type { PhotoUpload } from './types';

export type DraftPhoto = { key: string; file: File; preview: string; upload?: PhotoUpload; uploaded?: boolean };
export function validPhotos(files: File[], existing: number) {
  return files.length + existing <= 5 && files.every(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size > 0 && file.size <= 8 * 1024 * 1024);
}
export function usePhotoDraft() {
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const current = useRef(photos);
  current.current = photos;
  const clear = useCallback(() => {
    current.current.forEach(photo => URL.revokeObjectURL(photo.preview));
    current.current = [];
    setPhotos([]);
  }, []);
  useEffect(() => () => current.current.forEach(photo => URL.revokeObjectURL(photo.preview)), []);
  const add = (files: File[]) => {
    if (!validPhotos(files, current.current.length)) return false;
    const next = [...current.current, ...files.map(file => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))];
    current.current = next; setPhotos(next); return true;
  };
  const remove = (key: string) => {
    const photo = current.current.find(item => item.key === key);
    if (photo) URL.revokeObjectURL(photo.preview);
    const next = current.current.filter(item => item.key !== key); current.current = next; setPhotos(next);
  };
  const upload = async (api: ReturnType<typeof messagingApi>, id: number) => {
    const ids: string[] = [];
    for (const photo of current.current) {
      // Keep upload identity and completed PUTs when a response is lost; retry the same message.
      if (!photo.upload) photo.upload = await api.presignPhoto(id, photo.file, photo.key);
      if (!photo.uploaded) {
        const result = await fetch(photo.upload.uploadUrl, { method: 'PUT', body: photo.file, headers: photo.upload.uploadHeaders, credentials: 'omit' });
        if (!result.ok) throw new Error('photo_upload_failed');
        photo.uploaded = true;
      }
      ids.push(photo.upload.id);
    }
    return ids.sort();
  };
  return { photos, add, remove, clear, upload };
}
