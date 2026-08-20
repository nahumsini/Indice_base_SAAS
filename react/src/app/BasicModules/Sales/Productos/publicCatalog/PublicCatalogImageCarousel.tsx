import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogItem } from './types/publicCatalogTypes';
import { publicCatalogImages } from './utils/publicCatalogPresentation';

export function PublicCatalogImageCarousel({
  item,
  t,
  compact = false,
}: {
  item: PublicCatalogItem;
  t: ProductsTranslations;
  compact?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = useMemo(() => publicCatalogImages(item), [item]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(images.length - 1, 0)));
  }, [images.length]);

  const activeImage = images[activeIndex];
  const showNavigation = images.length > 1;
  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + images.length) % images.length);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {activeImage ? (
        <img
          src={activeImage.url}
          alt={activeImage.alt || item.name}
          className={cn(
            'h-full w-full object-cover transition duration-300',
            !compact && 'group-hover:scale-[1.025]',
          )}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm font-medium text-slate-400">
          <Image className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
          <span className="line-clamp-2">{item.name}</span>
        </div>
      )}

      {showNavigation ? (
        <>
          <button
            type="button"
            className={cn(
              'absolute left-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]',
              compact ? 'h-7 w-7' : 'h-9 w-9 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
            )}
            onClick={(event) => {
              event.stopPropagation();
              move(-1);
            }}
            aria-label={t.publicCatalog.previousImage}
          >
            <ChevronLeft className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
          <button
            type="button"
            className={cn(
              'absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]',
              compact ? 'h-7 w-7' : 'h-9 w-9 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
            )}
            onClick={(event) => {
              event.stopPropagation();
              move(1);
            }}
            aria-label={t.publicCatalog.nextImage}
          >
            <ChevronRight className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
          <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur">
            {t.publicCatalog.imageCounter(activeIndex + 1, images.length)}
          </span>
        </>
      ) : null}
    </div>
  );
}
