import { ReactNode, Children, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface KPICarouselProps {
  children: ReactNode;
  mode?: 'grid' | 'carousel';
}

export function KPICarousel({ children, mode = 'grid' }: KPICarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const childCount = Children.count(children);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 360;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Carousel mode: always horizontal with controls.
  if (mode === 'carousel') {
    return (
      <div className="relative group">
        {/* Left edge fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-[5] w-16 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent" />
        
        {/* Left control */}
        {childCount > 3 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Scroll KPI cards left"
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 shadow-md transition-all hover:scale-105 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Button>
        )}

        {/* Carousel container */}
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide px-1 pb-4 scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="flex min-w-min snap-x snap-mandatory gap-3 [&>*]:w-[290px] [&>*]:flex-shrink-0 sm:[&>*]:w-[320px] xl:[&>*]:w-[340px]">
            {children}
          </div>
        </div>

        {/* Right edge fade */}
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-[5] w-16 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent" />

        {/* Right control */}
        {childCount > 3 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Scroll KPI cards right"
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 shadow-md transition-all hover:scale-105 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/95 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Button>
        )}
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
