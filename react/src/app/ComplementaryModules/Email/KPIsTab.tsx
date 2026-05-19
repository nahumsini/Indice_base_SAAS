import React from 'react';
import { Mail, Send, Clock, TrendingUp, TrendingDown, AlertCircle, CheckCircle, User } from 'lucide-react';
import { mockMetrics, mockInsights } from './mocks/email.mock';

export default function KPIsTab() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">KPIs y Métricas</h2>
        <p className="text-gray-600">Indicadores de desempeño del correo empresarial</p>
      </div>

      {/* Insights */}
      {mockInsights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Insights</h3>
          <div className="grid grid-cols-3 gap-4">
            {mockInsights.map((insight) => {
              const Icon = {
                AlertCircle,
                Clock,
                TrendingUp,
              }[insight.icon] || AlertCircle;

              const colorConfig = {
                critical: 'border-red-200 bg-red-50',
                warning: 'border-amber-200 bg-amber-50',
                success: 'border-green-200 bg-green-50',
                info: 'border-blue-200 bg-blue-50',
              };

              return (
                <div
                  key={insight.id}
                  className={`rounded-xl p-4 border-2 ${colorConfig[insight.type]}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'critical' ? 'bg-red-100' :
                      insight.type === 'warning' ? 'bg-amber-100' :
                      insight.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        insight.type === 'critical' ? 'text-red-600' :
                        insight.type === 'warning' ? 'text-amber-600' :
                        insight.type === 'success' ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">{insight.message}</p>
                      {insight.actionable && insight.action && (
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                          {insight.action} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Recibidos Hoy</p>
              <p className="text-3xl font-bold text-gray-900">{mockMetrics.receivedToday}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-semibold">+12%</span>
            <span className="text-gray-500">vs ayer</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Enviados Hoy</p>
              <p className="text-3xl font-bold text-gray-900">{mockMetrics.sentToday}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-semibold">+8%</span>
            <span className="text-gray-500">vs ayer</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{mockMetrics.pendingCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-red-600 font-semibold">+2</span>
            <span className="text-gray-500">vs ayer</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">No Leídos</p>
              <p className="text-3xl font-bold text-gray-900">{mockMetrics.unreadCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-semibold">-3</span>
            <span className="text-gray-500">vs ayer</span>
          </div>
        </div>
      </div>

      {/* Métricas de Desempeño */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tiempo Promedio de Respuesta</h3>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-bold text-gray-900">{mockMetrics.averageResponseTime}</p>
            <p className="text-xl text-gray-600 mb-2">horas</p>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: '75%' }} />
          </div>
          <p className="text-sm text-gray-500 mt-2">Meta: 3 horas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tasa de Respuesta</h3>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-bold text-gray-900">{mockMetrics.responseRate}</p>
            <p className="text-xl text-gray-600 mb-2">%</p>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${mockMetrics.responseRate}%` }} />
          </div>
          <p className="text-sm text-gray-500 mt-2">Meta: 95%</p>
        </div>
      </div>

      {/* Estadísticas Adicionales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-amber-50 rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-semibold text-gray-900">Seguimientos Vencidos</h4>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-2">{mockMetrics.overdueFollowUps}</p>
          <p className="text-sm text-gray-600">Requieren atención inmediata</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Usuario Más Activo</h4>
          </div>
          <p className="text-xl font-bold text-gray-900 mb-2">{mockMetrics.mostActiveUser}</p>
          <p className="text-sm text-gray-600">Mayor volumen de correos</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Eficiencia</h4>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-2">Excelente</p>
          <p className="text-sm text-gray-600">Basado en métricas generales</p>
        </div>
      </div>
    </div>
  );
}
