import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import type { ProductsTranslations } from '../../translations';
import type { ProductCategoryConfig } from '../../types/productCategoryTypes';
import { ActiveCategoryCard } from './ActiveCategoryCard';

type ActiveCategoriesListProps = {
  categories: ProductCategoryConfig[];
  activeCount: number;
  t: ProductsTranslations;
  onMove: (categoryId: string, direction: 'up' | 'down') => void;
  onRemove: (categoryId: string) => void;
  onReorder: (fromCategoryId: string, toCategoryId: string) => void;
  onUpdate: (categoryId: string, updater: (category: ProductCategoryConfig) => ProductCategoryConfig) => void;
};

export function ActiveCategoriesList({
  categories,
  activeCount,
  t,
  onMove,
  onRemove,
  onReorder,
  onUpdate,
}: ActiveCategoriesListProps) {
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 px-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-lg font-medium text-slate-950">{t.categoryManager.activeTitle}</h3>
          <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600">
            {activeCount}
          </span>
        </div>
        <p className="mt-0.5 text-sm leading-5 text-slate-500">{t.categoryManager.activeDescription}</p>
      </div>

      {activeCount === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <FolderOpen className="h-5 w-5" />
          </div>
          <h4 className="mt-3 text-base font-medium text-slate-950">{t.categoryManager.emptyActiveTitle}</h4>
          <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-6 text-slate-500">
            {t.categoryManager.emptyActiveDescription}
          </p>
        </div>
      ) : null}

      <div className="mt-3 min-h-0 min-w-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
        {categories.map((category, index) => (
          <ActiveCategoryCard
            key={category.id}
            category={category}
            index={index}
            totalCount={categories.length}
            isDragging={draggingCategoryId === category.id}
            t={t}
            onDragStart={setDraggingCategoryId}
            onDragEnter={(targetCategoryId) => {
              if (draggingCategoryId && draggingCategoryId !== targetCategoryId) {
                onReorder(draggingCategoryId, targetCategoryId);
              }
            }}
            onDragEnd={() => setDraggingCategoryId(null)}
            onMove={onMove}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  );
}
