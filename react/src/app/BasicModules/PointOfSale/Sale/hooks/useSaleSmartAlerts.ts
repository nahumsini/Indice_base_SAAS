import { useMemo } from 'react';
import type { Product } from '../../Productos/types/product.types';
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
        title: 'Product out of stock',
        description: `${outOfStockProducts[0].name} cannot be sold without override.`,
        tone: 'critical',
        actionLabel: 'Open decision panel',
        onAction: () => onOpenProductPanel(outOfStockProducts[0]),
      });
    }

    if (lowStockProducts.length > 0) {
      alerts.push({
        id: 'low-stock',
        category: 'Risk',
        title: 'Critical stock',
        description: `${lowStockProducts.length} product${lowStockProducts.length === 1 ? '' : 's'} need replenishment.`,
        tone: 'warning',
        actionLabel: 'Open decision panel',
        onAction: () => onOpenProductPanel(lowStockProducts[0]),
      });
    }

    if (topProduct) {
      alerts.push({
        id: 'top-product',
        category: 'Opportunity',
        title: 'Top seller detected',
        description: `${topProduct.name} is moving faster than usual.`,
        tone: 'hot',
        actionLabel: 'Open decision panel',
        onAction: () => onOpenProductPanel(topProduct),
      });
    }

    if (currentShift && currentShift.totalSales > 0) {
      alerts.push({
        id: 'sales-trend',
        category: 'Opportunity',
        title: 'Sales trend up',
        description: 'Current shift is pacing above the usual morning baseline.',
        tone: 'success',
      });
    }

    if (suspendedSalesCount > 0) {
      alerts.push({
        id: 'suspended-sales',
        category: 'Control',
        title: 'Open tickets waiting',
        description: `${suspendedSalesCount} suspended sale${suspendedSalesCount === 1 ? '' : 's'} need follow-up.`,
        tone: 'info',
      });
    }

    return alerts.slice(0, 4);
  }, [currentShift, onOpenProductPanel, stockSignals, suspendedSalesCount]);
}

