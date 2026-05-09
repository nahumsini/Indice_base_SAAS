import { ReactNode } from 'react';

interface ModuleCarouselProps {
  children: ReactNode;
  gridClasses?: string;
  singleRow?: boolean;
}

export function ModuleCarousel({ children, gridClasses = "grid-cols-[repeat(auto-fill,140px)]", singleRow = false }: ModuleCarouselProps) {
  // Modo single row: carousel horizontal en todas las pantallas
  if (singleRow) {
    return (
      <div className="overflow-x-auto scrollbar-hide pb-4">
        <div className="flex gap-4 snap-x snap-mandatory [&>*]:flex-shrink-0">
          {children}
        </div>
      </div>
    );
  }

  // Modo normal: carousel en móvil, grid en desktop
  return (
    <>
      {/* Carrusel móvil (< md) */}
      <div className="md:hidden overflow-x-auto scrollbar-hide pb-4 -mx-8 px-8">
        <div className="flex gap-4 snap-x snap-mandatory">
          {children}
        </div>
      </div>
      
      {/* Grid desktop (>= md) */}
      <div className={`hidden md:grid ${gridClasses} justify-start gap-4`}>
        {children}
      </div>
    </>
  );
}
