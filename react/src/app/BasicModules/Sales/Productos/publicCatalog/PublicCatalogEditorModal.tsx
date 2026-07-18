import { Globe2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
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
  units: Array<{ id: number; name: string }>;
  businesses: Array<{ id: number; unitId: number; name: string }>;
  t: ProductsTranslations;
  saving?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<PublicCatalogConfig>) => void;
  onSave: () => void;
};

export function PublicCatalogEditorModal({
  catalog,
  mode,
  products,
  units,
  businesses,
  t,
  saving = false,
  error = '',
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
            disabled={!catalog || saving}
            onClick={onSave}
          >
            {saving ? t.publicCatalog.saving : t.publicCatalog.saveCatalog}
          </Button>
        </>
      )}
    >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          {error ? <div role="alert" className="m-4 mb-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}
          <PublicCatalogEditor
            catalog={catalog}
            products={products}
            units={units}
            businesses={businesses}
            t={t}
            onChange={onChange}
          />
        </div>
    </SalesModalFrame>
  );
}
