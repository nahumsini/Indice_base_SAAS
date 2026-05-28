import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { cn } from '../../../../../components/ui/utils';
import type { ProductsTranslations } from '../../translations';
import type { ProductFormState } from '../../types/productosTypes';
import { getMarginGuidance, getPriceBuilderSnapshot, getRoundedPercentValue } from './productPricing';

const toneClasses = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  warning: 'border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05]',
  danger: 'border-red-200 bg-red-50 text-red-600',
  success: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]',
};

const toneIcons = {
  neutral: Info,
  warning: AlertTriangle,
  danger: OctagonAlert,
  success: CheckCircle2,
};

export function ProductMarginGuidance({
  form,
  t,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
}) {
  const guidance = getMarginGuidance(form);
  const Icon = toneIcons[guidance.tone];
  const { actualMargin } = getPriceBuilderSnapshot(form);

  return (
    <div className={cn('rounded-lg border px-4 py-3', toneClasses[guidance.tone])}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-black">{t.marginGuidance.title(getRoundedPercentValue(actualMargin))}</p>
          <p className="mt-1 text-sm font-semibold leading-5">{t.marginGuidance.messages[guidance.labelKey]}</p>
        </div>
      </div>
    </div>
  );
}
