import { useState } from 'react';
import { mockAffiliateMetrics, mockInsights } from './mocks/affiliates.mock';
import type { AffiliateMetrics, Insight } from './types/affiliates.types';
import {
  Users,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart,
  MapPin,
  Target,
  Zap,
  ArrowRight,
  Calendar,
  Mail,
} from 'lucide-react';

export default function KPIsTab() {
  const [metrics] = useState<AffiliateMetrics>(mockAffiliateMetrics);
  const [insights] = useState<Insight[]>(mockInsights);

  const getInsightIcon = (type: Insight['type']) => {
    const icons = {
      success: CheckCircle2,
      warning: AlertCircle,
      critical: AlertCircle,
      info: Target,
    };
    return icons[type];
  };

  const getInsightColor = (type: Insight['type']) => {
    const colors = {
      success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400',
      warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-400',
      critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400',
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400',
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">KPIs y Métricas</h2>
            <p className="text-blue-100">
              Panel de control con métricas clave y análisis de rendimiento
            </p>
          </div>
          <BarChart3 className="w-16 h-16 text-blue-200" />
        </div>
      </div>

      {/* Intelligent Insights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Insights Inteligentes
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight) => {
            const IconComponent = getInsightIcon(insight.type);
            const colorClass = getInsightColor(insight.type);

            return (
              <div
                key={insight.id}
                className={`rounded-xl border p-5 ${colorClass}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{insight.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-semibold">
                        {insight.message}
                      </p>
                      <IconComponent className="w-5 h-5 flex-shrink-0 ml-2" />
                    </div>
                    {insight.actionable && insight.action && (
                      <button className="mt-2 px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors">
                        {insight.action}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">{metrics.monthlyGrowth}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Afiliados</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {metrics.totalAffiliates.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {metrics.activeAffiliates} activos
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-3">
            <MessageSquare className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div className="text-green-600 dark:text-green-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-green-700 dark:text-green-400 mb-1">Engagement</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-300 mb-1">
            {metrics.engagement}%
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            Nivel de participación
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-3">
            <Mail className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div className="text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Campañas Exitosas</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-300 mb-1">
            {metrics.successfulCampaigns}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-500">
            {metrics.responseRate}% tasa respuesta
          </p>
        </div>

        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-5 border border-cyan-200 dark:border-cyan-700">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
            <div className="text-cyan-600 dark:text-cyan-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xs text-cyan-700 dark:text-cyan-400 mb-1">Encuestas Completadas</p>
          <p className="text-3xl font-bold text-cyan-900 dark:text-cyan-300 mb-1">
            {metrics.surveysCompleted}
          </p>
          <p className="text-xs text-cyan-600 dark:text-cyan-500">
            Este mes
          </p>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Distribución Geográfica
          </h3>
          <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
            {metrics.activeCities} ciudades activas
          </span>
        </div>

        <div className="space-y-4">
          {metrics.topCities.map((city, index) => {
            const percentage = (city.count / metrics.totalAffiliates) * 100;
            return (
              <div key={city.city}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {city.city}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {city.count.toLocaleString()} afiliados
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 ${
                      city.growth >= 5 ? 'text-green-600 dark:text-green-400' :
                      city.growth >= 3 ? 'text-blue-600 dark:text-blue-400' :
                      'text-orange-600 dark:text-orange-400'
                    }`}>
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-semibold">+{city.growth}%</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-cyan-500' :
                      index === 2 ? 'bg-purple-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-5">
          <PieChart className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Distribución por Categoría
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart placeholder */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              {/* Simulated donut chart with CSS */}
              <div className="absolute inset-0 rounded-full border-[40px] border-blue-500" style={{ clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)' }} />
              <div className="absolute inset-0 rounded-full border-[40px] border-green-500" style={{ clipPath: 'polygon(50% 50%, 50% 100%, 0% 100%, 0% 80%)' }} />
              <div className="absolute inset-0 rounded-full border-[40px] border-purple-500" style={{ clipPath: 'polygon(50% 50%, 0% 80%, 0% 0%, 50% 0%)' }} />
              <div className="absolute inset-0 rounded-full border-[40px] border-orange-500" style={{ clipPath: 'polygon(50% 50%, 50% 0%, 40% 0%)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {metrics.totalAffiliates}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Total
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legend with bars */}
          <div className="space-y-3">
            {metrics.categoryDistribution.map((cat) => {
              const colors: Record<string, string> = {
                member: 'bg-blue-500',
                volunteer: 'bg-green-500',
                partner: 'bg-purple-500',
                sponsor: 'bg-orange-500',
                other: 'bg-gray-500',
              };

              const labels: Record<string, string> = {
                member: 'Miembros',
                volunteer: 'Voluntarios',
                partner: 'Socios',
                sponsor: 'Patrocinadores',
                other: 'Otros',
              };

              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colors[cat.category]}`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {labels[cat.category]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {cat.count.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[cat.category]} transition-all`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 dark:text-green-400">Crecimiento</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                +{metrics.monthlyGrowth}%
              </p>
            </div>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">
            vs. mes anterior
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400">Tasa Respuesta</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {metrics.responseRate}%
              </p>
            </div>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            en campañas
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-400">Nivel Engagement</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {metrics.engagement}%
              </p>
            </div>
          </div>
          <p className="text-sm text-purple-700 dark:text-purple-400">
            participación activa
          </p>
        </div>
      </div>
    </div>
  );
}
