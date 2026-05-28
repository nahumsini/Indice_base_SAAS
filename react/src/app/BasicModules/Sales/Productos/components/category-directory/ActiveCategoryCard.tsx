import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import { Switch } from '../../../../../components/ui/switch';
import type { ProductsTranslations } from '../../translations';
import type { ProductCategoryConfig } from '../../types/productCategoryTypes';

type ActiveCategoryCardProps = {
  category: ProductCategoryConfig;
  index: number;
  totalCount: number;
  isDragging: boolean;
  t: ProductsTranslations;
  onDragStart: (categoryId: string) => void;
  onDragEnter: (categoryId: string) => void;
  onDragEnd: () => void;
  onMove: (categoryId: string, direction: 'up' | 'down') => void;
  onRemove: (categoryId: string) => void;
  onUpdate: (categoryId: string, updater: (category: ProductCategoryConfig) => ProductCategoryConfig) => void;
};

export function ActiveCategoryCard({
  category,
  index,
  totalCount,
  isDragging,
  t,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onMove,
  onRemove,
  onUpdate,
}: ActiveCategoryCardProps) {
  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(category.id);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragEnter(category.id);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
      className={`rounded-lg border bg-white px-3 py-3 transition ${isDragging ? 'border-[#FF6B5E]/40 opacity-70' : 'border-slate-200'}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 active:cursor-grabbing"
          aria-label={`Drag ${category.name}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
        <Input
          value={category.name}
          className="h-9 min-w-[150px] flex-1 rounded-lg border-slate-200 bg-white text-sm font-bold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
          onChange={(event) => onUpdate(category.id, (current) => ({
            ...current,
            name: event.target.value,
            value: event.target.value,
          }))}
        />
        <Switch
          checked={category.isActive}
          aria-label={category.isActive ? t.categoryManager.active : t.categoryManager.inactive}
          onCheckedChange={(checked) => onUpdate(category.id, (current) => ({ ...current, isActive: checked === true }))}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          disabled={index === 0}
          onClick={() => onMove(category.id, 'up')}
          aria-label={`Move ${category.name} up`}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          disabled={index === totalCount - 1}
          onClick={() => onMove(category.id, 'down')}
          aria-label={`Move ${category.name} down`}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-500 hover:border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/10 hover:text-[#B63B32]"
          onClick={() => onRemove(category.id)}
          aria-label={`Remove ${category.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
        {category.supportedTypes.slice(0, 3).map((type) => (
          <span key={type} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
            {t.typeLabels[type]}
          </span>
        ))}
        {category.supportedTypes.length > 3 ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            +{category.supportedTypes.length - 3}
          </span>
        ) : null}
      </div>
    </article>
  );
}
