import { ExternalLink, ImageIcon } from 'lucide-react';
import type { HrAssetPhoto } from '../../../api/HumanResources/assets';
import { Button } from '../../../components/ui/button';
import { IndiceModalFrame } from '../../../components/indice-modal';
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
    <IndiceModalFrame
      closeLabel={copy.close}
      contentClassName="sm:max-w-4xl"
      description={`${asset?.name ?? copy.title} · ${copy.count(photos.length)}`}
      footer={<Button type="button" onClick={onClose}>{copy.close}</Button>}
      icon={<ImageIcon className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => (!open ? onClose() : undefined)}
      open={isOpen}
      title={copy.title}
      tone="aqua"
    >
          <p className={cn('mb-5 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
            {copy.subtitle}
          </p>

          {isLoading ? (
            <div className={cn(
              'rounded-2xl border px-4 py-12 text-center text-sm font-medium',
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
                    <p className={cn('truncate text-sm font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
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
                      className="inline-flex items-center gap-2 text-xs font-medium text-[#137F68] hover:text-[#0f6c59]"
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
              'rounded-2xl border border-dashed px-4 py-12 text-center text-sm font-medium',
              isDarkMode ? 'border-white/15 text-slate-400' : 'border-slate-300 text-slate-500',
            )}
            >
              {copy.empty}
            </div>
          )}
    </IndiceModalFrame>
  );
}
