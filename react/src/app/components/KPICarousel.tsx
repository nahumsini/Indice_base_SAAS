import { ReactNode, useRef } from 'react';
import { IndiceHorizontalScrollControls } from './ui/horizontal-scroll-controls';

interface KPICarouselProps {
  children: ReactNode;
  mode?: 'grid' | 'carousel';
  compactCards?: boolean;
  dashboardSpacing?: boolean;
}

export function KPICarousel({ children, mode = 'grid', compactCards = false, dashboardSpacing = false }: KPICarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carousel mode: always horizontal with controls.
  if (mode === 'carousel') {
    return (
      <div className={`relative group -mx-4 ${dashboardSpacing ? 'sm:-mx-1 -mb-4' : 'sm:mx-0'}`}>
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide px-4 pb-4 scroll-smooth sm:px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className={`flex min-w-min snap-x snap-mandatory gap-3 [&>*]:flex-shrink-0 ${compactCards ? '[&>*]:w-[min(68vw,220px)] sm:[&>*]:w-[200px]' : '[&>*]:w-[min(78vw,280px)] sm:[&>*]:w-[227px] xl:[&>*]:w-[240px]'}`}>
            {children}
          </div>
        </div>
        <IndiceHorizontalScrollControls
          scrollRef={scrollRef}
          className={dashboardSpacing ? 'bottom-4' : undefined}
          buttonClassName={dashboardSpacing ? 'shadow-md' : undefined}
        />
      </div>
    );
  }

  // Grid mode: responsive layout by KPI count.
  return (
    <>
      {/* Responsive grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {children}
      </div>
    </>
  );
}
