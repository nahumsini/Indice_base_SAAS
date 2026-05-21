import { Children, ReactNode } from 'react';

interface ModuleCarouselProps {
  children: ReactNode;
  gridClasses?: string;
  singleRow?: boolean;
}

export function ModuleCarousel({
  children,
  gridClasses = 'grid-cols-[repeat(auto-fit,140px)]',
  singleRow = false,
}: ModuleCarouselProps) {
  const itemCount = Children.count(children);
  const shouldCenterSingleRow = itemCount > 1 && itemCount <= 8;
  const fluidGap = 'gap-[clamp(1rem,1.7vw,1.75rem)]';

  // Single-row mode: horizontal carousel on every viewport.
  if (singleRow) {
    return (
      <div className="-mx-1 overflow-x-auto px-1 pb-4 scrollbar-hide">
        <div
          className={`grid auto-cols-[140px] grid-flow-col ${fluidGap} snap-x snap-mandatory ${shouldCenterSingleRow ? '2xl:justify-center' : 'justify-start'}`}
        >
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
        <div className={`grid auto-cols-[140px] grid-flow-col ${fluidGap} snap-x snap-mandatory`}>
          {children}
        </div>
      </div>
      
      {/* Desktop grid (>= md) */}
      <div className={`hidden md:grid ${gridClasses} justify-start ${fluidGap}`}>
        {children}
      </div>
    </>
  );
}
