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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">{copy.title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">{copy.subtitle}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => onNavigate()}
          className="w-full justify-center gap-2 text-sm sm:w-auto"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          {copy.back}
        </Button>
      </div>
    </>
  );
}
