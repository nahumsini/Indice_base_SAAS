import { useMemo, useState } from 'react';
import { Barcode, Shuffle } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import type { ProductsTranslations } from '../translations';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden rounded-xl border border-[#FF6B5E]/25 bg-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-[#FF6B5E]/15 bg-[#FF6B5E]/10 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
            <Barcode className="h-5 w-5 text-[#B63B32]" />
            {t.labelsGenerator.title}
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-slate-600">{t.labelsGenerator.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 p-6 md:grid-cols-[1fr_140px_140px]">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.labelsGenerator.prefix}</label>
            <Input className="h-11 border-slate-200 bg-white font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" value={prefix} onChange={(event) => setPrefix(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.labelsGenerator.quantity}</label>
            <Input className="h-11 border-slate-200 bg-white font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" type="number" min={1} max={50} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.labelsGenerator.digits}</label>
            <Input className="h-11 border-slate-200 bg-white font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" type="number" min={4} max={14} value={digits} onChange={(event) => setDigits(event.target.value)} />
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-5">
          {labels.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
              {t.labelsGenerator.empty}
            </div>
          ) : (
            <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {labels.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleApply(label)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-black text-slate-900 transition hover:border-[#FF6B5E]/40 hover:bg-[#FF6B5E]/10"
                >
                  <span>{label}</span>
                  <Barcode className="h-4 w-4 text-[#B63B32]" />
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#FF6B5E]/20 bg-[#FF6B5E] px-6 py-4">
          <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button className="bg-white text-[#B63B32] hover:bg-white/90" onClick={handleGenerate}>
            <Shuffle className="h-4 w-4" />
            {t.labelsGenerator.generate}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

