import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { PublicCatalogEditor } from './PublicCatalogEditor';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

type PublicCatalogEditorMode = 'create' | 'edit';

type PublicCatalogEditorModalProps = {
  catalog: PublicCatalogConfig | null;
  mode: PublicCatalogEditorMode | null;
  products: SalesCatalogItem[];
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<PublicCatalogConfig>) => void;
  onSave: () => void;
};

export function PublicCatalogEditorModal({
  catalog,
  mode,
  products,
  t,
  onOpenChange,
  onChange,
  onSave,
}: PublicCatalogEditorModalProps) {
  const title = mode === 'create'
    ? t.publicCatalog.createPublicCatalog
    : t.publicCatalog.editPublicCatalog;

  return (
    <Dialog open={Boolean(catalog)} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[84vh] w-[calc(100vw-4rem)] max-w-[980px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border-slate-200 p-0 sm:max-w-[980px]">
        <DialogHeader className="border-b border-slate-200 bg-white px-5 py-4">
          <DialogTitle className="text-xl font-black text-slate-950">{title}</DialogTitle>
          <DialogDescription className="font-semibold text-slate-500">
            {t.publicCatalog.configDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-hidden bg-white">
          <PublicCatalogEditor catalog={catalog} products={products} t={t} onChange={onChange} />
        </div>

        <DialogFooter className="border-t border-slate-200 bg-white px-5 py-4">
          <Button type="button" variant="outline" className="rounded-lg" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-[#FF6B5E] text-white hover:bg-[#E85C50]"
            disabled={!catalog}
            onClick={onSave}
          >
            {t.publicCatalog.saveCatalog}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
