import { useMemo, useState } from 'react';
import { Calendar, Printer, Download, DollarSign, TrendingUp, TrendingDown, Users, Package, CreditCard } from 'lucide-react';
import { useCashClosingHistory } from './hooks/useCashClosingHistory';
import type { PosCashClosingDetailResponse, PosCashClosingPaymentMethod } from './types/cashClosingHistory.types';
import { CorteData } from './types/corte.types';

const toLocalInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const fromInputDate = (date: string) => new Date(`${date}T00:00:00`);

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

const sum = (
  records: PosCashClosingDetailResponse[],
  selector: (record: PosCashClosingDetailResponse) => number,
) => (
  records.reduce((total, record) => total + selector(record), 0)
);

const paymentTotal = (record: PosCashClosingDetailResponse, method: PosCashClosingPaymentMethod) => (
  record.paymentsSummary
    .filter((payment) => payment.paymentMethod === method)
    .reduce((total, payment) => total + toNumber(payment.amount), 0)
);

const buildCorteData = (records: PosCashClosingDetailResponse[], selectedDate: string): CorteData => {
  const totalSales = sum(records, (record) => toNumber(record.totalSalesAmount));
  const cashSales = sum(records, (record) => toNumber(record.cashSalesAmount));
  const cardSales = sum(records, (record) => paymentTotal(record, 'CARD'));
  const transferSales = sum(records, (record) => paymentTotal(record, 'TRANSFER'));
  const positiveMovements = sum(records, (record) => (
    toNumber(record.cashInAmount) + Math.max(toNumber(record.correctionAmount), 0)
  ));
  const negativeMovements = sum(records, (record) => (
    toNumber(record.cashOutAmount) + toNumber(record.safeDropAmount) + Math.abs(Math.min(toNumber(record.correctionAmount), 0))
  ));
  const taxSales = 0;
  const subtotalSales = totalSales;

  return {
    fecha: fromInputDate(selectedDate),
    ventasTotales: totalSales,
    dineroEnCaja: sum(records, (record) => toNumber(record.countedCashAmount)),
    ventasEfectivoVales: cashSales,
    ventasTarjetas: cardSales,
    efectivo: sum(records, (record) => toNumber(record.countedCashAmount)),
    tarjetas: cardSales,
    ventasEnEfectivo: cashSales,
    entradasEfectivo: positiveMovements,
    ventasPorDepartamento: records.map((record) => ({
      departamento: `${record.cashRegister?.name ?? `Caja ${record.cashRegisterId}`} · Almacen ${record.warehouseId}`,
      monto: toNumber(record.totalSalesAmount),
    })),
    impuestos: [
      {
        tipo: 'Impuestos registrados',
        tasa: 0,
        monto: taxSales,
      },
    ],
    ventasSinImpuestos: subtotalSales,
    egresos: negativeMovements,
    costoTotalArticulos: 0,
    descuentos: 0,
    conTransferencia: transferSales,
    otrosValesDespensa: sum(records, (record) => paymentTotal(record, 'WALLET')),
    conCheque: 0,
    devolucionesVentas: sum(records, (record) => toNumber(record.totalRefundsAmount)),
    gananciaTotal: 0,
    ventasEfectivoContado: cashSales,
    ventasTransferencia: transferSales,
    ventasCheque: 0,
    salidasEfectivo: negativeMovements,
    pagoProveedores: negativeMovements,
    pagosCreditos: 0,
    clientesMasVentas: [],
    clientesMasGanancia: [],
  };
};

