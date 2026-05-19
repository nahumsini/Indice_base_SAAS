import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import BandejaEntradaTab from './BandejaEntradaTab';
import PendientesTab from './PendientesTab';
import EnviadosTab from './EnviadosTab';
import PlantillasTab from './PlantillasTab';
import IntegracionesTab from './IntegracionesTab';
import KPIsTab from './KPIsTab';

type TabType = 'bandeja' | 'pendientes' | 'enviados' | 'plantillas' | 'integraciones' | 'kpis';

interface Props {
  onNavigate?: (page: string) => void;
}

export default function CorreoEmpresarial({ onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('bandeja');

  const tabs = [
    { id: 'bandeja' as TabType, label: 'Bandeja de Entrada', icon: '📥' },
    { id: 'pendientes' as TabType, label: 'Pendientes y Seguimiento', icon: '⏰' },
    { id: 'enviados' as TabType, label: 'Enviados', icon: '📤' },
    { id: 'plantillas' as TabType, label: 'Plantillas', icon: '📝' },
    { id: 'integraciones' as TabType, label: 'Integraciones', icon: '🔗' },
    { id: 'kpis' as TabType, label: 'KPIs', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Correo Empresarial</h1>
                <p className="text-sm text-gray-500">Seguimiento operativo de correos y conversaciones</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
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
      <div className="max-w-[1800px] mx-auto">
        {activeTab === 'bandeja' && <BandejaEntradaTab />}
        {activeTab === 'pendientes' && <PendientesTab />}
        {activeTab === 'enviados' && <EnviadosTab />}
        {activeTab === 'plantillas' && <PlantillasTab />}
        {activeTab === 'integraciones' && <IntegracionesTab />}
        {activeTab === 'kpis' && <KPIsTab />}
      </div>
    </div>
  );
}
