import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { mockMeetingStats } from './mocks/meetings.mock';
import { Calendar, CheckCircle2, AlertCircle, TrendingUp, Users } from 'lucide-react';
import ReunionesTab from './ReunionesTab';
import AcuerdosTab from './AcuerdosTab';
import SeguimientosTab from './SeguimientosTab';
import TemplatesTab from './TemplatesTab';
import KPIsTab from './KPIsTab';

interface ReunionesProps {
  onNavigate: (page?: string) => void;
}

export default function Reuniones({ onNavigate }: ReunionesProps) {
  const [activeTab, setActiveTab] = useState<'reuniones' | 'acuerdos' | 'seguimientos' | 'templates' | 'kpis'>('reuniones');
  const stats = mockMeetingStats;

  const tabs = [
    { id: 'reuniones', label: 'Reuniones', emoji: '📅', component: ReunionesTab },
    { id: 'acuerdos', label: 'Acuerdos', emoji: '✓', component: AcuerdosTab },
    { id: 'seguimientos', label: 'Seguimientos', emoji: '🎯', component: SeguimientosTab },
    { id: 'templates', label: 'Templates', emoji: '📋', component: TemplatesTab },
    { id: 'kpis', label: 'KPIs', emoji: '📊', component: KPIsTab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ReunionesTab;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'meetings') return;
              onNavigate(page);
            }}
            currentModule="meetings"
          />

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Reuniones y Acuerdos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Centro operativo de ejecución de acuerdos y seguimiento
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> Volver al Inicio
            </Button>
          </div>

          {/* Stats KPIs Rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Reuniones Activas</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.activeMeetings}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Acuerdos Pendientes</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">{stats.pendingAgreements}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">Acuerdos Vencidos</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.overdueAgreements}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Cumplimiento Semanal</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.weeklyCompliance}%</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Responsables Saturados</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.saturatedResponsibles}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="max-w-[1600px] mx-auto px-8 py-6">
        <ActiveComponent />
      </div>
    </div>
  );
}
