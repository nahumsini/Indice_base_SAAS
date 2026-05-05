import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { FavoritesBar } from '../../components/FavoritesBar';
import { usePuntoDeVentaTranslations } from '../../hooks/usePuntoDeVentaTranslations';
import Sale from './Sale/Sale';
import Cortes from './Cortes';
import Clientes from './Clientes';
import Productos from './Productos';
import Inventario from './Inventario';
import OrdenesCompra from './OrdenesCompra';
import Facturacion from './Facturacion';
import Descuentos from './Descuentos';
import KPIs from './KPIs';

interface PuntoDeVentaProps {
  onNavigate: (page?: string) => void;
}

export default function PuntoDeVenta({ onNavigate }: PuntoDeVentaProps) {
  const t = usePuntoDeVentaTranslations();
  const [activeTab, setActiveTab] = useState<'sale' | 'cortes' | 'clientes' | 'productos' | 'inventario' | 'ordenesCompra' | 'facturacion' | 'descuentos' | 'kpis'>('sale');

  const tabs = [
    { id: 'sale', label: 'Venta', emoji: '🛒', component: Sale },
    { id: 'cortes', label: t.tabs.cortes, emoji: '💰', component: Cortes },
    { id: 'clientes', label: t.tabs.clientes, emoji: '👥', component: Clientes },
    { id: 'productos', label: t.tabs.productos, emoji: '🛍️', component: Productos },
    { id: 'inventario', label: t.tabs.inventario, emoji: '📦', component: Inventario },
    { id: 'ordenesCompra', label: t.tabs.ordenesCompra, emoji: '📋', component: OrdenesCompra },
    { id: 'facturacion', label: t.tabs.facturacion, emoji: '🧾', component: Facturacion },
    { id: 'descuentos', label: t.tabs.descuentos, emoji: '🎁', component: Descuentos },
    { id: 'kpis', label: t.tabs.kpis, emoji: '📊', component: KPIs },
  ];

  // Get the active component
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Sale;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header del módulo */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Barra de Favoritos */}
          <FavoritesBar 
            onNavigate={(page) => {
              if (page === 'punto-de-venta') return; // Ya estamos aquí
              onNavigate(page);
            }} 
            currentModule="punto-de-venta" 
          />
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {t.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t.subtitle}
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => onNavigate()}
              className="text-sm gap-2"
            >
              <span className="text-lg">🏠</span> {t.back}
            </Button>
          </div>

          {/* Pestañas */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
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
