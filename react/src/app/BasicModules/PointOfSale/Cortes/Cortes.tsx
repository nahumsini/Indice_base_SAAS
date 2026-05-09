import { useState } from 'react';
import { Calendar, Printer, Download, DollarSign, TrendingUp, TrendingDown, Users, Package, CreditCard } from 'lucide-react';
import { mockCorteData } from './data/corte.mock';
import { CorteData } from './types/corte.types';

export default function Cortes() {
  const [corteData] = useState<CorteData>(mockCorteData);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    console.log('Descargar corte');
    // TODO: Implement PDF download
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

      {/* Corte Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CORTE</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Corte del Administrador De La Tienda iniciado el {formatDate(corteData.fecha)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              De {formatDate(corteData.fecha)} 9:43 p.m. a {formatDate(corteData.fecha)} 11:28 p.m. (Turno Actual)
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
