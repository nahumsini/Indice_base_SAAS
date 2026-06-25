import { AlertTriangle, Banknote, CreditCard, Download, Printer, ReceiptText, TrendingDown, TrendingUp, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PosCashClosingDetailResponse } from '../types/cashClosingHistory.types';
import { formatCurrency, formatDateTime, getPaymentTotal, toNumber } from '../utils/cortesUtils';

interface CorteDetailModalProps {
  detail: PosCashClosingDetailResponse | null;
  error: string;
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

export function CorteDetailModal({
  detail,
  error,
  loading,
  open,
  onClose,
  onDownload,
  onPrint,
}: CorteDetailModalProps) {
  if (!open) {
    return null;
  }

  const currencyCode = detail?.shift?.currencyCode ?? 'MXN';
  const difference = toNumber(detail?.overShortAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 bg-[#FF6B5E] px-7 py-6 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-1 text-3xl leading-none">💰</span>
            <div className="min-w-0">
              <h3 className="text-3xl font-black">Detalle de corte</h3>
              <p className="mt-1 text-sm font-semibold text-white/85">
                {detail ? `COR-${detail.id} · ${formatDateTime(detail.closedAt)}` : 'Cargando informacion del cierre'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto bg-slate-50 p-7 dark:bg-slate-950">
          {loading ? (
            <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-black text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              Cargando detalle real del corte...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-5">
              <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B63B32] dark:text-[#FFB0AA]">Corte operativo</p>
                      <h4 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        Caja {detail.cashRegister?.name ?? detail.cashRegisterId}
                      </h4>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        Almacén {detail.warehouseId} · Turno {detail.shiftId} · Usuario {detail.closedByUserId}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                      difference === 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
                    }`}>
                      {difference === 0 ? 'Cuadrado' : 'Con diferencia'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <InfoTile label="Apertura" value={formatDateTime(detail.shift?.openedAt)} />
                    <InfoTile label="Cierre" value={formatDateTime(detail.closedAt)} />
                    <InfoTile label="Moneda" value={currencyCode} />
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 p-5 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B63B32] dark:text-[#FFB0AA]">Resumen</p>
                  <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">
                    {formatCurrency(toNumber(detail.totalSalesAmount), currencyCode)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {detail.ticketsCount} ticket(s) procesado(s)
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={<Banknote className="h-5 w-5" />} label="Efectivo esperado" value={formatCurrency(toNumber(detail.expectedCashAmount), currencyCode)} />
                <MetricCard icon={<Banknote className="h-5 w-5" />} label="Efectivo contado" value={formatCurrency(toNumber(detail.countedCashAmount), currencyCode)} />
                <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Diferencia" value={`${difference > 0 ? '+' : ''}${formatCurrency(difference, currencyCode)}`} tone={difference === 0 ? 'success' : 'warning'} />
                <MetricCard icon={<ReceiptText className="h-5 w-5" />} label="Devoluciones" value={formatCurrency(toNumber(detail.totalRefundsAmount), currencyCode)} />
              </section>

              <section className="grid gap-5 lg:grid-cols-2">
                <DetailSection icon={<CreditCard className="h-5 w-5" />} title="Métodos de pago">
                  <LineItem label="Efectivo" value={formatCurrency(getPaymentTotal(detail, 'CASH'), currencyCode)} />
                  <LineItem label="Tarjeta" value={formatCurrency(getPaymentTotal(detail, 'CARD'), currencyCode)} />
                  <LineItem label="Transferencia" value={formatCurrency(getPaymentTotal(detail, 'TRANSFER'), currencyCode)} />
                  <LineItem label="Wallet / vales" value={formatCurrency(getPaymentTotal(detail, 'WALLET'), currencyCode)} />
                </DetailSection>

                <DetailSection icon={<TrendingUp className="h-5 w-5" />} title="Movimientos de efectivo">
                  <LineItem label="Apertura" value={formatCurrency(toNumber(detail.openingCashAmount), currencyCode)} />
                  <LineItem label="Ventas efectivo" value={formatCurrency(toNumber(detail.cashSalesAmount), currencyCode)} />
                  <LineItem label="Entradas" value={formatCurrency(toNumber(detail.cashInAmount), currencyCode)} />
                  <LineItem label="Correcciones" value={formatCurrency(toNumber(detail.correctionAmount), currencyCode)} />
                </DetailSection>

                <DetailSection icon={<TrendingDown className="h-5 w-5" />} title="Salidas y retiros">
                  <LineItem label="Salidas" value={formatCurrency(toNumber(detail.cashOutAmount), currencyCode)} />
                  <LineItem label="Retiros a caja fuerte" value={formatCurrency(toNumber(detail.safeDropAmount), currencyCode)} />
                  <LineItem label="Diferencia operativa" value={formatCurrency(difference, currencyCode)} />
                </DetailSection>

                <DetailSection icon={<ReceiptText className="h-5 w-5" />} title="Bitácora">
                  <LineItem label="Caja" value={detail.cashRegister?.code ?? `Caja ${detail.cashRegisterId}`} />
                  <LineItem label="Unidad" value={detail.unitId ? `Unidad ${detail.unitId}` : 'Sin unidad registrada'} />
                  <LineItem label="Negocio" value={detail.businessId ? `Negocio ${detail.businessId}` : 'Sin negocio registrado'} />
                  <LineItem label="Notas" value={detail.notes || 'Sin notas'} />
                </DetailSection>
              </section>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-[#FF6B5E] px-7 py-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/35 px-5 text-sm font-black text-white transition hover:bg-white/10"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#B63B32] shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  tone = 'neutral',
  value,
}: {
  icon: ReactNode;
  label: string;
  tone?: 'neutral' | 'success' | 'warning';
  value: string;
}) {
  const toneClass = tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    : tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
    : 'border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <div className={`rounded-[20px] border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
        {icon}
        <p className="text-xs font-black uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-black">{value}</p>
    </div>
  );
}

function DetailSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 text-[#FF6B5E]">
        {icon}
        <h4 className="text-lg font-black text-slate-950 dark:text-white">{title}</h4>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 dark:border-slate-700">
      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right text-sm font-black text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}
