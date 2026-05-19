import { useState } from 'react';
import OperacionTab from './OperacionTab';
import ProgramacionTab from './ProgramacionTab';
import EquiposTab from './EquiposTab';
import InspeccionesTab from './InspeccionesTab';
import ClientesTab from './ClientesTab';
import IncidenciasTab from './IncidenciasTab';
import InventarioTab from './InventarioTab';
import KPIsTab from './KPIsTab';

type TabType = 'operacion' | 'programacion' | 'equipos' | 'inspecciones' | 'clientes' | 'incidencias' | 'inventario' | 'kpis';

export default function Limpieza() {
  const [activeTab, setActiveTab] = useState<TabType>('operacion');

  const tabs: { id: TabType; label: string; emoji: string }[] = [
    { id: 'operacion', label: 'Operación', emoji: '🔄' },
    { id: 'programacion', label: 'Programación', emoji: '📅' },
    { id: 'equipos', label: 'Equipos', emoji: '👥' },
    { id: 'inspecciones', label: 'Inspecciones', emoji: '✓' },
    { id: 'clientes', label: 'Clientes', emoji: '🏢' },
    { id: 'incidencias', label: 'Incidencias', emoji: '⚠️' },
    { id: 'inventario', label: 'Inventario', emoji: '📦' },
    { id: 'kpis', label: 'KPIs', emoji: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="px-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-gray-900 dark:text-white flex items-center gap-2">
                🧹 Limpieza
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Plataforma operacional para gestión de servicios de limpieza
              </p>
            </div>
          </div>

          <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="mr-1.5">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'operacion' && <OperacionTab />}
        {activeTab === 'programacion' && <ProgramacionTab />}
        {activeTab === 'equipos' && <EquiposTab />}
        {activeTab === 'inspecciones' && <InspeccionesTab />}
        {activeTab === 'clientes' && <ClientesTab />}
        {activeTab === 'incidencias' && <IncidenciasTab />}
        {activeTab === 'inventario' && <InventarioTab />}
        {activeTab === 'kpis' && <KPIsTab />}
      </div>
    </div>
  );
}
