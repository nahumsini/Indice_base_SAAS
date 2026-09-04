import { ReactNode, useRef } from 'react';
import { IndiceHorizontalScrollControls } from './ui/horizontal-scroll-controls';

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
  const fluidGap = 'gap-[clamp(1rem,1.7vw,1.75rem)]';
  const singleRowScrollRef = useRef<HTMLDivElement>(null);

  // Single-row mode: horizontal carousel on every viewport.
  if (singleRow) {
    return (
      <div className="relative -mx-1">
        <div ref={singleRowScrollRef} className="overflow-x-auto px-1 pb-4 scrollbar-hide">
          <div
            className={`grid auto-cols-[140px] grid-flow-col justify-start ${fluidGap} snap-x snap-mandatory`}
          >
            {children}
          </div>
        </div>
        <IndiceHorizontalScrollControls scrollRef={singleRowScrollRef} />
      </div>
    );
  }

  // Default mode: mobile carousel, desktop grid.
  return (
    <>
      {/* Mobile carousel (< md) */}
      <div className="md:hidden overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
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
