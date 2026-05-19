import React, { useState } from 'react';
import { FileText, Copy, Edit, Trash2, Plus, TrendingUp } from 'lucide-react';
import { mockTemplates } from './mocks/email.mock';

export default function PlantillasTab() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getCategoryColor = (category: string) => {
    const colors = {
      ventas: 'green',
      soporte: 'blue',
      cobranza: 'purple',
      bienvenida: 'indigo',
      seguimiento: 'amber',
      cotizaciones: 'orange',
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  const categories = [
    { id: 'ventas', label: 'Ventas', icon: '💰', color: 'green' },
    { id: 'soporte', label: 'Soporte', icon: '🛠️', color: 'blue' },
    { id: 'cobranza', label: 'Cobranza', icon: '💵', color: 'purple' },
    { id: 'bienvenida', label: 'Bienvenida', icon: '👋', color: 'indigo' },
    { id: 'seguimiento', label: 'Seguimiento', icon: '📞', color: 'amber' },
    { id: 'cotizaciones', label: 'Cotizaciones', icon: '📄', color: 'orange' },
  ];

  const filteredTemplates = selectedCategory
    ? mockTemplates.filter((t) => t.category === selectedCategory)
    : mockTemplates;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Plantillas</h2>
            <p className="text-gray-600">Respuestas rápidas para agilizar tu comunicación</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Plantilla
          </button>
        </div>
      </div>

      {/* Categorías */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
            selectedCategory === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap flex items-center gap-2 ${
              selectedCategory === cat.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de plantillas */}
      <div className="grid grid-cols-2 gap-4">
        {filteredTemplates.map((template) => {
          const color = getCategoryColor(template.category);
          return (
            <div
              key={template.id}
              className={`bg-white rounded-xl border-2 border-${color}-200 p-5 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                  </div>
                  <span className={`inline-block px-2 py-1 bg-${color}-100 text-${color}-700 rounded-full text-xs font-medium`}>
                    {template.category}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Copy className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Asunto</p>
                <p className="text-sm text-gray-900 font-medium">{template.subject}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Contenido</p>
                <p className="text-sm text-gray-700 line-clamp-3">{template.body}</p>
              </div>

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Variables</p>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <span
                      key={variable}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>Usado {template.usageCount} veces</span>
                </div>
                <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                  Usar Plantilla
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
