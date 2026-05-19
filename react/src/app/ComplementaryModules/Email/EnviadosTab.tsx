import React, { useState } from 'react';
import { Send, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';

export default function EnviadosTab() {
  const [filter, setFilter] = useState<string | null>(null);

  const sentEmails = [
    {
      id: '1',
      recipient: 'María González',
      email: 'maria.gonzalez@cliente.com',
      subject: 'Re: Cotización para proyecto de software',
      sentAt: new Date('2026-05-13T10:15:00'),
      status: 'entregado',
      hasResponse: false,
    },
    {
      id: '2',
      recipient: 'Carlos Ramírez',
      email: 'carlos@soporte.com',
      subject: 'Actualización sobre problema de inventarios',
      sentAt: new Date('2026-05-13T08:45:00'),
      status: 'entregado',
      hasResponse: true,
    },
    {
      id: '3',
      recipient: 'Ana Martínez',
      email: 'ana.martinez@empresa.com',
      subject: 'Confirmación de pago recibido',
      sentAt: new Date('2026-05-12T16:30:00'),
      status: 'entregado',
      hasResponse: false,
    },
    {
      id: '4',
      recipient: 'Roberto Sánchez',
      email: 'roberto@proveedor.com',
      subject: 'Evaluación de propuesta comercial',
      sentAt: new Date('2026-05-11T11:20:00'),
      status: 'enviando',
      hasResponse: false,
    },
  ];

  const getStatusBadge = (status: string) => {
    const config = {
      entregado: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      enviando: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      error: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    };
    return config[status as keyof typeof config] || config.entregado;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Correos Enviados</h2>
        <p className="text-gray-600">Historial de correos enviados desde tu cuenta</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === null ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'today' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setFilter('noResponse')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'noResponse' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sin Respuesta
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Destinatario</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asunto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Respuesta</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sentEmails.map((email) => {
              const statusConfig = getStatusBadge(email.status);
              const StatusIcon = statusConfig.icon;

              return (
                <tr key={email.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{email.recipient}</p>
                      <p className="text-sm text-gray-500">{email.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{email.subject}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700">{email.sentAt.toLocaleString('es-MX')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        {email.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {email.hasResponse ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        ✓ Recibida
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Sin respuesta
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
