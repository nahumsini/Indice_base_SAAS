import { ExternalLink, ImageIcon, X } from 'lucide-react';
import type { HrAssetPhoto } from '../../../api/HumanResources/assets';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { cn } from '../../../components/ui/utils';
import type { AssetRow } from './types/assets.types';
import { useAssetsTranslations } from './hooks/useAssetsTranslations';
import { useAssetsPortalTheme } from './useAssetsPortalTheme';

interface AssetPhotosModalProps {
  isOpen: boolean;
  asset: AssetRow | null;
  photos: HrAssetPhoto[];
  isLoading: boolean;
  onClose: () => void;
}

export function AssetPhotosModal({
  isOpen,
  asset,
  photos,
  isLoading,
  onClose,
}: AssetPhotosModalProps) {
  const t = useAssetsTranslations();
  const copy = t.photosModal;
  const isDarkMode = useAssetsPortalTheme();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        hideCloseButton
        className={cn(
          'max-h-[88vh] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[26px] p-0 sm:max-w-4xl',
          isDarkMode
            ? 'border border-slate-700 bg-slate-950 text-white shadow-[0_28px_60px_rgba(4,10,30,0.5)]'
            : 'border border-gray-200 bg-white text-gray-900 shadow-[0_28px_60px_rgba(15,23,42,0.18)]',
        )}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 bg-[#59C3A5] px-6 py-5 text-left text-white">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-2xl font-semibold text-white">
                {copy.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-medium text-white/75">
                {asset?.name ?? copy.title} · {copy.count(photos.length)}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            aria-label={copy.close}
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto bg-slate-50/70 px-6 py-6 dark:bg-slate-950/40">
          <p className={cn('mb-5 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
            {copy.subtitle}
          </p>

          {isLoading ? (
            <div className={cn(
              'rounded-2xl border px-4 py-12 text-center text-sm font-semibold',
              isDarkMode ? 'border-white/10 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-500',
            )}
            >
              {t.loading}
            </div>
          ) : photos.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <article
                  key={photo.id}
                  className={cn(
                    'overflow-hidden rounded-2xl border',
                    isDarkMode ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white',
                  )}
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    <img
                      src={photo.data_url || photo.download_url}
                      alt={photo.file_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 px-4 py-3">
                    <p className={cn('truncate text-sm font-semibold', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {photo.file_name}
                    </p>
                    <p className={cn('text-xs', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                      {(photo.size_bytes / 1024).toFixed(0)} KB
                      {photo.uploaded_by_name ? ` · ${copy.uploadedBy} ${photo.uploaded_by_name}` : ''}
                    </p>
                    <a
                      href={photo.download_url || photo.data_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#137F68] hover:text-[#0f6c59]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {copy.openImage}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={cn(
              'rounded-2xl border border-dashed px-4 py-12 text-center text-sm font-semibold',
              isDarkMode ? 'border-white/15 text-slate-400' : 'border-slate-300 text-slate-500',
            )}
            >
              {copy.empty}
            </div>
          )}
        </div>

        <DialogFooter className="bg-[#59C3A5] px-6 py-4 text-white sm:justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white font-semibold text-[#137F68] hover:bg-white/90"
          >
            {copy.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
