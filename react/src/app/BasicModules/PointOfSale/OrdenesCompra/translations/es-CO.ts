import { esMX } from './es-MX';
import type { PurchaseOrderTranslations } from './types';

export const esCO = {
  ...esMX,
  common: { ...esMX.common, warehouse: 'Bodega' },
  header: {
    ...esMX.header,
    subtitle: 'Ordena faltantes al proveedor, recibe mercancía en la bodega del POS y deja la factura lista para pago.',
  },
  filters: { ...esMX.filters, warehouse: 'Bodega', searchPlaceholder: 'Folio, proveedor o bodega' },
  detail: { ...esMX.detail, warehouse: 'Bodega' },
  create: { ...esMX.create, destinationWarehouse: 'Bodega destino' },
} as const satisfies PurchaseOrderTranslations;
