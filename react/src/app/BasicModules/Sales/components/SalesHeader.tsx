import { Home } from 'lucide-react';
import { FavoritesBar } from '../../../components/FavoritesBar';
import { Button } from '../../../components/ui/button';
import type { SalesTranslations } from '../translations';

interface SalesHeaderProps {
  copy: Pick<SalesTranslations, 'title' | 'subtitle' | 'back'>;
  onNavigate: (page?: string) => void;
}

export function SalesHeader({ copy, onNavigate }: SalesHeaderProps) {
  return (
    <>
      <FavoritesBar
        onNavigate={(page) => {
          if (page === 'sales') return;
          onNavigate(page);
        }}
        currentModule="sales"
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">{copy.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">{copy.subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => onNavigate()} className="h-11 gap-2 rounded-lg px-4 text-sm">
          <Home className="h-4 w-4" aria-hidden="true" />
          {copy.back}
        </Button>
      </div>
    </>
  );
}
