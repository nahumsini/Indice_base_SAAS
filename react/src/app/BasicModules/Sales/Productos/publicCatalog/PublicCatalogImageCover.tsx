import { useEffect, useState } from 'react';
import { Image, Maximize2 } from 'lucide-react';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogItem } from './types/publicCatalogTypes';
import { publicCatalogCoverImage, publicCatalogImages } from './utils/publicCatalogPresentation';

type ImageLoadState = 'empty' | 'loading' | 'loaded' | 'error';

export function PublicCatalogImageCover({
  item,
  t,
  compact = false,
  onOpenGallery,
}: {
  item: PublicCatalogItem;
  t: ProductsTranslations;
  compact?: boolean;
  onOpenGallery: (item: PublicCatalogItem) => void;
}) {
  const coverImage = publicCatalogCoverImage(item);
  const hasGallery = publicCatalogImages(item).length > 0;
  const [loadState, setLoadState] = useState<ImageLoadState>(coverImage ? 'loading' : 'empty');

  useEffect(() => {
    setLoadState(coverImage ? 'loading' : 'empty');
  }, [coverImage?.url]);

  if (!coverImage) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm font-medium text-slate-400">
        <Image className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
        <span className="line-clamp-2">{item.name}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="group/image relative block h-full w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF6B5E]"
      disabled={!hasGallery}
      onClick={() => onOpenGallery(item)}
      aria-label={t.gallery.open(item.name)}
    >
      <img
        src={coverImage.url}
        alt={coverImage.alt || item.name}
        className={`h-full w-full object-cover transition duration-300 ${loadState === 'loaded' ? 'opacity-100 group-hover/image:scale-[1.025]' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoadState('loaded')}
        onError={() => setLoadState('error')}
      />

      {loadState === 'loading' ? (
        <span className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-slate-200/80 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" aria-hidden="true" />
      ) : null}

      {loadState === 'error' ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 p-4 text-center text-sm font-medium text-slate-400 dark:bg-slate-950">
          <Image className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
          <span className="line-clamp-2">{item.name}</span>
        </span>
      ) : null}

      {hasGallery ? (
        <span className={`absolute bottom-2 right-2 flex items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-md backdrop-blur transition group-hover/image:bg-white ${compact ? 'h-7 w-7' : 'h-9 w-9'}`} aria-hidden="true">
          <Maximize2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </span>
      ) : null}
    </button>
  );
}
