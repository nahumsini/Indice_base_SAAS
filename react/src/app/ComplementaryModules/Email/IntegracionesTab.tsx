import React from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle, Clock, Inbox, Send } from 'lucide-react';
import { mockIntegrations } from './mocks/email.mock';

export default function IntegracionesTab() {
  const getStatusBadge = (status: string) => {
    const config = {
      conectado: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      sincronizando: { bg: 'bg-blue-100', text: 'text-blue-700', icon: RefreshCw },
      desconectado: { bg: 'bg-gray-100', text: 'text-gray-600', icon: AlertCircle },
      error: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    };
    return config[status as keyof typeof config] || config.desconectado;
  };

  const getProviderLogo = (type: string) => {
    const logos = {
      gmail: '📧',
      outlook: '📨',
      microsoft365: '🏢',
      smtp: '📮',
    };
    return logos[type as keyof typeof logos] || '📧';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Integraciones</h2>
            <p className="text-gray-600">Conecta tus cuentas de correo empresarial</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Conectar Nueva Cuenta
          </button>
        </div>
      </div>

      {/* Proveedores Disponibles */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Proveedores Disponibles</h3>
        <div className="grid grid-cols-4 gap-4">
          {['Gmail', 'Outlook', 'Microsoft 365', 'SMTP Personalizado'].map((provider) => (
            <button
              key={provider}
              className="p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-center"
            >
              <div className="text-4xl mb-3">{getProviderLogo(provider.toLowerCase().replace(' ', ''))}</div>
              <p className="font-semibold text-gray-900">{provider}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cuentas Conectadas */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Cuentas Conectadas</h3>
        <div className="space-y-4">
          {mockIntegrations.map((integration) => {
            const statusConfig = getStatusBadge(integration.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={integration.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{getProviderLogo(integration.type)}</div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-gray-900 text-lg">{integration.email}</h4>
                        <div className="flex items-center gap-2">
                          <StatusIcon className="h-4 w-4" />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                            {integration.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {integration.type.charAt(0).toUpperCase() + integration.type.slice(1)}
                      </p>
                      {integration.lastSync && (
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Última sincronización: {integration.lastSync.toLocaleString('es-MX')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                      Configurar
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Sincronizar
                    </button>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Inbox className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-medium text-gray-600">Recibidos</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{integration.emailsReceived.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Send className="h-4 w-4 text-green-600" />
                      <p className="text-xs font-medium text-gray-600">Enviados</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{integration.emailsSent.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <p className="text-xs font-medium text-gray-600">Conectado desde</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {integration.connectedAt.toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>

                {integration.errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{integration.errorMessage}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
