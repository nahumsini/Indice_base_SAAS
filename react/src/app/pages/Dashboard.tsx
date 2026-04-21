import { useLanguage } from '../shared/context';
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router';
import { LearningModeBanner } from '../components/LearningModeBanner';
import { KPIConfiguration } from '../components/KPIConfiguration';
import { KPICarousel } from '../components/KPICarousel';
import { KPICard } from '../components/KPICard';
import { ModuleCarousel } from '../components/ModuleCarousel';
import { ModuleCard } from '../components/ModuleCard';
import { Button } from '../components/ui/button';

interface OutletContext {
  learningModeActive: boolean;
  learningModeVisible: boolean;
  setLearningModeVisible: (visible: boolean) => void;
  learningStep: number;
  setLearningStep: (step: number) => void;
}

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { 
    learningModeActive,
    learningModeVisible,
    setLearningModeVisible,
    learningStep,
    setLearningStep,
  } = useOutletContext<OutletContext>();
  
  const [favorites, setFavorites] = useState<string[]>(['recursosHumanos']);
  const [isKPIConfigOpen, setIsKPIConfigOpen] = useState(false);
  const [selectedKPIIds, setSelectedKPIIds] = useState<string[]>([
    'weeklyRevenue',
    'netProfit',
    'activeClients',
    'activeEmployees',
    'pendingTasks',
    'monthlyExpenses'
  ]);

  const toggleFavorite = (moduleId: string) => {
    setFavorites(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleNextStep = () => {
    if (learningStep < 7) {
      setLearningStep(learningStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (learningStep > 0) {
      setLearningStep(learningStep - 1);
    }
  };

  const handleSaveKPIs = (kpis: string[]) => {
    setSelectedKPIIds(kpis);
  };

  const handleModuleClick = (moduleId: string) => {
    if (moduleId === 'recursosHumanos') {
      navigate('/recursos-humanos');
    } else if (moduleId === 'gastos') {
      navigate('/gastos');
    }
  };

  // Mapeo de IDs de KPIs a datos visuales
  const kpiDataMap: Record<string, any> = {
    weeklyRevenue: { title: t.kpis.weeklyRevenue, value: '$45,200', change: `+6% ${t.kpis.vsWeekBefore}`, isPositive: true },
    netProfit: { title: t.kpis.netProfit, value: '$28,750', change: `+12% ${t.kpis.thisMonth}`, isPositive: true },
    activeClients: { title: t.kpis.activeClients, value: '245', change: `+18 ${t.kpis.newOnes}`, isPositive: true },
    activeEmployees: { title: t.kpis.activeEmployees, value: '18', change: `+2 ${t.kpis.thisMonth}`, isPositive: true },
    pendingTasks: { title: t.kpis.pendingTasks, value: '12', change: `3 ${t.kpis.dueToday}`, isPositive: false },
    monthlyExpenses: { title: t.kpis.monthlyExpenses, value: '$15,320', change: `+10% ${t.kpis.vsMonthBefore}`, isPositive: false },
    // Datos simulados para otros KPIs
    expensesByCategory: { title: 'Gastos por Categoría', value: '$8,450', change: '+5% vs mes anterior', isPositive: false },
    pendingExpenses: { title: 'Gastos Pendientes', value: '8', change: '2 vencen hoy', isPositive: false },
    pettyCashBalance: { title: 'Saldo Caja Chica', value: '$2,500', change: '-15% vs mes anterior', isPositive: false },
    pettyCashExpenses: { title: 'Gastos Menores del Mes', value: '$1,800', change: '+8% vs mes anterior', isPositive: false },
    monthlyRevenue: { title: 'Ingresos del Mes', value: '$180,500', change: '+15% vs mes anterior', isPositive: true },
    averageTicket: { title: 'Ticket Promedio', value: '$736', change: '+3% vs mes anterior', isPositive: true },
    salesConversion: { title: 'Tasa de Conversión', value: '23%', change: '+2% vs mes anterior', isPositive: true },
    dailySales: { title: 'Ventas del Día', value: '$6,200', change: '+8% vs ayer', isPositive: true },
    transactionsCount: { title: 'Número de Transacciones', value: '142', change: '+12 vs ayer', isPositive: true },
    newHires: { title: 'Nuevas Contrataciones', value: '3', change: 'este mes', isPositive: true },
    employeeTurnover: { title: 'Rotación de Personal', value: '5%', change: '-2% vs mes anterior', isPositive: true },
    absenteeismRate: { title: 'Tasa de Ausentismo', value: '3%', change: '+1% vs mes anterior', isPositive: false },
    payrollCost: { title: 'Costo de Nómina', value: '$45,000', change: '+5% vs mes anterior', isPositive: false },
    newClients: { title: 'Nuevos Clientes', value: '28', change: '+10 vs mes anterior', isPositive: true },
    clientRetention: { title: 'Retención de Clientes', value: '92%', change: '+3% vs mes anterior', isPositive: true },
    customerLifetimeValue: { title: 'Valor de Vida del Cliente', value: '$12,450', change: '+8% vs mes anterior', isPositive: true },
    completedTasks: { title: 'Tareas Completadas', value: '48', change: 'esta semana', isPositive: true },
    taskCompletionRate: { title: 'Tasa de Cumplimiento', value: '87%', change: '+5% vs semana anterior', isPositive: true },
    overdueTasks: { title: 'Tareas Vencidas', value: '5', change: '-2 vs semana anterior', isPositive: true },
    inventoryValue: { title: 'Valor del Inventario', value: '$85,000', change: '+3% vs mes anterior', isPositive: true },
    stockLevel: { title: 'Nivel de Stock', value: '850', change: 'unidades', isPositive: true },
    lowStockItems: { title: 'Productos con Stock Bajo', value: '12', change: '+3 vs semana anterior', isPositive: false },
    inventoryTurnover: { title: 'Rotación de Inventario', value: '4.2x', change: '+0.3 vs mes anterior', isPositive: true },
    pendingMaintenance: { title: 'Mantenimientos Pendientes', value: '6', change: '2 urgentes', isPositive: false },
    maintenanceCost: { title: 'Costo de Mantenimiento', value: '$3,200', change: '+12% vs mes anterior', isPositive: false },
    equipmentUptime: { title: 'Disponibilidad de Equipos', value: '95%', change: '+2% vs mes anterior', isPositive: true },
    invoicesIssued: { title: 'Facturas Emitidas', value: '156', change: 'este mes', isPositive: true },
    pendingInvoices: { title: 'Facturas Pendientes', value: '23', change: '8 vencidas', isPositive: false },
    collectionRate: { title: 'Tasa de Cobro', value: '88%', change: '+3% vs mes anterior', isPositive: true },
    employeeSatisfaction: { title: 'Satisfacción Laboral', value: '8.2/10', change: '+0.5 vs trimestre anterior', isPositive: true },
    engagementScore: { title: 'Nivel de Compromiso', value: '78%', change: '+6% vs trimestre anterior', isPositive: true },
  };

  const kpiData = selectedKPIIds.map(id => kpiDataMap[id]).filter(Boolean);

  const mainModules = [
    { id: 'panelInicial', emoji: '📊', title: t.modules.panelInicial, color: 'purple' as const },
    { id: 'recursosHumanos', emoji: '👥', title: t.modules.recursosHumanos, color: 'blue' as const },
    { id: 'procesosTareas', emoji: '✅', title: t.modules.procesosTareas, color: 'yellow' as const },
    { id: 'gastos', emoji: '💰', title: t.modules.gastos, color: 'green' as const },
    { id: 'cajaChica', emoji: '💳', title: t.modules.cajaChica, color: 'green' as const },
    { id: 'puntoVenta', emoji: '🛒', title: t.modules.puntoVenta, color: 'orange' as const },
    { id: 'ventas', emoji: '💵', title: t.modules.ventas, color: 'orange' as const },
    { id: 'kpis', emoji: '📈', title: t.modules.kpis, color: 'purple' as const },
  ];

  const complementaryModules = [
    { id: 'mantenimiento', emoji: '🔧', title: t.modules.mantenimiento, color: 'gray' as const },
    { id: 'inventarios', emoji: '📦', title: t.modules.inventarios, color: 'gray' as const },
    { id: 'controlMinutas', emoji: '📄', title: t.modules.controlMinutas, color: 'gray' as const },
    { id: 'limpieza', emoji: '🧹', title: t.modules.limpieza, color: 'gray' as const },
    { id: 'lavanderia', emoji: '👕', title: t.modules.lavanderia, color: 'gray' as const },
    { id: 'transportacion', emoji: '🚚', title: t.modules.transportacion, color: 'gray' as const },
    { id: 'vehiculosMaquinaria', emoji: '🚗', title: t.modules.vehiculosMaquinaria, color: 'gray' as const },
    { id: 'inmuebles', emoji: '🏢', title: t.modules.inmuebles, color: 'gray' as const },
    { id: 'formularios', emoji: '📋', title: t.modules.formularios, color: 'gray' as const },
    { id: 'facturacion', emoji: '🧾', title: t.modules.facturacion, color: 'gray' as const },
    { id: 'correoElectronico', emoji: '📧', title: t.modules.correoElectronico, color: 'gray' as const },
    { id: 'climaLaboral', emoji: '😊', title: t.modules.climaLaboral, color: 'gray' as const },
  ];

  const aiModules = [
    { id: 'indiceAgenteVentas', emoji: '🤖', title: t.modules.indiceAgenteVentas, color: 'gold' as const },
    { id: 'indiceAnalitica', emoji: '📊', title: t.modules.indiceAnalitica, color: 'gold' as const },
    { id: 'capacitacion', emoji: '🎓', title: t.modules.capacitacion, color: 'gold' as const },
    { id: 'indiceCoach', emoji: '💬', title: t.modules.indiceCoach, color: 'gold' as const },
  ];

  const favoriteModules = mainModules.filter(module => favorites.includes(module.id));
  const isGuidedLearningVisible = learningModeActive && learningModeVisible;

  return (
    <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-12">
      {/* Modo Aprendiz Banner */}
      {isGuidedLearningVisible && (
        <LearningModeBanner
          isVisible={learningModeVisible}
          onHide={() => setLearningModeVisible(false)}
          currentStep={learningStep}
          totalSteps={8}
          onNext={handleNextStep}
          onPrevious={handlePreviousStep}
        />
      )}

      {/* Sección KPIs - Solo visible cuando Modo Aprendiz está desactivado */}
      {!isGuidedLearningVisible && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                📊 {t.sections.kpis}
              </h2>
              {kpiData.length > 0 && (
                <span className="bg-[#558DBD] text-white text-sm font-medium px-3 py-1 rounded-full">
                  {kpiData.length}
                </span>
              )}
            </div>
            <KPIConfiguration
              isOpen={isKPIConfigOpen}
              onOpen={() => setIsKPIConfigOpen(true)}
              onClose={() => setIsKPIConfigOpen(false)}
              selectedKPIIds={selectedKPIIds}
              onSave={handleSaveKPIs}
            />
          </div>
          {kpiData.length > 0 ? (
            <KPICarousel>
              {kpiData.map((kpi, index) => (
                <KPICard key={index} {...kpi} orderNumber={index + 1} />
              ))}
            </KPICarousel>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No hay KPIs configurados
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Selecciona los KPIs que deseas visualizar para comenzar
              </p>
              <Button 
                onClick={() => setIsKPIConfigOpen(true)}
                className="bg-[#558DBD] hover:bg-[#4a7aa8] text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar KPIs
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Sección Favoritos - Solo visible cuando Modo Aprendiz está desactivado */}
      {!isGuidedLearningVisible && favoriteModules.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              ⭐ {t.sections.favorites}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.quickAccess}</span>
          </div>
          <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
            {favoriteModules.map((module, index) => (
              <ModuleCard
                key={index}
                {...module}
                isFavorite={true}
                onToggleFavorite={() => toggleFavorite(module.id)}
                onClick={() => handleModuleClick(module.id)}
                size="small"
              />
            ))}
          </ModuleCarousel>
        </section>
      )}

      {/* Sección Módulos Principales */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🏢 {t.sections.basicModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.main}</span>
        </div>
        <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
          {mainModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              isFavorite={favorites.includes(module.id)}
              onToggleFavorite={() => toggleFavorite(module.id)}
              onClick={() => handleModuleClick(module.id)}
              size="small"
              stepNumber={isGuidedLearningVisible ? index + 1 : undefined}
              isHighlighted={isGuidedLearningVisible && learningStep === index}
            />
          ))}
        </ModuleCarousel>
      </section>

      {/* Sección Módulos Complementarios */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🔧 {t.sections.complementaryModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.additional}</span>
        </div>
        <ModuleCarousel singleRow={true}>
          {complementaryModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              size="small"
            />
          ))}
        </ModuleCarousel>
      </section>

      {/* Sección Módulos de IA */}
      <section className="pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            🤖 {t.sections.aiModules}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.sections.aiLabel}</span>
        </div>
        <ModuleCarousel gridClasses="grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-10">
          {aiModules.map((module, index) => (
            <ModuleCard
              key={index}
              {...module}
              size="small"
            />
          ))}
        </ModuleCarousel>
      </section>
    </main>
  );
}
