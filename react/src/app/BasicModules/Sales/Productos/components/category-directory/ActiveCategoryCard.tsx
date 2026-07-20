import { ArrowDown, ArrowUp, GripVertical, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../../components/ui/dropdown-menu';
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
      className={`min-w-0 rounded-lg border bg-white px-2.5 py-2 transition ${isDragging ? 'border-[#FF6B5E]/40 opacity-70' : 'border-slate-200'}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="flex h-8 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:cursor-grabbing"
          aria-label={`Drag ${category.name}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
        <div className="min-w-0 flex-1">
          <Input
            value={category.name}
            className="h-8 min-w-0 border-0 bg-transparent px-1 text-sm font-semibold shadow-none focus:bg-slate-50 focus:ring-1 focus:ring-[#FF6B5E]/20"
            onChange={(event) => onUpdate(category.id, (current) => ({
              ...current,
              name: event.target.value,
              value: event.target.value,
            }))}
          />
          <div className="flex min-w-0 flex-wrap gap-1 px-1 pt-1">
            {category.supportedTypes.slice(0, 3).map((type) => (
              <span key={type} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {t.typeLabels[type]}
              </span>
            ))}
            {category.supportedTypes.length > 3 ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                +{category.supportedTypes.length - 3}
              </span>
            ) : null}
          </div>
        </div>
        <label className="hidden shrink-0 items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
          <Switch
            checked={category.isActive}
            aria-label={category.isActive ? t.categoryManager.active : t.categoryManager.inactive}
            onCheckedChange={(checked) => onUpdate(category.id, (current) => ({ ...current, isActive: checked === true }))}
          />
          <span className="w-12">{category.isActive ? t.categoryManager.active : t.categoryManager.inactive}</span>
        </label>
        <div className="sm:hidden">
          <Switch
            checked={category.isActive}
            aria-label={category.isActive ? t.categoryManager.active : t.categoryManager.inactive}
            onCheckedChange={(checked) => onUpdate(category.id, (current) => ({ ...current, isActive: checked === true }))}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label={`Actions for ${category.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMove(category.id, 'up')}>
              <ArrowUp />
              {t.categoryManager.moveUp}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === totalCount - 1} onSelect={() => onMove(category.id, 'down')}>
              <ArrowDown />
              {t.categoryManager.moveDown}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onRemove(category.id)}>
              <Trash2 />
              {t.categoryManager.remove}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
