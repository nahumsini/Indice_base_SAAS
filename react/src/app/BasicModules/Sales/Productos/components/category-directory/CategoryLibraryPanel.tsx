import { UploadCloud } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { productCategoryLibraries } from '../../mocks/categoryLibraries';
import type { ProductsTranslations } from '../../translations';
import type { ProductCategoryLibrary } from '../../types/productCategoryTypes';
import { CategorySuggestionCard } from './CategorySuggestionCard';

type CategoryLibraryPanelProps = {
  selectedLibraryId: string;
  selectedLibrary?: ProductCategoryLibrary;
  selectedNames: Set<string>;
  duplicateNames: Set<string>;
  t: ProductsTranslations;
  onLibraryChange: (libraryId: string) => void;
  onSelectedNamesChange: (names: string[]) => void;
  onImportSelected: () => void;
  onImportAll: () => void;
};

export function CategoryLibraryPanel({
  selectedLibraryId,
  selectedLibrary,
  selectedNames,
  duplicateNames,
  t,
  onLibraryChange,
  onSelectedNamesChange,
  onImportSelected,
  onImportAll,
}: CategoryLibraryPanelProps) {
  const hasSuggestions = Boolean(selectedLibrary?.categories.length);

  return (
    <section className="flex min-h-[460px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 xl:min-h-0">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">{t.categoryManager.libraryTitle}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-500">{t.categoryManager.libraryDescription}</p>
      </div>
      <div className="mt-4">
        <Select value={selectedLibraryId} onValueChange={onLibraryChange}>
          <SelectTrigger className="h-10 rounded-lg border-slate-200 bg-white text-sm font-medium shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {productCategoryLibraries.map((library) => (
              <SelectItem key={library.id} value={library.id}>{library.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasSuggestions ? (
        <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
          {selectedLibrary?.categories.map((category) => (
            <CategorySuggestionCard
              key={category.id}
              category={category}
              checked={selectedNames.has(category.name)}
              disabled={duplicateNames.has(category.name)}
              t={t}
              onCheckedChange={(checked) => {
                const nextNames = checked
                  ? Array.from(new Set([...selectedNames, category.name]))
                  : Array.from(selectedNames).filter((name) => name !== category.name);
                onSelectedNamesChange(nextNames);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
          {t.categoryManager.emptyLibrary}
        </div>
      )}

      <div className="mt-3 grid shrink-0 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <Button
          type="button"
          className="h-10 w-full gap-2 rounded-lg bg-[#FF6B5E] text-sm font-semibold text-white hover:bg-[#E85C50]"
          onClick={onImportSelected}
        >
          <UploadCloud className="h-4 w-4" />
          {t.categoryManager.importSelected}
          {selectedNames.size > 0 ? (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[11px] leading-none">{selectedNames.size}</span>
          ) : null}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-2 rounded-lg border-[#FF6B5E]/25 bg-white text-sm font-semibold text-[#B63B32] hover:bg-[#FF6B5E]/10"
          onClick={onImportAll}
        >
          <UploadCloud className="h-4 w-4" />
          {t.categoryManager.importAll}
        </Button>
      </div>
    </section>
  );
}
