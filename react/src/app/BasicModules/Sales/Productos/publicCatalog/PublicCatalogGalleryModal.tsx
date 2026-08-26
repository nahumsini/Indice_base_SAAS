import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Image, Images } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogItem } from './types/publicCatalogTypes';
import { publicCatalogImages } from './utils/publicCatalogPresentation';

const galleryActionClassNames = getSalesModalActionClassNames('coral');

export function PublicCatalogGalleryModal({
  item,
  open,
  initialIndex = 0,
  t,
  onOpenChange,
}: {
  item: PublicCatalogItem | null;
  open: boolean;
  initialIndex?: number;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const images = useMemo(() => (item ? publicCatalogImages(item) : []), [item]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState('');
  const [failedUrl, setFailedUrl] = useState('');
  const touchStartX = useRef<number | null>(null);
  const activeImage = images[activeIndex] ?? null;
  const hasNavigation = images.length > 1;

  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  }, [images.length, initialIndex, open]);

  useEffect(() => {
    setLoadedUrl('');
    setFailedUrl('');
  }, [activeImage?.url]);

  const move = (direction: -1 | 1) => {
    if (!hasNavigation) return;
    setActiveIndex((current) => (current + direction + images.length) % images.length);
  };

  useEffect(() => {
    if (!open || !hasNavigation) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNavigation, images.length, open]);

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      modalType="large-workspace"
      title={item?.name || t.gallery.title}
      description={images.length > 0 ? t.gallery.counter(activeIndex + 1, images.length) : t.gallery.empty}
      icon={<Images className="h-6 w-6" />}
      contentClassName="flex h-[min(94vh,980px)] w-[min(96vw,1480px)] max-w-[min(96vw,1480px)] flex-col"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-slate-950 p-0"
      footerClassName="sm:justify-end"
      footer={(
        <Button
          type="button"
          variant="outline"
          className={galleryActionClassNames.secondary}
          onClick={() => onOpenChange(false)}
        >
          {t.common.close}
        </Button>
      )}
    >
      <div
        className="relative flex h-full min-h-[420px] touch-pan-y items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-6"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartX.current;
          const endX = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (startX == null || endX == null || Math.abs(startX - endX) < 48) return;
          move(startX > endX ? 1 : -1);
        }}
      >
        {activeImage && failedUrl !== activeImage.url ? (
          <>
            {loadedUrl !== activeImage.url ? (
              <div className="absolute inset-6 animate-pulse rounded-xl bg-slate-900" aria-hidden="true" />
            ) : null}
            <img
              key={activeImage.url}
              src={activeImage.url}
              alt={activeImage.alt || item?.name || t.gallery.title}
              className={`h-full max-h-[calc(94vh-160px)] w-full select-none rounded-lg object-contain transition-opacity duration-200 ${loadedUrl === activeImage.url ? 'opacity-100' : 'opacity-0'}`}
              loading="eager"
              decoding="async"
              draggable={false}
              onLoad={() => setLoadedUrl(activeImage.url)}
              onError={() => setFailedUrl(activeImage.url)}
            />
          </>
        ) : (
          <div className="flex max-w-md flex-col items-center gap-3 text-center text-sm font-medium text-slate-400">
            <Image className="h-10 w-10" />
            <p>{t.gallery.empty}</p>
          </div>
        )}

        {hasNavigation ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/20 bg-white/90 text-slate-950 shadow-lg hover:bg-white sm:left-5"
              onClick={() => move(-1)}
              aria-label={t.gallery.previous}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/20 bg-white/90 text-slate-950 shadow-lg hover:bg-white sm:right-5"
              onClick={() => move(1)}
              aria-label={t.gallery.next}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        ) : null}
      </div>
    </SalesModalFrame>
  );
}
