export default function InspeccionesTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">96%</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tasa de aprobación</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">42</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Inspecciones hoy</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="text-3xl mb-2">⭐</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">94.5</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Score promedio</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
          <div className="text-3xl mb-2">🔄</div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">2</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Revisiones pendientes</p>
        </div>
      </div>
    </div>
  );
}
