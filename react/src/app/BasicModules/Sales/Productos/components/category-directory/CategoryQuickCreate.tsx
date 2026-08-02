import { Plus } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import type { ProductsTranslations } from '../../translations';

type CategoryQuickCreateProps = {
  value: string;
  t: ProductsTranslations;
  onValueChange: (value: string) => void;
  onCreate: () => void;
};

export function CategoryQuickCreate({
  value,
  t,
  onValueChange,
  onCreate,
}: CategoryQuickCreateProps) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5">
      <h3 className="text-sm font-medium text-slate-900">{t.categoryManager.createTitle}</h3>
      <div className="mt-2.5 flex min-w-0 gap-2">
        <Input
          value={value}
          className="h-10 min-w-0 flex-1 rounded-lg border-slate-200 bg-slate-50 text-sm font-medium shadow-none focus:border-[#FF6B5E] focus:bg-white focus:ring-[#FF6B5E]/20"
          placeholder={t.categoryManager.namePlaceholder}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onCreate();
            }
          }}
        />
        <Button
          type="button"
          className="h-10 shrink-0 gap-2 rounded-lg bg-[#FF6B5E] px-3 text-sm font-medium text-[#222831] hover:bg-[#E85C50] sm:px-4"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t.categoryManager.create}</span>
        </Button>
      </div>
    </section>
  );
}
