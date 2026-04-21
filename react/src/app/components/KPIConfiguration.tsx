import { useState, useEffect } from 'react';
import { useLanguage } from '../shared/context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical, EyeOff, Eye, X, Search, Save, RotateCcw, Settings } from 'lucide-react';

interface KPIConfigurationProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  selectedKPIIds: string[];
  onSave: (kpis: string[]) => void;
}

interface KPIItem {
  id: string;
  title: string;
  module: string;
  moduleEmoji: string;
  moduleColor: string;
  category: 'financial' | 'operational' | 'people' | 'sales' | 'inventory' | 'other';
}

interface DraggableKPIProps {
  kpi: KPIItem;
  index: number;
  moveKPI: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (id: string) => void;
}

const DraggableKPI = ({ kpi, index, moveKPI, onRemove }: DraggableKPIProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'KPI',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'KPI',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveKPI(item.index, index);
        item.index = index;
      }
    },
  });

  const getModuleColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
      gold: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
      gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
    };
    return colorMap[color] || colorMap.blue;
  };

  const colorClasses = getModuleColorClasses(kpi.moduleColor);

  return (
    <div
      ref={(node) => {
        if (node) {
          drag(drop(node));
        }
      }}
      className={`
        flex items-center gap-3 p-3 rounded-lg border-2 bg-white dark:bg-gray-800
        ${isDragging ? 'opacity-50 border-blue-400' : 'border-gray-200 dark:border-gray-700'}
        hover:border-[#558DBD] transition-all cursor-move relative
      `}
    >
      {/* Indicador de orden */}
      <div className="bg-[#558DBD] text-white text-xs font-bold px-2 py-1 rounded">
        #{index + 1}
      </div>
      <GripVertical className="h-5 w-5 text-gray-400" />
      <div className={`w-8 h-8 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center text-sm`}>
        {kpi.moduleEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{kpi.title}</p>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}>
          {kpi.module}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(kpi.id)}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <EyeOff className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function KPIConfiguration({ isOpen, onOpen, onClose, selectedKPIIds, onSave }: KPIConfigurationProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedKPIs, setTempSelectedKPIs] = useState<string[]>(selectedKPIIds);

  // Define all available KPIs grouped by module
  const availableKPIs: KPIItem[] = [
    // Financial KPIs - Expenses
    { id: 'monthlyExpenses', title: t.kpis.monthlyExpenses, module: t.modules.gastos, moduleEmoji: '💰', moduleColor: 'green', category: 'financial' },
    { id: 'expensesByCategory', title: 'Expenses by Category', module: t.modules.gastos, moduleEmoji: '💰', moduleColor: 'green', category: 'financial' },
    { id: 'pendingExpenses', title: 'Pending Expenses', module: t.modules.gastos, moduleEmoji: '💰', moduleColor: 'green', category: 'financial' },
    
    // Financial KPIs - Petty Cash
    { id: 'pettyCashBalance', title: 'Petty Cash Balance', module: t.modules.cajaChica, moduleEmoji: '💳', moduleColor: 'green', category: 'financial' },
    { id: 'pettyCashExpenses', title: 'Monthly Petty Cash Expenses', module: t.modules.cajaChica, moduleEmoji: '💳', moduleColor: 'green', category: 'financial' },
    
    // Sales KPIs - Sales
    { id: 'weeklyRevenue', title: t.kpis.weeklyRevenue, module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    { id: 'monthlyRevenue', title: 'Monthly Revenue', module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    { id: 'netProfit', title: t.kpis.netProfit, module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'financial' },
    { id: 'averageTicket', title: 'Average Ticket', module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    { id: 'salesConversion', title: 'Sales Conversion Rate', module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    
    // Sales KPIs - Point of Sale
    { id: 'dailySales', title: 'Daily Sales', module: t.modules.puntoVenta, moduleEmoji: '🛒', moduleColor: 'orange', category: 'sales' },
    { id: 'transactionsCount', title: 'Transactions', module: t.modules.puntoVenta, moduleEmoji: '🛒', moduleColor: 'orange', category: 'sales' },
    
    // People KPIs - Human Resources
    { id: 'activeEmployees', title: t.kpis.activeEmployees, module: t.modules.recursosHumanos, moduleEmoji: '👥', moduleColor: 'blue', category: 'people' },
    { id: 'newHires', title: 'New Hires', module: t.modules.recursosHumanos, moduleEmoji: '👥', moduleColor: 'blue', category: 'people' },
    { id: 'employeeTurnover', title: 'Employee Turnover', module: t.modules.recursosHumanos, moduleEmoji: '👥', moduleColor: 'blue', category: 'people' },
    { id: 'absenteeismRate', title: 'Absenteeism Rate', module: t.modules.recursosHumanos, moduleEmoji: '👥', moduleColor: 'blue', category: 'people' },
    { id: 'payrollCost', title: 'Payroll Cost', module: t.modules.recursosHumanos, moduleEmoji: '👥', moduleColor: 'blue', category: 'financial' },
    
    // Client KPIs - Sales
    { id: 'activeClients', title: t.kpis.activeClients, module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    { id: 'newClients', title: 'New Clients', module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    { id: 'clientRetention', title: 'Client Retention', module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    { id: 'customerLifetimeValue', title: 'Customer Lifetime Value', module: t.modules.ventas, moduleEmoji: '💵', moduleColor: 'orange', category: 'sales' },
    
    // Operational KPIs - Processes and Tasks
    { id: 'pendingTasks', title: t.kpis.pendingTasks, module: t.modules.procesosTareas, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    { id: 'completedTasks', title: 'Completed Tasks', module: t.modules.procesosTareas, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    { id: 'taskCompletionRate', title: 'Task Completion Rate', module: t.modules.procesosTareas, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    { id: 'overdueTasks', title: 'Overdue Tasks', module: t.modules.procesosTareas, moduleEmoji: '✅', moduleColor: 'yellow', category: 'operational' },
    
    // Inventory KPIs
    { id: 'inventoryValue', title: 'Inventory Value', module: t.modules.inventarios, moduleEmoji: '📦', moduleColor: 'gray', category: 'inventory' },
    { id: 'stockLevel', title: 'Stock Level', module: t.modules.inventarios, moduleEmoji: '📦', moduleColor: 'gray', category: 'inventory' },
    { id: 'lowStockItems', title: 'Low Stock Items', module: t.modules.inventarios, moduleEmoji: '📦', moduleColor: 'gray', category: 'inventory' },
    { id: 'inventoryTurnover', title: 'Inventory Turnover', module: t.modules.inventarios, moduleEmoji: '📦', moduleColor: 'gray', category: 'inventory' },
    
    // Maintenance KPIs
    { id: 'pendingMaintenance', title: 'Pending Maintenance', module: t.modules.mantenimiento, moduleEmoji: '🔧', moduleColor: 'gray', category: 'operational' },
    { id: 'maintenanceCost', title: 'Maintenance Cost', module: t.modules.mantenimiento, moduleEmoji: '🔧', moduleColor: 'gray', category: 'financial' },
    { id: 'equipmentUptime', title: 'Equipment Uptime', module: t.modules.mantenimiento, moduleEmoji: '🔧', moduleColor: 'gray', category: 'operational' },
    
    // Invoicing KPIs
    { id: 'invoicesIssued', title: 'Invoices Issued', module: t.modules.facturacion, moduleEmoji: '🧾', moduleColor: 'gray', category: 'financial' },
    { id: 'pendingInvoices', title: 'Pending Invoices', module: t.modules.facturacion, moduleEmoji: '🧾', moduleColor: 'gray', category: 'financial' },
    { id: 'collectionRate', title: 'Collection Rate', module: t.modules.facturacion, moduleEmoji: '🧾', moduleColor: 'gray', category: 'financial' },
    
    // Work Climate KPIs
    { id: 'employeeSatisfaction', title: 'Employee Satisfaction', module: t.modules.climaLaboral, moduleEmoji: '😊', moduleColor: 'gray', category: 'people' },
    { id: 'engagementScore', title: 'Engagement Score', module: t.modules.climaLaboral, moduleEmoji: '😊', moduleColor: 'gray', category: 'people' },
  ];

  const [orderedKPIs, setOrderedKPIs] = useState<KPIItem[]>(
    tempSelectedKPIs.map(id => availableKPIs.find(kpi => kpi.id === id)!).filter(Boolean)
  );

  // Sync state each time the modal is opened
  useEffect(() => {
    if (isOpen) {
      setTempSelectedKPIs(selectedKPIIds);
      setOrderedKPIs(selectedKPIIds.map(id => availableKPIs.find(kpi => kpi.id === id)!).filter(Boolean));
      setSearchQuery('');
    }
  }, [isOpen, selectedKPIIds]);

  const filteredAvailableKPIs = availableKPIs.filter(kpi => {
    const matchesSearch = kpi.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          kpi.module.toLowerCase().includes(searchQuery.toLowerCase());
    const notSelected = !tempSelectedKPIs.includes(kpi.id);
    return matchesSearch && notSelected;
  });

  const handleToggleKPI = (kpiId: string) => {
    if (tempSelectedKPIs.includes(kpiId)) {
      setTempSelectedKPIs(tempSelectedKPIs.filter(id => id !== kpiId));
      setOrderedKPIs(orderedKPIs.filter(kpi => kpi.id !== kpiId));
    } else {
      setTempSelectedKPIs([...tempSelectedKPIs, kpiId]);
      const kpiToAdd = availableKPIs.find(kpi => kpi.id === kpiId);
      if (kpiToAdd) {
        setOrderedKPIs([...orderedKPIs, kpiToAdd]);
      }
    }
  };

  const moveKPI = (dragIndex: number, hoverIndex: number) => {
    const newOrderedKPIs = [...orderedKPIs];
    const draggedKPI = newOrderedKPIs[dragIndex];
    newOrderedKPIs.splice(dragIndex, 1);
    newOrderedKPIs.splice(hoverIndex, 0, draggedKPI);
    setOrderedKPIs(newOrderedKPIs);
  };

  const handleSave = () => {
    const orderedIds = orderedKPIs.map(kpi => kpi.id);
    onSave(orderedIds);
    onClose();
  };

  const handleReset = () => {
    // Reset to the default KPI selection
    const defaultKPIs = ['weeklyRevenue', 'netProfit', 'activeClients', 'activeEmployees', 'pendingTasks', 'monthlyExpenses'];
    setTempSelectedKPIs(defaultKPIs);
    setOrderedKPIs(defaultKPIs.map(id => availableKPIs.find(kpi => kpi.id === id)!).filter(Boolean));
  };

  const getModuleColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-700' },
      yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
      orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
      gold: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
      gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <>
      {/* Configuration trigger */}
      <Button variant="outline" size="sm" onClick={onOpen}>
        <Settings className="h-4 w-4 mr-2" />
        {t.sections.configureKpis}
      </Button>

      {/* Configuration modal */}
      {isOpen && (
        <DndProvider backend={HTML5Backend}>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="bg-[#558DBD] p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {t.sections.configureKpis}
                    </h2>
                    <p className="text-sm text-white/80 mt-0.5">
                      Select and order the KPIs you want to see on your dashboard.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Main content - 2 columns */}
              <div className="flex-1 overflow-hidden flex">
                {/* Left column - available KPIs */}
                <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                      Available KPIs ({filteredAvailableKPIs.length})
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search KPIs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-2">
                      {filteredAvailableKPIs.map((kpi) => {
                        const colorClasses = getModuleColorClasses(kpi.moduleColor);
                        return (
                          <div
                            key={kpi.id}
                            className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-[#558DBD] transition-all bg-white dark:bg-gray-800/50"
                          >
                            <Checkbox
                              id={kpi.id}
                              checked={tempSelectedKPIs.includes(kpi.id)}
                              onCheckedChange={() => handleToggleKPI(kpi.id)}
                            />
                            <div className={`w-8 h-8 rounded-lg ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center text-sm`}>
                              {kpi.moduleEmoji}
                            </div>
                            <label htmlFor={kpi.id} className="flex-1 min-w-0 cursor-pointer">
                              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{kpi.title}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}`}>
                                {kpi.module}
                              </span>
                            </label>
                          </div>
                        );
                      })}
                      {filteredAvailableKPIs.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-500 dark:text-gray-400">No KPIs found.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right column - selected KPIs */}
                <div className="w-1/2 flex flex-col">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        Selected KPIs ({orderedKPIs.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-2" />
                        Reset
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Drag to reorder the KPIs based on your preference.
                    </p>
                  </div>
                  <ScrollArea className="flex-1 p-6">
                    {orderedKPIs.length === 0 ? (
                      <div className="text-center py-12">
                        <Eye className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-1">
                          No KPIs selected
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                          Select KPIs from the list on the left.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orderedKPIs.map((kpi, index) => (
                          <DraggableKPI
                            key={kpi.id}
                            kpi={kpi}
                            index={index}
                            moveKPI={moveKPI}
                            onRemove={handleToggleKPI}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {orderedKPIs.length} KPIs selected out of {availableKPIs.length} available
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="bg-[#558DBD] hover:bg-[#4a7aa8] text-white">
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DndProvider>
      )}
    </>
  );
}
