import { useState, type ReactElement } from 'react';
import { mockMetrics } from './mocks/inventory.mock';
import type { InventoryMetrics } from './types/inventory.types';
import RedLogisticaTab from './RedLogisticaTab';
import MovimientosTab from './MovimientosTab';
import TransferenciasTab from './TransferenciasTab';
import StockGlobalTab from './StockGlobalTab';
import AlertasTab from './AlertasTab';
import AuditoriasTab from './AuditoriasTab';
import TrazabilidadTab from './TrazabilidadTab';
import KPIsTab from './KPIsTab';
import {
  Network,
  ArrowRightLeft,
  TrendingUp,
  Package,
  AlertTriangle,
  ClipboardCheck,
  Route,
  BarChart3,
  Boxes,
} from 'lucide-react';

type TabId = 'red' | 'movimientos' | 'transferencias' | 'stock' | 'alertas' | 'auditorias' | 'trazabilidad' | 'kpis';

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
  icon: typeof Network;
  component: () => ReactElement;
}

export default function Multiinventarios() {
  const [activeTab, setActiveTab] = useState<TabId>('red');
  const [metrics] = useState<InventoryMetrics>(mockMetrics);

  const tabs: Tab[] = [
    { id: 'red', label: 'Red Logística', emoji: '🌐', icon: Network, component: RedLogisticaTab },
    { id: 'movimientos', label: 'Movimientos', emoji: '📋', icon: ArrowRightLeft, component: MovimientosTab },
    { id: 'transferencias', label: 'Transferencias', emoji: '🚚', icon: TrendingUp, component: TransferenciasTab },
    { id: 'stock', label: 'Stock Global', emoji: '📦', icon: Package, component: StockGlobalTab },
    { id: 'alertas', label: 'Alertas', emoji: '⚠️', icon: AlertTriangle, component: AlertasTab },
    { id: 'auditorias', label: 'Auditorías', emoji: '✓', icon: ClipboardCheck, component: AuditoriasTab },
    { id: 'trazabilidad', label: 'Trazabilidad', emoji: '🔍', icon: Route, component: TrazabilidadTab },
    { id: 'kpis', label: 'KPIs', emoji: '📊', icon: BarChart3, component: KPIsTab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || RedLogisticaTab;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Boxes className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Multiinventarios
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Red logística y control de mercancía
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">Nodos Activos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.totalNodes}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 px-4 py-3">
              <p className="text-xs text-blue-700 dark:text-blue-400">Movimientos Hoy</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{metrics.movementsToday}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700 px-4 py-3">
              <p className="text-xs text-green-700 dark:text-green-400">Precisión</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">{metrics.accuracy}%</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-lg">{tab.emoji}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
