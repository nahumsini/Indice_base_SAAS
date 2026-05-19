import React, { useState } from 'react';
import { Clock, AlertCircle, User, Calendar, Bell, CheckCircle2, ArrowRight } from 'lucide-react';
import { mockFollowUps } from './mocks/email.mock';

export default function PendientesTab() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const styles = {
      pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
      seguimiento: 'bg-blue-100 text-blue-700 border-blue-200',
      esperando_respuesta: 'bg-purple-100 text-purple-700 border-purple-200',
      completado: 'bg-green-100 text-green-700 border-green-200',
    };
    return styles[status as keyof typeof styles] || styles.pendiente;
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      urgente: 'bg-red-100 text-red-700',
      importante: 'bg-amber-100 text-amber-700',
      normal: 'bg-gray-100 text-gray-600',
    };
    return styles[priority as keyof typeof styles] || styles.normal;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completado':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'urgente':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-amber-600" />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pendientes y Seguimiento</h2>
        <p className="text-gray-600">Gestión operativa de correos que requieren acción</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {mockFollowUps.filter((f) => f.status === 'pendiente').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowRight className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">En Seguimiento</p>
              <p className="text-2xl font-bold text-gray-900">
                {mockFollowUps.filter((f) => f.status === 'seguimiento').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Bell className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Esperando Respuesta</p>
              <p className="text-2xl font-bold text-gray-900">
                {mockFollowUps.filter((f) => f.status === 'esperando_respuesta').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidos</p>
              <p className="text-2xl font-bold text-gray-900">
                {mockFollowUps.filter((f) => f.dueDate && f.dueDate < new Date()).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedStatus(null)}
          className={`px-4 py-2 rounded-lg font-medium ${
            selectedStatus === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {['pendiente', 'seguimiento', 'esperando_respuesta', 'completado'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedStatus === status
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asunto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remitente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asignado a</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Prioridad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Límite</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notas</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockFollowUps
              .filter((f) => !selectedStatus || f.status === selectedStatus)
              .map((followUp) => {
                const isOverdue = followUp.dueDate && followUp.dueDate < new Date();
                return (
                  <tr key={followUp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(followUp.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(followUp.status)}`}>
                          {followUp.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{followUp.subject}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{followUp.sender}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">{followUp.assignedTo || 'Sin asignar'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(followUp.priority)}`}>
                        {followUp.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {followUp.dueDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                            {followUp.dueDate.toLocaleDateString('es-MX')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 truncate max-w-xs">{followUp.notes}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                          Ver
                        </button>
                        <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium">
                          Completar
                        </button>
                      </div>
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
