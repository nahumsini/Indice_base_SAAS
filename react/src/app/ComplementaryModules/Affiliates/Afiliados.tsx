import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { mockAffiliateStats } from './mocks/affiliates.mock';
import { Users, TrendingUp, MessageSquare, TicketIcon, Target, BarChart3 } from 'lucide-react';
import AfiliadosTab from './AfiliadosTab';
import CampanasTab from './CampanasTab';
import EncuestasTab from './EncuestasTab';
import KioscosTab from './KioscosTab';
import TicketsTab from './TicketsTab';
import KPIsTab from './KPIsTab';

interface AfiliadosProps {
  onNavigate: (page?: string) => void;
}

export default function Afiliados({ onNavigate }: AfiliadosProps) {
  const [activeTab, setActiveTab] = useState<'afiliados' | 'campanas' | 'encuestas' | 'kioscos' | 'tickets' | 'kpis'>('afiliados');
  const stats = mockAffiliateStats;

  const tabs = [
    { id: 'afiliados', label: 'Afiliados', emoji: '👥', component: AfiliadosTab },
    { id: 'campanas', label: 'Campañas', emoji: '📢', component: CampanasTab },
    { id: 'encuestas', label: 'Encuestas', emoji: '📋', component: EncuestasTab },
    { id: 'kioscos', label: 'Kioscos', emoji: '🏪', component: KioscosTab },
    { id: 'tickets', label: 'Tickets', emoji: '🎫', component: TicketsTab },
    { id: 'kpis', label: 'KPIs', emoji: '📊', component: KPIsTab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AfiliadosTab;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar
            onNavigate={(page) => {
              if (page === 'affiliate-management' || page === 'affiliates') return;
              onNavigate(page);
            }}
            currentModule="affiliate-management"
          />

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Afiliados y Campañas
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Centro operativo de comunicación y gestión de afiliados
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Afiliados</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.totalAffiliates}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Activos</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.activeAffiliates}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Nuevos Este Mes</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.newThisMonth}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">Campañas Activas</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{stats.activeCampaigns}</p>
                </div>
              </div>
            </div>

            <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                <div>
                  <p className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">Encuestas Respondidas</p>
                  <p className="text-2xl font-bold text-cyan-900 dark:text-cyan-300">{stats.surveysResponded}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <TicketIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">Tickets Abiertos</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.openTickets}</p>
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