export default function Cortes() {
  const [selectedDate, setSelectedDate] = useState<string>(
    toLocalInputDate(new Date())
  );
  const [notice, setNotice] = useState('');
  const {
    details: cashClosings,
    selectedDetail,
    loading,
    error,
    detailLoading,
    detailError,
    totalCount,
    limit,
    offset,
    refresh,
    selectDetail,
  } = useCashClosingHistory({
    dateFrom: selectedDate,
    dateTo: selectedDate,
    limit: 50,
    offset: 0,
  });

  const dailyClosings = cashClosings;

  const corteData = useMemo<CorteData>(() => (
    buildCorteData(dailyClosings, selectedDate)
  ), [dailyClosings, selectedDate]);

  const currencyCode = selectedDetail?.shift?.currencyCode ?? dailyClosings[0]?.shift?.currencyCode ?? 'MXN';

  const formatCurrency = (amount: number, currency = currencyCode) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return 'Sin registro';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    setNotice('La descarga de corte queda preparada para conectar el PDF operativo del arqueo.');
  };

  const handleRefresh = () => {
    refresh();
    setNotice('Cortes actualizados desde el historial real del punto de venta.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            💰 Corte de Caja
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Resumen de ventas y movimientos del día
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Calendar className="w-4 h-4" />
            {loading ? 'Cargando' : 'Actualizar'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Descargar
          </button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          Cargando historial real de cortes...
        </div>
      )}

      {!loading && !error && dailyClosings.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          No hay cierres reales para este dia. Cierra un turno desde Ventas para alimentar el corte.
        </div>
      )}

      {/* Corte Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CORTE</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Corte operativo con {dailyClosings.length} cierre{dailyClosings.length === 1 ? '' : 's'} guardado{dailyClosings.length === 1 ? '' : 's'} el {formatDate(corteData.fecha)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              La informacion se alimenta desde los arqueos cerrados en punto de venta.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              + Hacer corte de caja
            </button>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              + Abrir turno del día
            </button>
          </div>
        </div>

        {dailyClosings.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Cierres reales del dia</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mostrando {dailyClosings.length} de {totalCount} corte{totalCount === 1 ? '' : 's'} · limite {limit} · offset {offset}
                </p>
              </div>
              {detailLoading && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">Cargando detalle...</span>
              )}
            </div>

            {detailError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {detailError}
              </div>
            )}

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {dailyClosings.map((closing) => {
                const selected = selectedDetail?.id === closing.id;

                return (
                  <button
                    key={closing.id}
                    type="button"
                    onClick={() => selectDetail(closing.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      selected
                        ? 'border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-500/50 dark:bg-orange-500/10 dark:text-orange-100'
                        : 'border-gray-200 bg-white text-gray-900 hover:border-orange-200 hover:bg-orange-50/60 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">
                          {closing.cashRegister?.name ?? `Caja ${closing.cashRegisterId}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Turno {closing.shiftId} · {formatDateTime(closing.closedAt)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                        toNumber(closing.overShortAmount) === 0
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
                      }`}>
                        {toNumber(closing.overShortAmount) === 0 ? 'Cuadrado' : 'Diferencia'}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <span>
                        <strong className="block text-gray-500 dark:text-gray-400">Total</strong>
                        {formatCurrency(toNumber(closing.totalSalesAmount), closing.shift?.currencyCode ?? currencyCode)}
                      </span>
                      <span>
                        <strong className="block text-gray-500 dark:text-gray-400">Tickets</strong>
                        {closing.ticketsCount}
                      </span>
                      <span>
                        <strong className="block text-gray-500 dark:text-gray-400">Dif.</strong>
                        {formatCurrency(toNumber(closing.overShortAmount), closing.shift?.currencyCode ?? currencyCode)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedDetail && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Detalle del corte seleccionado</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Caja {selectedDetail.cashRegister?.code ?? selectedDetail.cashRegisterId} · Almacen {selectedDetail.warehouseId} · Cerrado {formatDateTime(selectedDetail.closedAt)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Usuario {selectedDetail.closedByUserId}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {[
                    ['Apertura', selectedDetail.openingCashAmount],
                    ['Ventas efectivo', selectedDetail.cashSalesAmount],
                    ['Entradas', selectedDetail.cashInAmount],
                    ['Salidas', selectedDetail.cashOutAmount],
                    ['Retiros', selectedDetail.safeDropAmount],
                    ['Correcciones', selectedDetail.correctionAmount],
                    ['Esperado', selectedDetail.expectedCashAmount],
                    ['Contado', selectedDetail.countedCashAmount],
                    ['Diferencia', selectedDetail.overShortAmount],
                    ['Ventas totales', selectedDetail.totalSalesAmount],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(toNumber(value), selectedDetail.shift?.currencyCode ?? currencyCode)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Pagos por metodo
                    </p>
                    <div className="mt-2 space-y-2 text-sm">
                      {selectedDetail.paymentsSummary.length > 0 ? (
                        selectedDetail.paymentsSummary.map((payment) => (
                          <div key={payment.paymentMethod} className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">{payment.paymentMethod} · {payment.count}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(toNumber(payment.amount), selectedDetail.shift?.currencyCode ?? currencyCode)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">Sin pagos registrados en el cierre.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Operacion
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="block text-gray-500 dark:text-gray-400">Tickets</span>
                        <strong className="text-gray-900 dark:text-white">{selectedDetail.ticketsCount}</strong>
                      </div>
                      <div>
                        <span className="block text-gray-500 dark:text-gray-400">Devoluciones</span>
                        <strong className="text-gray-900 dark:text-white">
                          {formatCurrency(toNumber(selectedDetail.totalRefundsAmount), selectedDetail.shift?.currencyCode ?? currencyCode)}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-gray-500 dark:text-gray-400">Notas</span>
                        <strong className="text-gray-900 dark:text-white">{selectedDetail.notes || 'Sin notas'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Totals */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Ventas Totales</h4>
            </div>
            <p className="text-4xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(corteData.ventasTotales)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Dinero en Caja</h4>
            </div>
            <p className="text-4xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(corteData.dineroEnCaja)}
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Desglose de Ventas */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Desglose de Ventas
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ventas en Efectivo y Vales</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.ventasEfectivoVales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ventas en tarjetas</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.ventasTarjetas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Efectivo</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.efectivo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tarjetas</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.tarjetas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ventas en efectivo</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.ventasEnEfectivo)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(corteData.dineroEnCaja)}</span>
                </div>
              </div>
            </div>

            {/* Entradas de efectivo */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Entradas de efectivo
                </h4>
              </div>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Si 17 am: Entrada De Dinero $</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(corteData.entradasEfectivo)}</span>
                </div>
              </div>
            </div>

            {/* Ventas por Departamento */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ventas por Departamento
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                {corteData.ventasPorDepartamento.map((dept, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{dept.departamento}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(dept.monto)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Impuestos */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Impuestos
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                {corteData.impuestos.map((imp, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{imp.tipo}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(imp.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Ganancia */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ganancia
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ventas</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.ventasSinImpuestos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Egresos</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(corteData.egresos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Costo Total de Artículos</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(corteData.costoTotalArticulos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Descuentos de Ventas</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">-{formatCurrency(corteData.descuentos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Devoluciones de Ventas</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.devolucionesVentas)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-purple-300 dark:border-purple-700">
                  <span className="font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-2xl text-purple-700 dark:text-purple-400">{formatCurrency(corteData.gananciaTotal)}</span>
                </div>
              </div>
            </div>

            {/* Ingresos de contado */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Ingresos de contado
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ventas en Efectivo</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.ventasEfectivoContado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ventas por Transferencia</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.ventasTransferencia)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ventas con Cheque</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(corteData.ventasCheque)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(corteData.ventasEfectivoContado + corteData.ventasTransferencia + corteData.ventasCheque)}
                  </span>
                </div>
              </div>
            </div>

            {/* Salidas de Efectivo */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Salidas de Efectivo
                </h4>
              </div>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Si se hace Pago a Proveedor</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(corteData.pagoProveedores)}</span>
                </div>
              </div>
            </div>

            {/* Pagos de Créditos */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Pagos de Créditos
                </h4>
              </div>
              <div className="text-sm text-center text-gray-500 dark:text-gray-400 py-2">
                No se realizaron pagos de créditos
              </div>
            </div>

            {/* Clientes con más ventas */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Clientes con más ventas
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                {corteData.clientesMasVentas.map((cliente, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      {cliente.nombre}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(cliente.ventas || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clientes con más ganancia */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Clientes con más ganancia
                </h4>
              </div>
              <div className="space-y-2 text-sm">
                {corteData.clientesMasGanancia.map((cliente, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-green-600 dark:text-green-400 hover:underline cursor-pointer">
                      {cliente.nombre}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(cliente.ganancia || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
