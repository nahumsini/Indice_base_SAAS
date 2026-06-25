import { AlertTriangle, BadgeDollarSign, Banknote, CheckCircle2, Gauge, ReceiptText } from 'lucide-react';
import { OperationalKpiArea } from '../../../shared/operational/OperationalKpiArea';
import type { CortesAnalytics } from '../utils/cortesUtils';
import { formatCurrency } from '../utils/cortesUtils';

interface CortesKpiAreaProps {
  analytics: CortesAnalytics;
}

export function CortesKpiArea({
  analytics,
}: CortesKpiAreaProps) {
  const hasDifference = analytics.shortCount > 0 || analytics.overCount > 0;
  const differenceLabel = analytics.convertedNetDifference > 0
    ? `Sobrante neto ${formatCurrency(analytics.convertedNetDifference, analytics.preferredCurrency)}`
    : analytics.convertedNetDifference < 0
    ? `Faltante neto ${formatCurrency(Math.abs(analytics.convertedNetDifference), analytics.preferredCurrency)}`
    : 'Sin diferencia neta';

  const insight = analytics.closingCount === 0
    ? 'No hay cortes en el periodo filtrado; cierra un turno desde Venta para alimentar el historial.'
    : hasDifference
    ? `${analytics.shortCount + analytics.overCount} corte(s) requieren revision antes de cerrar el control operativo.`
    : `${analytics.closingCount} corte(s) balanceados en el periodo; el efectivo contado coincide con lo esperado.`;
  const currencyInsight = analytics.hasMultipleSalesCurrencies
    ? `Cobrado en ${analytics.totalSalesLabel}; equivalente ${analytics.convertedSalesLabel} en ${analytics.preferredCurrency}.`
    : `Cobrado ${analytics.totalSalesLabel}; divisa preferida ${analytics.preferredCurrency}.`;

  return (
    <OperationalKpiArea
      metrics={[
        {
          id: 'sales',
          icon: <BadgeDollarSign className="h-4 w-4" />,
          iconClassName: 'text-[#FF6B5E]',
          label: `ventas en ${analytics.preferredCurrency}`,
          value: analytics.convertedSalesLabel,
          valueClassName: 'text-[#FF6B5E]',
        },
        {
          id: 'closings',
          icon: <ReceiptText className="h-4 w-4" />,
          label: 'cortes',
          value: analytics.closingCount,
        },
        {
          id: 'tickets',
          icon: <Gauge className="h-4 w-4" />,
          iconClassName: 'text-blue-600',
          label: 'tickets',
          value: analytics.totalTickets,
          valueClassName: 'text-blue-600',
        },
        {
          id: 'expected',
          icon: <Banknote className="h-4 w-4" />,
          iconClassName: 'text-emerald-600',
          label: `esperado ${analytics.preferredCurrency}`,
          value: formatCurrency(analytics.convertedExpectedCash, analytics.preferredCurrency),
          valueClassName: 'text-emerald-600',
        },
        {
          id: 'difference',
          icon: <AlertTriangle className="h-4 w-4" />,
          iconClassName: hasDifference ? 'text-amber-600' : 'text-emerald-600',
          label: `diferencia ${analytics.preferredCurrency}`,
          value: formatCurrency(analytics.convertedNetDifference, analytics.preferredCurrency),
          valueClassName: hasDifference ? 'text-amber-700' : 'text-emerald-600',
        },
      ]}
      alertChips={[
        ...(analytics.closingCount > 0 ? [{
          id: 'currency-breakdown',
          icon: <BadgeDollarSign className="h-3.5 w-3.5" />,
          label: analytics.totalSalesLabel,
          tone: 'info' as const,
        }] : []),
        ...(analytics.shortCount > 0 ? [{
          id: 'short',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: `${analytics.shortCount} faltante(s)`,
          tone: 'danger' as const,
        }] : []),
        ...(analytics.overCount > 0 ? [{
          id: 'over',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: `${analytics.overCount} sobrante(s)`,
          tone: 'warning' as const,
        }] : []),
        ...(analytics.balancedCount > 0 ? [{
          id: 'balanced',
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: `${analytics.balancedCount} cuadrado(s)`,
          tone: 'success' as const,
        }] : []),
      ]}
      distributionSegments={[
        {
          id: 'balanced',
          className: 'bg-emerald-500',
          count: analytics.balancedCount,
          label: 'Cuadrados',
        },
        {
          id: 'over',
          className: 'bg-[#F4C84A]',
          count: analytics.overCount,
          label: 'Sobrantes',
        },
        {
          id: 'short',
          className: 'bg-rose-500',
          count: analytics.shortCount,
          label: 'Faltantes',
        },
      ]}
      insight={analytics.closingCount > 0 ? `${insight} ${differenceLabel}. ${currencyInsight}` : insight}
      insightIcon={<AlertTriangle className="h-5 w-5" />}
    />
  );
}
