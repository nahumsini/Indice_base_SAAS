import { X, Lightbulb, Package, Receipt, RotateCcw, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';
import type { Product } from '../../shared/commercial/products';
import type { Payment, SaleItem } from '../types/sale.types';

export type SaleSidePanelState =
  | {
      type: 'product';
      product: Product;
    }
  | {
      type: 'sale';
      cart: SaleItem[];
      payments: Payment[];
      totals: {
        subtotal: number;
        tax: number;
        total: number;
        paid: number;
        remaining: number;
        change: number;
        isPaid: boolean;
      };
      cashierName: string;
    };

function paymentLabel(method: Payment['method']) {
  if (method === 'cash') return 'Efectivo';
  if (method === 'card') return 'Tarjeta';
  return 'Transferencia';
}

export function SaleSidePanel({
  panel,
  onClose,
  formatCurrency,
}: {
  panel: SaleSidePanelState | null;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
}) {
  if (!panel) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[140]">
      <button
        type="button"
        className="absolute inset-0 bg-gray-950/20"
        onClick={onClose}
        aria-label="Cerrar panel lateral"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between border-b border-gray-200 bg-blue-700 px-5 py-4 text-white dark:border-gray-700">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-100">
              Panel de decision
            </p>
            <h2 className="mt-1 text-lg font-bold">
              {panel.type === 'product' ? panel.product.name : 'Control de ticket'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label="Cerrar panel lateral"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {panel.type === 'product' ? (
            <ProductPanel product={panel.product} formatCurrency={formatCurrency} />
          ) : (
            <SalePanel panel={panel} formatCurrency={formatCurrency} />
          )}
        </div>
      </aside>
    </div>
  );
}

function ProductPanel({
  product,
  formatCurrency,
}: {
  product: Product;
  formatCurrency: (amount: number) => string;
}) {
  const marginAmount = product.salePrice - product.costPrice;
  const marginRate = product.salePrice > 0 ? Math.round((marginAmount / product.salePrice) * 100) : 0;
  const isCritical = product.useInventory && product.currentStock <= product.minStock;
  const recommendedAction = isCritical
    ? 'Genera una orden de compra antes del siguiente pico. Este producto ya esta en limite de control.'
    : 'Mantenlo en productos rapidos y monitorea margen durante el turno actual.';

  return (
    <div className="space-y-5">
      <DecisionRecommendation
        tone={isCritical ? 'risk' : 'opportunity'}
        title="Accion recomendada"
        description={recommendedAction}
      />

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Stock actual" value={String(product.currentStock)} tone={isCritical ? 'danger' : 'neutral'} />
        <Metric label="Margen" value={`${marginRate}%`} tone="success" />
        <Metric label="Ventas hoy" value="18 uds" tone="info" />
        <Metric label="Precio" value={formatCurrency(product.salePrice)} tone="neutral" />
      </div>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Señal de inventario</h3>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, Math.max(6, (product.currentStock / product.maxStock) * 100))}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Minimo {product.minStock} · Maximo {product.maxStock}
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Historial comercial</h3>
        </div>
        <div className="mt-3 space-y-3 text-sm">
          <TimelineItem title="Precio actualizado" description={`${formatCurrency(product.salePrice)} como precio activo`} />
          <TimelineItem title="Movimiento de stock" description="12 unidades recibidas de proveedor" />
          <TimelineItem title="Promocion revisada" description="Elegible para descuento por paquete esta semana" />
        </div>
      </section>
    </div>
  );
}

function SalePanel({
  panel,
  formatCurrency,
}: {
  panel: Extract<SaleSidePanelState, { type: 'sale' }>;
  formatCurrency: (amount: number) => string;
}) {
  const itemCount = panel.cart.reduce((sum, item) => sum + item.quantity, 0);
  const recommendation = panel.cart.length === 0
    ? 'Escanea un producto o recupera un ticket pausado para mantener la caja activa.'
    : panel.totals.isPaid
    ? 'Completa la venta y despues imprime o envia el ticket.'
    : 'Cobra el saldo pendiente o pausa este ticket antes de atender al siguiente cliente.';

  return (
    <div className="space-y-5">
      <DecisionRecommendation
        tone={panel.totals.isPaid ? 'opportunity' : 'control'}
        title="Accion recomendada"
        description={recommendation}
      />

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Articulos" value={String(itemCount)} tone="neutral" />
        <Metric label="Pagado" value={formatCurrency(panel.totals.paid)} tone={panel.totals.isPaid ? 'success' : 'warning'} />
        <Metric label="Total" value={formatCurrency(panel.totals.total)} tone="info" />
        <Metric label="Pendiente" value={formatCurrency(Math.max(0, panel.totals.remaining))} tone={panel.totals.isPaid ? 'success' : 'warning'} />
      </div>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Productos</h3>
        </div>
        <div className="mt-3 space-y-2">
          {panel.cart.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay productos en el ticket actual.</p>
          ) : (
            panel.cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">x{item.quantity} · {formatCurrency(item.price)}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pagos</h3>
        </div>
        <div className="mt-3 space-y-2">
          {panel.payments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aun no hay pagos agregados.</p>
          ) : (
            panel.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{paymentLabel(payment.method)}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Linea de tiempo</h3>
        </div>
        <div className="mt-3 space-y-3 text-sm">
          <TimelineItem title="Ticket abierto" description={`Cajero: ${panel.cashierName}`} />
          <TimelineItem title="Productos escaneados" description={`${panel.cart.length} linea${panel.cart.length === 1 ? '' : 's'} de venta activa${panel.cart.length === 1 ? '' : 's'}`} />
          <TimelineItem title="Estado de pago" description={panel.totals.isPaid ? 'Listo para completar venta' : 'Esperando pago'} />
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const toneClass = {
    neutral: 'text-gray-900 dark:text-white',
    success: 'text-emerald-600 dark:text-emerald-300',
    warning: 'text-amber-600 dark:text-amber-300',
    danger: 'text-red-600 dark:text-red-300',
    info: 'text-blue-600 dark:text-blue-300',
  }[tone];

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function DecisionRecommendation({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: 'control' | 'risk' | 'opportunity';
}) {
  const toneClass = {
    control: {
      shell: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
      icon: 'bg-blue-600 text-white',
      text: 'text-blue-900 dark:text-blue-100',
      Icon: ShieldCheck,
    },
    risk: {
      shell: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
      icon: 'bg-red-600 text-white',
      text: 'text-red-900 dark:text-red-100',
      Icon: Package,
    },
    opportunity: {
      shell: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
      icon: 'bg-emerald-600 text-white',
      text: 'text-emerald-900 dark:text-emerald-100',
      Icon: Lightbulb,
    },
  }[tone];
  const Icon = toneClass.Icon;

  return (
    <section className={`rounded-lg border p-4 ${toneClass.shell}`}>
      <div className="flex gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className={`text-sm font-bold ${toneClass.text}`}>{title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      </div>
    </section>
  );
}

function TimelineItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-l-2 border-blue-200 pl-3 dark:border-blue-800">
      <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
