import { useState, useMemo } from 'react';
import { mockTransfers } from './mocks/inventory.mock';
import type { Transfer, TransferStatus } from './types/inventory.types';
import {
  Plus,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  User,
  Calendar,
  Filter,
  ArrowRight,
} from 'lucide-react';

export default function TransferenciasTab() {
  const [transfers] = useState<Transfer[]>(mockTransfers);
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');

  const filteredTransfers = useMemo(() => {
    return transfers.filter(t => statusFilter === 'all' || t.status === statusFilter);
  }, [transfers, statusFilter]);

  const stats = useMemo(() => {
    return {
      pending: transfers.filter(t => t.status === 'pending').length,
      approved: transfers.filter(t => t.status === 'approved').length,
      inTransit: transfers.filter(t => t.status === 'in_transit').length,
      received: transfers.filter(t => t.status === 'received').length,
    };
  }, [transfers]);

  const getStatusBadge = (status: TransferStatus) => {
    const badges = {
      pending: { label: 'Pendiente', icon: Clock, className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
      approved: { label: 'Aprobada', icon: CheckCircle2, className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
      in_transit: { label: 'En Tránsito', icon: Truck, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
      received: { label: 'Recibida', icon: CheckCircle2, className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
      cancelled: { label: 'Cancelada', icon: XCircle, className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    };
    return badges[status];
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No definida';
    return new Date(date).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">Pendientes</p>
              <p className="text-2xl font-medium text-yellow-900 dark:text-yellow-300">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">Aprobadas</p>
              <p className="text-2xl font-medium text-green-900 dark:text-green-300">{stats.approved}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">En Tránsito</p>
              <p className="text-2xl font-medium text-blue-900 dark:text-blue-300">{stats.inTransit}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Recibidas</p>
              <p className="text-2xl font-medium text-purple-900 dark:text-purple-300">{stats.received}</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Transfer Button */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          ¿Necesitas transferir mercancía?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Crea una nueva transferencia entre nodos logísticos
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-medium flex items-center gap-2 mx-auto shadow-lg transition-all hover:shadow-xl">
          <Plus className="w-5 h-5" />
          Nueva Transferencia
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransferStatus | 'all')}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="in_transit">En Tránsito</option>
            <option value="received">Recibidas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredTransfers.length} transferencias
          </span>
        </div>
      </div>

      {/* Transfers List */}
      <div className="space-y-4">
        {filteredTransfers.map((transfer) => {
          const statusBadge = getStatusBadge(transfer.status);
          const StatusIcon = statusBadge.icon;

          return (
            <div
              key={transfer.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-500">
                      {transfer.folio}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {transfer.originNodeName}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {transfer.destinationNodeName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Productos ({transfer.products.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {transfer.products.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-900 dark:text-white">
                        {product.productName}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {product.quantity} {product.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Responsable</p>
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {transfer.responsible}
                    </p>
                  </div>
                </div>
                {transfer.transport && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Transporte</p>
                    <div className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {transfer.transport}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Creada</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(transfer.createdAt)}
                    </p>
                  </div>
                </div>
                {transfer.eta && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">ETA</p>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(transfer.eta)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {transfer.status === 'pending' && (
                  <button className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Aprobar
                  </button>
                )}
                {transfer.status === 'approved' && (
                  <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Truck className="w-4 h-4" />
                    Enviar
                  </button>
                )}
                {transfer.status === 'in_transit' && (
                  <button className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors">
                    Recibir
                  </button>
                )}
                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                  Ver Detalles
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTransfers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            No se encontraron transferencias con el filtro seleccionado
          </p>
        </div>
      )}
    </div>
  );
}
