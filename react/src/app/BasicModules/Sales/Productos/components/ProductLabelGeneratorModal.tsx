import { useMemo, useState } from 'react';
import { Barcode, Shuffle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ProductsTranslations } from '../translations';

const labelActionClassNames = getSalesModalActionClassNames('coral');

function createRandomLabel(prefix: string, digits: number) {
  const max = 10 ** digits;
  const value = Math.floor(Math.random() * max).toString().padStart(digits, '0');
  return `${prefix}${value}`;
}

export function ProductLabelGeneratorModal({
  open,
  t,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onApply: (primaryLabel: string, labels: string[]) => void;
}) {
  const [prefix, setPrefix] = useState('IDX-');
  const [quantity, setQuantity] = useState('8');
  const [digits, setDigits] = useState('8');
  const [labels, setLabels] = useState<string[]>([]);

  const normalizedQuantity = useMemo(() => Math.min(Math.max(Number(quantity) || 1, 1), 50), [quantity]);
  const normalizedDigits = useMemo(() => Math.min(Math.max(Number(digits) || 6, 4), 14), [digits]);

  const handleGenerate = () => {
    const nextLabels = Array.from({ length: normalizedQuantity }, () => createRandomLabel(prefix, normalizedDigits));
    setLabels(nextLabels);
  };

  const handleApply = (label: string) => {
    onApply(label, labels.length > 0 ? labels : [label]);
    onOpenChange(false);
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={t.labelsGenerator.title}
      description={t.labelsGenerator.description}
      icon={<Barcode className="h-6 w-6" />}
      contentClassName="max-w-3xl"
      bodyClassName="!max-h-none bg-white p-0"
      footer={(
        <>
          <Button variant="outline" className={labelActionClassNames.secondary} onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button className={labelActionClassNames.primary} onClick={handleGenerate}>
            <Shuffle className="h-4 w-4" />
            {t.labelsGenerator.generate}
          </Button>
        </>
      )}
    >
        <div className="grid gap-4 p-6 md:grid-cols-[1fr_140px_140px]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t.labelsGenerator.prefix}</label>
            <Input className="h-11 border-slate-200 bg-white font-medium shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" value={prefix} onChange={(event) => setPrefix(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t.labelsGenerator.quantity}</label>
            <Input className="h-11 border-slate-200 bg-white font-medium shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" type="number" min={1} max={50} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{t.labelsGenerator.digits}</label>
            <Input className="h-11 border-slate-200 bg-white font-medium shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" type="number" min={4} max={14} value={digits} onChange={(event) => setDigits(event.target.value)} />
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-5">
          {labels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
              {t.labelsGenerator.empty}
            </div>
          ) : (
            <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {labels.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleApply(label)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/10"
                >
                  <span>{label}</span>
                  <Barcode className="h-4 w-4 text-[#B63B32]" />
                </button>
              ))}
            </div>
          )}
        </div>
    </SalesModalFrame>
  );
}
