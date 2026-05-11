import { useState } from 'react';
import { mockKiosks } from './mocks/affiliates.mock';
import type { Kiosk } from './types/affiliates.types';
import {
  Plus,
  QrCode,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Smartphone,
  TrendingUp,
  ExternalLink,
  Copy,
  Monitor,
  FileText,
  Clock,
} from 'lucide-react';

export default function KioscosTab() {
  const [kiosks] = useState<Kiosk[]>(mockKiosks);

  const stats = {
    total: kiosks.length,
    active: kiosks.filter(k => k.status === 'active').length,
    totalRegistrations: kiosks.reduce((sum, k) => sum + k.registrations, 0),
    avgConversion: 68,
    activeDevices: 5,
  };

  const recentRegistrations = [
    { id: '1', name: 'Carlos Méndez', kiosk: 'Kiosco Evento Mayo 2026', time: 'Hace 5 min', device: 'Tablet 1' },
    { id: '2', name: 'Laura Jiménez', kiosk: 'Oficina Central', time: 'Hace 12 min', device: 'iPad 2' },
    { id: '3', name: 'Miguel Ángel Ruiz', kiosk: 'Kiosco Evento Mayo 2026', time: 'Hace 18 min', device: 'Tablet 1' },
    { id: '4', name: 'Patricia Gómez', kiosk: 'Oficina Central', time: 'Hace 25 min', device: 'iPad 2' },
    { id: '5', name: 'Fernando Castro', kiosk: 'Kiosco Evento Mayo 2026', time: 'Hace 34 min', device: 'Tablet 1' },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
      active: { label: 'Activo', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: CheckCircle2 },
      inactive: { label: 'Inactivo', className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: XCircle },
    };
    return badges[status] || badges.inactive;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      nombre: 'Nombre completo',
      email: 'Correo electrónico',
      telefono: 'Teléfono',
      ciudad: 'Ciudad',
      categoria: 'Categoría',
      colonia: 'Colonia',
    };
    return labels[field] || field;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <QrCode className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Kioscos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">Activos</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Registros</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.totalRegistrations}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Conversión</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.avgConversion}%</p>
            </div>
          </div>
        </div>

        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 border border-cyan-200 dark:border-cyan-700">
          <div className="flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            <div>
              <p className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">Dispositivos</p>
              <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-300">{stats.activeDevices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Kiosk Button */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 p-6 text-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Crea un nuevo punto de captura
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Genera formularios con QR para eventos, oficinas o campañas
        </p>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-bold flex items-center gap-2 mx-auto shadow-lg transition-all hover:shadow-xl">
          <Plus className="w-5 h-5" />
          Nuevo Kiosco
        </button>
      </div>

      {/* Kiosks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kiosks List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Kioscos Configurados
          </h3>

          {kiosks.map((kiosk) => {
            const statusBadge = getStatusBadge(kiosk.status);
            const StatusIcon = statusBadge.icon;

            return (
              <div
                key={kiosk.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">
                        {kiosk.name}
                      </h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusBadge.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {kiosk.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {kiosk.location}
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-3 flex items-center gap-4">
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                    <QrCode className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">URL del Kiosco</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 flex-1 truncate">
                        {kiosk.qrCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(kiosk.qrCode)}
                        className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                        title="Copiar URL"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                        title="Abrir"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Fields Preview */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Campos del formulario</p>
                  <div className="flex flex-wrap gap-1">
                    {kiosk.fields.map((field, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-md"
                      >
                        {getFieldLabel(field)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Registros</p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-300">
                      {kiosk.registrations}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">Hoy</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-300">
                      {Math.floor(Math.random() * 15) + 3}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Monitor className="w-4 h-4" />
                    Ver Dashboard
                  </button>
                  <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    Editar
                  </button>
                  <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Activity Sidebar */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Actividad Reciente
          </h3>

          {/* Recent Registrations */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Registros en Vivo
              </h4>
            </div>

            <div className="space-y-3">
              {recentRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {reg.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {reg.kiosk}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {reg.time}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">•</span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        {reg.device}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Vista Previa del Formulario
              </h4>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-white rounded-lg mx-auto mb-3 flex items-center justify-center border-2 border-blue-200 dark:border-blue-700">
                  <QrCode className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h5 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  ¡Regístrate con nosotros!
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Llena el siguiente formulario
                </p>
              </div>

              <div className="space-y-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nombre completo</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Correo electrónico</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                </div>
                <button className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
                  Enviar Registro
                </button>
              </div>
            </div>
          </div>

          {/* Active Devices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Dispositivos Activos
              </h4>
              <span className="ml-auto px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                {stats.activeDevices} en línea
              </span>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Tablet 1', location: 'Centro Convenciones GDL', status: 'online' },
                { name: 'iPad 2', location: 'Oficina Monterrey', status: 'online' },
                { name: 'Tablet 3', location: 'Centro Convenciones GDL', status: 'online' },
                { name: 'iPad 4', location: 'Oficina Monterrey', status: 'online' },
                { name: 'Tablet 5', location: 'CDMX Varios Puntos', status: 'offline' },
              ].map((device, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {device.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                      {device.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
