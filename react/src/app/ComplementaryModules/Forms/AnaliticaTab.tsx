import { mockAnalytics, mockMetrics } from './mocks/forms.mock';

export default function AnaliticaTab() {
  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-4xl font-bold">{mockMetrics.totalForms}</p>
          <p className="text-sm opacity-90">Total Formularios</p>
          <div className="mt-4 pt-4 border-t border-blue-400">
            <p className="text-xs opacity-75">Activos: {mockMetrics.activeForms}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-4xl font-bold">{mockMetrics.totalResponses.toLocaleString()}</p>
          <p className="text-sm opacity-90">Total Respuestas</p>
          <div className="mt-4 pt-4 border-t border-green-400">
            <p className="text-xs opacity-75">Hoy: {mockMetrics.responsesToday}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-4xl font-bold">{mockMetrics.averageParticipation}%</p>
          <p className="text-sm opacity-90">Tasa Completado</p>
          <div className="mt-4">
            <div className="w-full bg-purple-400/30 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full"
                style={{ width: `${mockMetrics.averageParticipation}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg p-6 text-white">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-4xl font-bold">{mockMetrics.automationsTriggered.toLocaleString()}</p>
          <p className="text-sm opacity-90">Automatizaciones</p>
          <div className="mt-4 pt-4 border-t border-amber-400">
            <p className="text-xs opacity-75">Ejecutadas</p>
          </div>
        </div>
      </div>

      {/* Form Analytics Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          📈 Desempeño por Formulario
        </h2>
        <div className="space-y-4">
          {mockAnalytics.map(data => (
            <div
              key={data.formId}
              className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{data.formName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {data.responses} respuestas • {data.avgTime}min promedio
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {data.trend === 'up' && <span className="text-green-500">📈</span>}
                  {data.trend === 'down' && <span className="text-red-500">📉</span>}
                  {data.trend === 'stable' && <span className="text-gray-500">➡️</span>}
                  {data.riskDetected && <span className="text-red-500">⚠️</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completado</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg font-bold ${
                      data.completion >= 90 ? 'text-green-600 dark:text-green-400' :
                      data.completion >= 75 ? 'text-blue-600 dark:text-blue-400' :
                      'text-amber-600 dark:text-amber-400'
                    }`}>
                      {data.completion}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        data.completion >= 90 ? 'bg-green-500' :
                        data.completion >= 75 ? 'bg-blue-500' :
                        'bg-amber-500'
                      }`}
                      style={{ width: `${data.completion}%` }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Abandono</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {data.abandonment}%
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-red-500 h-1.5 rounded-full"
                      style={{ width: `${data.abandonment}%` }}
                    />
                  </div>
                </div>

                {data.sentiment && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sentimiento</p>
                    <div className="flex gap-1">
                      <div className="flex flex-col items-center">
                        <span className="text-xs">😊</span>
                        <span className="text-xs font-medium text-green-600">{data.sentiment.positive}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs">😐</span>
                        <span className="text-xs font-medium text-gray-600">{data.sentiment.neutral}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs">😞</span>
                        <span className="text-xs font-medium text-red-600">{data.sentiment.negative}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {data.incidentsGenerated !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Incidencias</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {data.incidentsGenerated}
                    </p>
                  </div>
                )}
              </div>

              {data.riskDetected && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🤖</span>
                    <div>
                      <p className="text-xs font-medium text-red-900 dark:text-red-100">
                        IA detectó riesgos
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Se identificaron {data.sentiment?.negative}% de respuestas con sentimiento negativo
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="text-5xl">🤖</div>
          <div>
            <h3 className="text-xl font-bold mb-2">Insights de IA</h3>
            <ul className="space-y-2 text-sm opacity-90">
              <li>• Formulario "Satisfacción del Cliente" tiene alto abandono en pregunta 4 - considera simplificar</li>
              <li>• IA detectó patrón de respuestas negativas los viernes - posible indicador de fatiga laboral</li>
              <li>• 85% de respuestas se completan en móvil - optimiza diseño mobile-first</li>
              <li>• Automatización de WhatsApp aumentó participación 23% vs formularios sin automatización</li>
            </ul>
            <button className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
              Ver Análisis Completo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
