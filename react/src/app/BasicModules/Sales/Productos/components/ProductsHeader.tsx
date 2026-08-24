import {
  Columns3,
  FolderCog,
  Globe2,
  Sheet,
  Plus,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../../components/SalesTitleBar';
import type { ProductsTranslations } from '../translations';

type ProductsHeaderProps = {
  t: ProductsTranslations;
  onCreateProduct: () => void;
  onOpenBulkIntegration: () => void;
  onOpenCategoryManager: () => void;
  onOpenColumns: () => void;
  onOpenPublicCatalog: () => void;
};

export function ProductsHeader({
  t,
  onCreateProduct,
  onOpenBulkIntegration,
  onOpenCategoryManager,
  onOpenColumns,
  onOpenPublicCatalog,
}: ProductsHeaderProps) {
  return (
    <SalesTitleBar
      icon="📦"
      rhIndent
      title={t.header.title}
      subtitle={t.header.subtitle}
      actions={(
        <>
          <Button
            variant="outline"
            className={salesTitleBarSecondaryActionClassName}
            onClick={onOpenBulkIntegration}
          >
            <Sheet className="h-4 w-4" />
            Integración masiva
          </Button>
          <Button
            variant="outline"
            className={salesTitleBarSecondaryActionClassName}
            onClick={onOpenColumns}
          >
            <Columns3 className="h-4 w-4" />
            {t.header.columnsAction}
          </Button>
          <Button
            variant="outline"
            className={salesTitleBarSecondaryActionClassName}
            onClick={onOpenPublicCatalog}
          >
            <Globe2 className="h-4 w-4" />
            {t.publicCatalog.action}
          </Button>
          <Button
            variant="outline"
            className={salesTitleBarSecondaryActionClassName}
            onClick={onOpenCategoryManager}
          >
            <FolderCog className="h-4 w-4" />
            {t.header.categoryAction}
          </Button>
          <Button className={salesTitleBarPrimaryActionClassName} onClick={onCreateProduct}>
            <Plus className="h-4 w-4" />
            {t.header.primaryAction}
          </Button>
        </>
      )}
    />
  );
}
