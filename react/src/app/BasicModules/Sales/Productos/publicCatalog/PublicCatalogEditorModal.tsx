import { Globe2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { PublicCatalogEditor } from './PublicCatalogEditor';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

type PublicCatalogEditorMode = 'create' | 'edit';
const editorActionClassNames = getSalesModalActionClassNames('coral');

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
    <SalesModalFrame
      open={Boolean(catalog)}
      onOpenChange={onOpenChange}
      title={title}
      description={t.publicCatalog.configDescription}
      icon={<Globe2 className="h-6 w-6" />}
      contentClassName="flex max-h-[84vh] w-[calc(100vw-4rem)] max-w-[980px] flex-col sm:max-w-[980px]"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-hidden bg-white p-0"
      footer={(
        <>
          <Button type="button" variant="outline" className={editorActionClassNames.secondary} onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            className={editorActionClassNames.primary}
            disabled={!catalog}
            onClick={onSave}
          >
            {t.publicCatalog.saveCatalog}
          </Button>
        </>
      )}
    >
        <div className="min-h-0 overflow-hidden bg-white">
          <PublicCatalogEditor catalog={catalog} products={products} t={t} onChange={onChange} />
        </div>
    </SalesModalFrame>
  );
}
