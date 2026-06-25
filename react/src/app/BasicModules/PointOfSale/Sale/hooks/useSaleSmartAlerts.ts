import { useMemo } from 'react';
import type { Product } from '../../shared/commercial/products';
import type { SmartAlert } from '../components/SmartAlertsStrip';
import type { Shift } from '../types/shift.types';
import type { StockSignals } from '../utils/saleCatalog';

interface UseSaleSmartAlertsOptions {
  currentShift: Shift | null;
  stockSignals: StockSignals;
  suspendedSalesCount: number;
  onOpenProductPanel: (product: Product) => void;
}

export function useSaleSmartAlerts({
  currentShift,
  stockSignals,
  suspendedSalesCount,
  onOpenProductPanel,
}: UseSaleSmartAlertsOptions) {
  return useMemo<SmartAlert[]>(() => {
    const { lowStockProducts, outOfStockProducts, topProduct } = stockSignals;
    const alerts: SmartAlert[] = [];

    if (outOfStockProducts.length > 0) {
      alerts.push({
        id: 'out-of-stock',
        category: 'Risk',
        title: 'Producto agotado',
        description: `${outOfStockProducts[0].name} no puede venderse sin autorizacion.`,
        tone: 'critical',
        actionLabel: 'Abrir panel',
        onAction: () => onOpenProductPanel(outOfStockProducts[0]),
      });
    }

    if (lowStockProducts.length > 0) {
      alerts.push({
        id: 'low-stock',
        category: 'Risk',
        title: 'Stock critico',
        description: `${lowStockProducts.length} producto${lowStockProducts.length === 1 ? '' : 's'} requiere${lowStockProducts.length === 1 ? '' : 'n'} reposicion.`,
        tone: 'warning',
        actionLabel: 'Abrir panel',
        onAction: () => onOpenProductPanel(lowStockProducts[0]),
      });
    }

    if (topProduct) {
      alerts.push({
        id: 'top-product',
        category: 'Opportunity',
        title: 'Producto con alta rotacion',
        description: `${topProduct.name} se esta vendiendo mas rapido de lo habitual.`,
        tone: 'hot',
        actionLabel: 'Abrir panel',
        onAction: () => onOpenProductPanel(topProduct),
      });
    }

    if (currentShift && currentShift.totalSales > 0) {
      alerts.push({
        id: 'sales-trend',
        category: 'Opportunity',
        title: 'Ritmo de venta arriba',
        description: 'El turno avanza por encima de la linea base de la mañana.',
        tone: 'success',
      });
    }

    if (suspendedSalesCount > 0) {
      alerts.push({
        id: 'suspended-sales',
        category: 'Control',
        title: 'Tickets pausados',
        description: `${suspendedSalesCount} venta${suspendedSalesCount === 1 ? '' : 's'} pausada${suspendedSalesCount === 1 ? '' : 's'} requiere${suspendedSalesCount === 1 ? '' : 'n'} seguimiento.`,
        tone: 'info',
      });
    }

    return alerts.slice(0, 4);
  }, [currentShift, onOpenProductPanel, stockSignals, suspendedSalesCount]);
}
