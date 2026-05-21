import { useState, type ReactElement } from 'react';
import { mockMetrics } from './mocks/vehicles.mock';
import type { VehicleMetrics } from './types/vehicles.types';
import OperacionTab from './OperacionTab';
import VehiculosTab from './VehiculosTab';
import ServiciosTab from './ServiciosTab';
import ReportesTab from './ReportesTab';
import CombustibleTab from './CombustibleTab';
import KioscosTab from './KioscosTab';
import DocumentacionTab from './DocumentacionTab';
import GPSTab from './GPSTab';
import KPIsTab from './KPIsTab';
import {
  Activity,
  Truck,
  Wrench,
  FileText,
  Fuel,
  Tablet,
  FolderOpen,
  MapPin,
  BarChart3,
  Gauge,
} from 'lucide-react';

type TabId = 'operacion' | 'vehiculos' | 'servicios' | 'reportes' | 'combustible' | 'kioscos' | 'documentacion' | 'gps' | 'kpis';

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
  icon: typeof Activity;
  component: () => ReactElement;
}

export default function VehiculosMaquinaria() {
  const [activeTab, setActiveTab] = useState<TabId>('operacion');
  const [metrics] = useState<VehicleMetrics>(mockMetrics);

  const tabs: Tab[] = [
    { id: 'operacion', label: 'Operación', emoji: '⚡', icon: Activity, component: OperacionTab },
    { id: 'vehiculos', label: 'Vehículos y Maquinaria', emoji: '🚛', icon: Truck, component: VehiculosTab },
    { id: 'servicios', label: 'Servicios y Mantenimiento', emoji: '🔧', icon: Wrench, component: ServiciosTab },
    { id: 'reportes', label: 'Reportes Operativos', emoji: '📋', icon: FileText, component: ReportesTab },
    { id: 'combustible', label: 'Combustible y Gastos', emoji: '⛽', icon: Fuel, component: CombustibleTab },
    { id: 'kioscos', label: 'Kioscos Operativos', emoji: '📱', icon: Tablet, component: KioscosTab },
    { id: 'documentacion', label: 'Documentación', emoji: '📄', icon: FolderOpen, component: DocumentacionTab },
    { id: 'gps', label: 'GPS y Telemetría', emoji: '📍', icon: MapPin, component: GPSTab },
    { id: 'kpis', label: 'KPIs', emoji: '📊', icon: BarChart3, component: KPIsTab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || OperacionTab;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Gauge className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Vehículos y Maquinaria
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Control operativo de flotillas y activos móviles
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Unidades</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.totalVehicles}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 px-4 py-3">
              <p className="text-xs text-blue-700 dark:text-blue-400">En Operación</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-300">{metrics.inOperation}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700 px-4 py-3">
              <p className="text-xs text-green-700 dark:text-green-400">Disponibilidad</p>
              <p className="text-xl font-bold text-green-900 dark:text-green-300">{metrics.averageAvailability}%</p>
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
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
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
