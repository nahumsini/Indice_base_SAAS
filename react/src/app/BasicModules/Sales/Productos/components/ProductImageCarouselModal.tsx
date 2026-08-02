import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { ProductThumbnail } from './ProductThumbnail';
import { getProductGalleryImages } from '../utils/productImages';

const galleryActionClassNames = getSalesModalActionClassNames('coral');

export function ProductImageCarouselModal({
  product,
  open,
  initialIndex,
  t,
  onOpenChange,
}: {
  product: SalesCatalogItem | null;
  open: boolean;
  initialIndex: number;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const images = useMemo(() => (product ? getProductGalleryImages(product) : []), [product]);
  const hasImages = images.length > 0;
  const activeImage = hasImages ? images[activeIndex] : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  }, [images.length, initialIndex, open]);

  const goToPrevious = () => {
    if (!hasImages) {
      return;
    }

    setActiveIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const goToNext = () => {
    if (!hasImages) {
      return;
    }

    setActiveIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={product?.name || t.gallery.title}
      description={hasImages ? t.gallery.counter(activeIndex + 1, images.length) : t.gallery.empty}
      icon={<ImageIcon className="h-6 w-6" />}
      contentClassName="flex h-[min(92vh,940px)] w-[min(96vw,1480px)] max-w-[min(96vw,1480px)] flex-col"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-white p-0"
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
        <div className="grid min-h-0 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="relative flex min-h-[520px] items-center justify-center bg-slate-950/95 p-5">
            {hasImages && activeImage ? (
              <img
                src={activeImage.url}
                alt={activeImage.alt || product?.name || t.gallery.title}
                className="h-full max-h-[calc(92vh-150px)] w-full rounded-lg object-contain"
              />
            ) : product ? (
              <div className="w-full max-w-xl">
                <ProductThumbnail product={product} size="hero" className="aspect-[4/3] min-h-[520px] bg-white/5" />
              </div>
            ) : null}

            {images.length > 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute left-5 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/20 bg-white/90 text-slate-950 shadow-lg hover:bg-white"
                  onClick={goToPrevious}
                  aria-label={t.gallery.previous}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute right-5 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full border-white/20 bg-white/90 text-slate-950 shadow-lg hover:bg-white"
                  onClick={goToNext}
                  aria-label={t.gallery.next}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            ) : null}
          </div>

          <aside className="overflow-y-auto border-l border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">{t.gallery.thumbnails}</p>
            <div className="mt-3 space-y-2">
              {hasImages ? images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition',
                    activeIndex === index
                      ? 'border-[#FF6B5E] bg-[#FF6B5E]/10 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50',
                  )}
                >
                  <img src={image.url} alt={image.alt || product?.name || t.gallery.title} className="h-20 w-24 rounded-md object-cover" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{t.gallery.imageLabel(index + 1)}</span>
                    <span className="block truncate text-xs font-medium text-slate-500">{image.alt || product?.name}</span>
                  </span>
                </button>
              )) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                  {t.gallery.empty}
                </div>
              )}
            </div>
          </aside>
        </div>
    </SalesModalFrame>
  );
}
