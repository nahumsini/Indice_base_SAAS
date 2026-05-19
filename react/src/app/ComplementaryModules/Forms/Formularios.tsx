import { useState } from 'react';
import FormulariosTab from './FormulariosTab';
import ConstructorTab from './ConstructorTab';
import RespuestasTab from './RespuestasTab';
import AutomatizacionesTab from './AutomatizacionesTab';
import PlantillasTab from './PlantillasTab';
import KioscosTab from './KioscosTab';
import AnaliticaTab from './AnaliticaTab';

type TabType = 'formularios' | 'constructor' | 'respuestas' | 'automatizaciones' | 'plantillas' | 'kioscos' | 'analitica';

export default function Formularios() {
  const [activeTab, setActiveTab] = useState<TabType>('formularios');

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'formularios', label: 'Formularios', icon: '📝' },
    { id: 'constructor', label: 'Constructor', icon: '🔨' },
    { id: 'respuestas', label: 'Respuestas', icon: '📊' },
    { id: 'automatizaciones', label: 'Automatizaciones', icon: '⚡' },
    { id: 'plantillas', label: 'Plantillas', icon: '📋' },
    { id: 'kioscos', label: 'Kioscos', icon: '🖥️' },
    { id: 'analitica', label: 'Analítica', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                📝 Formularios y Captura Inteligente
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Captura operacional y automatización de procesos
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                + Nuevo Formulario
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1800px] mx-auto px-8">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {activeTab === 'formularios' && <FormulariosTab />}
        {activeTab === 'constructor' && <ConstructorTab />}
        {activeTab === 'respuestas' && <RespuestasTab />}
        {activeTab === 'automatizaciones' && <AutomatizacionesTab />}
        {activeTab === 'plantillas' && <PlantillasTab />}
        {activeTab === 'kioscos' && <KioscosTab />}
        {activeTab === 'analitica' && <AnaliticaTab />}
      </div>
    </div>
  );
}
