export default function ConstructorTab() {
  const fieldTypes = [
    { id: 'texto', name: 'Texto', icon: '📝' },
    { id: 'opcion_multiple', name: 'Opción Múltiple', icon: '⭕' },
    { id: 'dropdown', name: 'Dropdown', icon: '📋' },
    { id: 'fecha', name: 'Fecha', icon: '📅' },
    { id: 'rating', name: 'Rating', icon: '⭐' },
    { id: 'firma', name: 'Firma', icon: '✍️' },
    { id: 'foto', name: 'Foto', icon: '📸' },
    { id: 'gps', name: 'GPS', icon: '📍' },
    { id: 'qr', name: 'QR', icon: '📱' },
    { id: 'archivo', name: 'Archivo', icon: '📎' },
    { id: 'checklist', name: 'Checklist', icon: '✅' },
    { id: 'numero', name: 'Número', icon: '🔢' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">🔨</div>
          <div>
            <h2 className="text-2xl font-bold">Constructor de Formularios</h2>
            <p className="text-sm opacity-90">Diseña formularios modernos con drag & drop</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Components Palette */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Componentes
            </h3>
            <div className="space-y-2">
              {fieldTypes.map(field => (
                <div
                  key={field.id}
                  className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-move hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{field.icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {field.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Nombre del formulario"
                className="w-full text-2xl font-bold border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="Descripción (opcional)"
                className="w-full mt-2 text-sm border-none outline-none bg-transparent text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Sample Form Preview */}
            <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 text-center">
                <div className="text-4xl mb-2">🔨</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Arrastra componentes aquí para construir tu formulario
                </p>
              </div>

              {/* Example Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pregunta de ejemplo
                </label>
                <input
                  type="text"
                  placeholder="Respuesta..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Propiedades
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Tipo de campo
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm">
                  <option>Texto</option>
                  <option>Opción Múltiple</option>
                  <option>Fecha</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Campo requerido</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Lógica condicional</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-xs font-medium text-purple-900 dark:text-purple-100">
                  IA Sugerencia
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                  Agrega una pregunta de rating para medir satisfacción
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
