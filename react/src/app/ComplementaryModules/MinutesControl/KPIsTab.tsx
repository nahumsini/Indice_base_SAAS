import { useState } from 'react';
import { mockComplianceMetrics, mockInsights } from './mocks/meetings.mock';
import { TrendingUp, CheckCircle2, AlertCircle, Clock, Users, Flame, Info } from 'lucide-react';

export default function KPIsTab() {
  const [metrics] = useState(mockComplianceMetrics);
  const [insights] = useState(mockInsights);

  const complianceRate = metrics.complianceRate;
  const getComplianceColor = () => {
    if (complianceRate >= 80) return 'text-green-600 dark:text-green-400';
    if (complianceRate >= 60) return 'text-blue-600 dark:text-blue-400';
    if (complianceRate >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getInsightIcon = (type: string) => {
    const icons: Record<string, typeof AlertCircle> = {
      warning: AlertCircle,
      critical: Flame,
      success: CheckCircle2,
      info: Info,
    };
    return icons[type] || Info;
  };

  const getInsightColor = (type: string) => {
    const colors: Record<string, string> = {
      warning: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
      critical: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700',
      success: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-700',
      info: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    };
    return colors[type] || colors.info;
  };

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${
          complianceRate >= 80 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
          complianceRate >= 60 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' :
          complianceRate >= 40 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' :
          'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        } border rounded-xl p-4`}>
          <div className="flex items-center gap-3">
            <TrendingUp className={`w-8 h-8 ${getComplianceColor()}`} />
            <div>
              <p className={`text-xs font-medium ${getComplianceColor()}`}>
                Cumplimiento
              </p>
              <p className={`text-3xl font-bold ${getComplianceColor()}`}>
                {complianceRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">Completados</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                {metrics.completedAgreements}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">Vencidos</p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-300">
                {metrics.overdueAgreements}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Tiempo Promedio</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                {metrics.averageCompletionTime}d
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Insights Inteligentes
        </h2>
        <div className="space-y-3">
          {insights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            return (
              <div
                key={insight.id}
                className={`rounded-xl p-4 border ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {insight.icon} {insight.message}
                    </p>
                    {insight.actionable && insight.action && (
                      <button className="mt-2 px-3 py-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs font-medium transition-colors">
                        {insight.action}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Responsables */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Responsables con Más Carga
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Completados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pendientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vencidos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {metrics.topResponsibles.map((responsible) => (
                <tr key={responsible.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {responsible.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {responsible.completed}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {responsible.pending}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {responsible.overdue}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {responsible.completed + responsible.pending + responsible.overdue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Area Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Cumplimiento por Área
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.areaMetrics.map((area) => (
            <div
              key={area.area}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {area.area}
                </h3>
                <span className={`px-2 py-1 rounded-full text-sm font-bold ${
                  area.complianceRate >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                  area.complianceRate >= 60 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                  area.complianceRate >= 40 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {area.complianceRate}%
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Completados</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{area.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Pendientes</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{area.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Vencidos</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{area.overdue}</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      area.complianceRate >= 80 ? 'bg-green-500' :
                      area.complianceRate >= 60 ? 'bg-blue-500' :
                      area.complianceRate >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${area.complianceRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
