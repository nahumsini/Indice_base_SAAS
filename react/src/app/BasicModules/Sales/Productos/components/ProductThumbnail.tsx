import { useEffect, useState } from 'react';
import { Box } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';
import type { SalesCatalogItem } from '../../types';
import { getProductGalleryImages } from '../utils/productImages';

const toneClasses: Record<SalesCatalogItem['thumbnailTone'], string> = {
  blue: 'bg-[#FF6B5E]/10 text-[#B63B32] ring-[#FF6B5E]/25',
  aqua: 'bg-slate-50 text-slate-700 ring-slate-200',
  yellow: 'bg-[#F4C84A]/15 text-[#9a6b05] ring-[#F4C84A]/35',
  coral: 'bg-[#FF6B5E]/10 text-[#B63B32] ring-[#FF6B5E]/25',
  graphite: 'bg-[#222831]/5 text-[#222831] ring-[#222831]/15',
};

const sizeClasses = {
  sm: {
    shell: 'h-10 w-10 rounded-lg',
    icon: 'h-5 w-5',
  },
  md: {
    shell: 'h-12 w-12 rounded-lg',
    icon: 'h-6 w-6',
  },
  hero: {
    shell: 'h-full min-h-[220px] w-full rounded-lg',
    icon: 'h-12 w-12',
  },
};

type ProductThumbnailProps = {
  product: Pick<SalesCatalogItem, 'name' | 'imageUrl' | 'imageAlt' | 'thumbnailTone'>
    & Partial<Pick<SalesCatalogItem, 'id' | 'gallery'>>;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function ProductThumbnail({ product, size = 'md', className }: ProductThumbnailProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const primaryImage = getProductGalleryImages(product)[0];
  const imageUrl = primaryImage?.url;
  const canRenderImage = Boolean(imageUrl && !hasImageError);
  const dimensions = sizeClasses[size];

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl]);

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden ring-1',
        dimensions.shell,
        className,
        canRenderImage
          ? 'bg-white text-slate-700 ring-slate-200'
          : toneClasses[product.thumbnailTone],
      )}
    >
      {canRenderImage ? (
        <img
          src={imageUrl}
          alt={primaryImage?.alt || product.imageAlt || product.name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <Box className={dimensions.icon} />
      )}
    </div>
  );
}
