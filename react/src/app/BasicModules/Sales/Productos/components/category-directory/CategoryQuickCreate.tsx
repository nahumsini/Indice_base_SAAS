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
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-base font-black text-slate-950">{t.categoryManager.createTitle}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          value={value}
          className="h-10 rounded-lg border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
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
          className="h-10 gap-2 rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E85C50]"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          {t.categoryManager.create}
        </Button>
      </div>
    </section>
  );
}
