import { useEffect, useMemo, useState } from 'react';
import { Check, FolderCog } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import { productCategoryLibraries } from '../mocks/categoryLibraries';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryConfig, ProductCategoryLibrary } from '../types/productCategoryTypes';
import {
  createCategoriesFromLibrary,
  createProductCategory,
  normalizeCategoryName,
  normalizeProductCategoryDirectory,
} from '../utils/productCategories';
import { ActiveCategoriesList } from './category-directory/ActiveCategoriesList';
import { CategoryLibraryPanel } from './category-directory/CategoryLibraryPanel';
import { CategoryQuickCreate } from './category-directory/CategoryQuickCreate';

const categoryActionClassNames = getSalesModalActionClassNames('coral');

function moveCategory(categories: ProductCategoryConfig[], categoryId: string, direction: 'up' | 'down') {
  const index = categories.findIndex((category) => category.id === categoryId);
  const nextIndex = direction === 'up' ? index - 1 : index + 1;

  if (index < 0 || nextIndex < 0 || nextIndex >= categories.length) {
    return categories;
  }

  const nextCategories = [...categories];
  const [category] = nextCategories.splice(index, 1);
  nextCategories.splice(nextIndex, 0, category);
  return nextCategories;
}

function reorderCategories(categories: ProductCategoryConfig[], fromCategoryId: string, toCategoryId: string) {
  const fromIndex = categories.findIndex((category) => category.id === fromCategoryId);
  const toIndex = categories.findIndex((category) => category.id === toCategoryId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return categories;
  }

  const nextCategories = [...categories];
  const [movedCategory] = nextCategories.splice(fromIndex, 1);
  nextCategories.splice(toIndex, 0, movedCategory);
  return nextCategories;
}

function getImportableNames(library: ProductCategoryLibrary | undefined, categories: ProductCategoryConfig[]) {
  if (!library) {
    return [];
  }

  const existingNames = new Set(categories.map((category) => normalizeCategoryName(category.name)));
  return library.categories
    .filter((category) => !existingNames.has(normalizeCategoryName(category.name)))
    .map((category) => category.name);
}

export function ProductCategoryManagerModal({
  open,
  categories,
  t,
  onOpenChange,
  onCategoriesChange,
}: {
  open: boolean;
  categories: ProductCategoryConfig[];
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onCategoriesChange: (categories: ProductCategoryConfig[]) => void;
}) {
  const [draftCategories, setDraftCategories] = useState<ProductCategoryConfig[]>(categories);
  const [draftName, setDraftName] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState(productCategoryLibraries[0]?.id ?? '');

  const selectedLibrary = useMemo(
    () => productCategoryLibraries.find((library) => library.id === selectedLibraryId) ?? productCategoryLibraries[0],
    [selectedLibraryId],
  );
  const activeCategories = useMemo(
    () => draftCategories.filter((category) => category.isActive),
    [draftCategories],
  );
  const duplicateNames = useMemo(() => {
    const existingNames = new Set(draftCategories.map((category) => normalizeCategoryName(category.name)));
    return new Set(
      (selectedLibrary?.categories ?? [])
        .filter((category) => existingNames.has(normalizeCategoryName(category.name)))
        .map((category) => category.name),
    );
  }, [draftCategories, selectedLibrary]);
  const [selectedLibraryCategories, setSelectedLibraryCategories] = useState<string[]>(
    getImportableNames(selectedLibrary, draftCategories),
  );
  const selectedCategoryNames = useMemo(
    () => new Set(selectedLibraryCategories),
    [selectedLibraryCategories],
  );

  useEffect(() => {
    if (open) {
      setDraftCategories(categories);
      setDraftName('');
      setSelectedLibraryCategories(getImportableNames(selectedLibrary, categories));
    }
  }, [categories, open, selectedLibrary]);

  const updateCategory = (categoryId: string, updater: (category: ProductCategoryConfig) => ProductCategoryConfig) => {
    setDraftCategories((currentCategories) => currentCategories.map((category) => (category.id === categoryId ? updater(category) : category)));
  };

  const handleCreateCategory = () => {
    if (!draftName.trim()) {
      return;
    }

    setDraftCategories((currentCategories) => [...currentCategories, createProductCategory(draftName, currentCategories.length)]);
    setDraftName('');
  };

  const handleLibraryChange = (libraryId: string) => {
    const library = productCategoryLibraries.find((item) => item.id === libraryId);

    setSelectedLibraryId(libraryId);
    setSelectedLibraryCategories(getImportableNames(library, draftCategories));
  };

  const importCategories = (selectedNames: string[]) => {
    if (!selectedLibrary) {
      return;
    }

    setDraftCategories((currentCategories) => {
      const importedCategories = createCategoriesFromLibrary(selectedLibrary, selectedNames, currentCategories);
      return importedCategories.length === 0 ? currentCategories : [...currentCategories, ...importedCategories];
    });
    setSelectedLibraryCategories([]);
  };

  const handleImportSelected = () => {
    importCategories(selectedLibraryCategories.filter((name) => !duplicateNames.has(name)));
  };

  const handleImportAll = () => {
    importCategories(getImportableNames(selectedLibrary, draftCategories));
  };

  const handleSave = () => {
    const pendingImportCategories = selectedLibrary
      ? createCategoriesFromLibrary(
          selectedLibrary,
          selectedLibraryCategories.filter((name) => !duplicateNames.has(name)),
          draftCategories,
        )
      : [];

    onCategoriesChange(normalizeProductCategoryDirectory([...draftCategories, ...pendingImportCategories]));
    onOpenChange(false);
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={t.categoryManager.title}
      description={t.categoryManager.description}
      icon={<FolderCog className="h-6 w-6" />}
      contentClassName="flex h-[min(84vh,780px)] w-[min(94vw,1180px)] max-w-[min(94vw,1180px)] flex-col"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-slate-50 p-0"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            className={categoryActionClassNames.secondary}
            onClick={() => onOpenChange(false)}
          >
            {t.common.cancel}
          </Button>
          <Button className={categoryActionClassNames.primary} onClick={handleSave}>
            <Check className="h-4 w-4" />
            {t.common.save}
          </Button>
        </>
      )}
    >
        <div className="grid min-h-0 gap-5 overflow-hidden bg-slate-50 p-5 lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
          <CategoryLibraryPanel
            selectedLibraryId={selectedLibraryId}
            selectedLibrary={selectedLibrary}
            selectedNames={selectedCategoryNames}
            duplicateNames={duplicateNames}
            t={t}
            onLibraryChange={handleLibraryChange}
            onSelectedNamesChange={setSelectedLibraryCategories}
            onImportSelected={handleImportSelected}
            onImportAll={handleImportAll}
          />

          <section className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <CategoryQuickCreate
              value={draftName}
              t={t}
              onValueChange={setDraftName}
              onCreate={handleCreateCategory}
            />

            <ActiveCategoriesList
              categories={draftCategories}
              activeCount={activeCategories.length}
              t={t}
              onMove={(categoryId, direction) => setDraftCategories((currentCategories) => moveCategory(currentCategories, categoryId, direction))}
              onRemove={(categoryId) => setDraftCategories((currentCategories) => currentCategories.filter((category) => category.id !== categoryId))}
              onReorder={(fromCategoryId, toCategoryId) => setDraftCategories((currentCategories) => reorderCategories(currentCategories, fromCategoryId, toCategoryId))}
              onUpdate={updateCategory}
            />
          </section>
        </div>
    </SalesModalFrame>
  );
}
