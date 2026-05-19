import { mockTemplates } from './mocks/forms.mock';

export default function PlantillasTab() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="text-5xl">📋</div>
          <div>
            <h2 className="text-2xl font-bold">Plantillas Predefinidas</h2>
            <p className="text-sm opacity-90">Comienza rápido con templates profesionales</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTemplates.map(template => (
          <div
            key={template.id}
            className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-6 hover:shadow-lg transition-all cursor-pointer ${
              template.recommended
                ? 'border-blue-500 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {template.recommended && (
              <div className="mb-3">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                  ⭐ Recomendado
                </span>
              </div>
            )}

            <div className="flex items-start gap-4 mb-4">
              <div className="text-5xl">{template.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">{template.usageCount}</span> usos
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Usar Template
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Sugerencia de IA
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
              Basándonos en tu industria, te recomendamos crear formularios de:
              Auditoría de Calidad, Checklist de Seguridad, y Evaluación de Proveedores
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
              Ver Recomendaciones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
