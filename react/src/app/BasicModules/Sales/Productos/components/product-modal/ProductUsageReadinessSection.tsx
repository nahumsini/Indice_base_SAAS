import type { Dispatch, SetStateAction } from 'react';
import { BadgeCheck, CalendarDays, CircleDashed, Link2 } from 'lucide-react';
import { Badge } from '../../../../../components/ui/badge';
import { Switch } from '../../../../../components/ui/switch';
import { Input } from '../../../../../components/ui/input';
import { cn } from '../../../../../components/ui/utils';
import type { SalesProductVisibility } from '../../../salesCrmContext';
import type { ProductsTranslations } from '../../translations';
import type { ProductFormState } from '../../types/productosTypes';
import { ProductReadinessBadges } from './ProductReadinessBadges';
import { getUsageReadiness, isReadyForSales, isReadyForPos, type ProductUsageKey } from './productReadiness';

const usageOrder: ProductUsageKey[] = ['sales', 'pos', 'inventory'];

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <p className="font-medium text-slate-950">{label}</p>
        <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        className="mt-1 data-[state=checked]:bg-[#FF6B5E]"
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

export function ProductUsageReadinessSection({
  form,
  t,
  onFormChange,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
}) {
  const usage = getUsageReadiness(form);

  const setVisibility = (visibility: SalesProductVisibility) => {
    onFormChange((current) => ({ ...current, visibility }));
  };

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ToggleRow
          label={t.usage.toggles.activeItem.label}
          description={t.usage.toggles.activeItem.description}
          checked={form.status === 'Active'}
          onCheckedChange={(checked) => onFormChange((current) => ({ ...current, status: checked ? 'Active' : 'Inactive' }))}
        />
        <ToggleRow
          label={t.usage.toggles.readyForSales.label}
          description={t.usage.toggles.readyForSales.description}
          checked={isReadyForSales(form)}
          onCheckedChange={(checked) => setVisibility(checked ? 'Commercial' : 'Internal')}
        />
        <ToggleRow
          label={t.usage.toggles.readyForPOS.label}
          description={t.usage.toggles.readyForPOS.description}
          checked={isReadyForPos(form)}
          onCheckedChange={(checked) => setVisibility(checked ? 'POS ready' : 'Commercial')}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {usageOrder.map((key) => {
          const ready = usage[key];
          const Icon = ready ? BadgeCheck : CircleDashed;

          return (
            <div
              key={key}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4',
                ready ? 'border-[#59C3A5]/25 bg-[#59C3A5]/10' : 'border-slate-200 bg-slate-50',
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ready ? 'text-[#177d66]' : 'text-slate-400')} />
              <div>
                <p className="font-medium text-slate-950">{t.usage.labels[key]}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {ready ? t.usage.ready : t.usage.notReady}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-950">{t.readiness.title}</p>
        <ProductReadinessBadges form={form} t={t} />
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FF6B5E]/10 text-[#B63B32]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-slate-950">{t.usage.reservable.label}</p>
              <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{t.usage.reservable.description}</p>
            </div>
          </div>
          <Switch
            checked={form.reservable}
            className="mt-1 data-[state=checked]:bg-[#FF6B5E]"
            onCheckedChange={(checked) => onFormChange((current) => ({
              ...current,
              reservable: checked,
              availabilityIcalUrl: checked ? current.availabilityIcalUrl : '',
            }))}
          />
        </div>

        {form.reservable ? (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <label htmlFor="product-availability-calendar-url" className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <Link2 className="h-4 w-4 text-[#B63B32]" /> {t.usage.reservable.urlLabel}
            </label>
            <Input
              id="product-availability-calendar-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={form.availabilityIcalUrl}
              placeholder={t.usage.reservable.urlPlaceholder}
              onChange={(event) => onFormChange((current) => ({
                ...current,
                availabilityIcalUrl: event.target.value,
              }))}
            />
            <p className="text-xs font-medium leading-5 text-slate-500">{t.usage.reservable.urlHelp}</p>
          </div>
        ) : null}
      </div>

      <Badge className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
        {t.usage.frontendOnly}
      </Badge>
    </section>
  );
}
