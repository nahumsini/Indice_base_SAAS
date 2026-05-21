import { ReactNode } from 'react';

interface ModuleCarouselProps {
  children: ReactNode;
  gridClasses?: string;
  singleRow?: boolean;
}

export function ModuleCarousel({ children, gridClasses = "grid-cols-[repeat(auto-fill,140px)]", singleRow = false }: ModuleCarouselProps) {
  // Single-row mode: horizontal carousel on every viewport.
  if (singleRow) {
    return (
      <div className="overflow-x-auto scrollbar-hide pb-4">
        <div className="flex gap-4 snap-x snap-mandatory [&>*]:flex-shrink-0">
          {children}
        </div>
      </div>
    );
  }

  // Default mode: mobile carousel, desktop grid.
  return (
    <>
      {/* Mobile carousel (< md) */}
      <div className="md:hidden overflow-x-auto scrollbar-hide pb-4 -mx-8 px-8">
        <div className="flex gap-4 snap-x snap-mandatory">
          {children}
        </div>
      </div>
      
      {/* Desktop grid (>= md) */}
      <div className={`hidden md:grid ${gridClasses} justify-start gap-4`}>
        {children}
      </div>
    </>
  );
}
