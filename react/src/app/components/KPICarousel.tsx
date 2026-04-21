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
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Modo carrusel: siempre horizontal con controles
  if (mode === 'carousel' || childCount > 6) {
    return (
      <div className="relative group">
        {/* Gradiente izquierdo */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-gray-50 dark:from-gray-900 to-transparent z-[5] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Botón izquierdo */}
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

        {/* Contenedor del carrusel */}
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className="flex gap-5 snap-x snap-mandatory min-w-min [&>*]:w-[280px] [&>*]:flex-shrink-0">
            {children}
          </div>
        </div>

        {/* Gradiente derecho */}
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent z-[5] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Botón derecho */}
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

  // Modo grid (default): responsive grid
  return (
    <>
      {/* Carrusel móvil (< lg) */}
      <div className="lg:hidden overflow-x-auto scrollbar-hide pb-4 -mx-8 px-8">
        <div className="flex gap-5 snap-x snap-mandatory [&>*]:w-[280px] [&>*]:flex-shrink-0">
          {children}
        </div>
      </div>
      
      {/* Grid desktop (>= lg) - se ajusta automáticamente según cantidad */}
      <div className={`hidden lg:grid gap-5 ${
        childCount === 1 ? 'lg:grid-cols-1 max-w-xs' :
        childCount === 2 ? 'lg:grid-cols-2 max-w-2xl' :
        childCount === 3 ? 'lg:grid-cols-3 max-w-4xl' :
        childCount === 4 ? 'lg:grid-cols-4 max-w-5xl' :
        childCount === 5 ? 'lg:grid-cols-5 max-w-6xl' :
        'lg:grid-cols-3 xl:grid-cols-6'
      }`}>
        {children}
      </div>
    </>
  );
}