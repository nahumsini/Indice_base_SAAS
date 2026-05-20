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
      const scrollAmount = 240;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Carousel mode: always horizontal with controls.
  if (mode === 'carousel' || childCount > 6) {
    return (
      <div className="relative group">
        {/* Left edge fade */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent z-[5] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Left control */}
        {childCount > 3 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700 -translate-x-5 hover:scale-110"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </Button>
        )}

        {/* Carousel container */}
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="flex min-w-min snap-x snap-mandatory gap-4 [&>*]:w-[220px] [&>*]:flex-shrink-0">
            {children}
          </div>
        </div>

        {/* Right edge fade */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent z-[5] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Right control */}
        {childCount > 3 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white dark:bg-gray-800 shadow-lg border-2 border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700 translate-x-5 hover:scale-110"
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
      {/* Mobile carousel (< lg) */}
      <div className="lg:hidden overflow-x-auto scrollbar-hide pb-4 -mx-8 px-8">
        <div className="flex snap-x snap-mandatory gap-4 [&>*]:w-[220px] [&>*]:flex-shrink-0">
          {children}
        </div>
      </div>
      
      {/* Desktop grid (>= lg) */}
      <div className="hidden lg:grid grid-cols-[repeat(auto-fit,minmax(180px,220px))] gap-4">
        {children}
      </div>
    </>
  );
}
