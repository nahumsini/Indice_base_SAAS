import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../shared/context';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
  availableKPIs?: KPIItem[];
  defaultKPIIds?: readonly string[];
  copy?: KPIConfigurationCopy;
}

export interface KPIItem {
  id: string;
  title: string;
  module: string;
  moduleEmoji: string;
  moduleColor: string;
  category: 'financial' | 'operational' | 'people' | 'sales' | 'inventory' | 'other';
}

export interface KPIConfigurationCopy {
  title: string;
  description: string;
  availableTitle: (count: number) => string;
  searchPlaceholder: string;
  emptyAvailable: string;
  selectedTitle: (count: number) => string;
  reset: string;
  reorderHint: string;
  emptySelectedTitle: string;
  emptySelectedDescription: string;
  summary: (selected: number, available: number) => string;
  cancel: string;
  save: string;
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
      aqua: { bg: 'bg-[#59C3A5]/10 dark:bg-[#59C3A5]/20', text: 'text-[#257B68] dark:text-[#8FE0CA]', border: 'border-[#59C3A5]/30 dark:border-[#59C3A5]/35' },
      blue: { bg: 'bg-[#2563EB]/10 dark:bg-[#2563EB]/20', text: 'text-[#2563EB] dark:text-[#93C5FD]', border: 'border-[#2563EB]/25 dark:border-[#2563EB]/35' },
      coral: { bg: 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/20', text: 'text-[#B63B32] dark:text-[#FFB0AA]', border: 'border-[#FF6B5E]/25 dark:border-[#FF6B5E]/35' },
      yellow: { bg: 'bg-[#F4C84A]/15 dark:bg-[#F4C84A]/20', text: 'text-[#9A6B05] dark:text-[#FEF3C7]', border: 'border-[#F4C84A]/35 dark:border-[#F4C84A]/40' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
      orange: { bg: 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/20', text: 'text-[#B63B32] dark:text-[#FFB0AA]', border: 'border-[#FF6B5E]/25 dark:border-[#FF6B5E]/35' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
      gold: { bg: 'bg-[#F4C84A]/15 dark:bg-[#F4C84A]/20', text: 'text-[#9A6B05] dark:text-[#FEF3C7]', border: 'border-[#F4C84A]/35 dark:border-[#F4C84A]/40' },
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
        hover:border-[#2563EB] transition-all cursor-move relative
      `}
    >
      {/* Display order indicator */}
      <div className="bg-[#2563EB] text-white text-xs font-bold px-2 py-1 rounded">
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

export function KPIConfiguration({
  isOpen,
  onOpen,
  onClose,
  selectedKPIIds,
  onSave,
  availableKPIs: providedAvailableKPIs,
  defaultKPIIds,
  copy,
}: KPIConfigurationProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedKPIs, setTempSelectedKPIs] = useState<string[]>(selectedKPIIds);

  const fallbackCopy = useMemo<KPIConfigurationCopy>(() => ({
    title: t.sections.configureKpis,
    description: 'Select and order the KPIs you want to see on your dashboard.',
    availableTitle: (count) => `Available KPIs (${count})`,
    searchPlaceholder: 'Search KPIs...',
    emptyAvailable: 'No KPIs found.',
    selectedTitle: (count) => `Selected KPIs (${count})`,
    reset: 'Reset',
    reorderHint: 'Drag to reorder the KPIs based on your preference.',
    emptySelectedTitle: 'No KPIs selected',
    emptySelectedDescription: 'Select KPIs from the list on the left.',
    summary: (selected, available) => `${selected} KPIs selected out of ${available} available`,
    cancel: 'Cancel',
    save: 'Save Configuration',
  }), [t]);
  const resolvedCopy = copy ?? fallbackCopy;

  // Define all available KPIs grouped by module
  const fallbackAvailableKPIs = useMemo<KPIItem[]>(() => [
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
  ], [t]);
  const availableKPIs = providedAvailableKPIs ?? fallbackAvailableKPIs;

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
  }, [availableKPIs, isOpen, selectedKPIIds]);

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
    const defaultKPIs = [...(defaultKPIIds ?? ['weeklyRevenue', 'netProfit', 'activeClients', 'activeEmployees', 'pendingTasks', 'monthlyExpenses'])];
    setTempSelectedKPIs(defaultKPIs);
    setOrderedKPIs(defaultKPIs.map(id => availableKPIs.find(kpi => kpi.id === id)!).filter(Boolean));
  };

  const getModuleColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      aqua: { bg: 'bg-[#59C3A5]/10 dark:bg-[#59C3A5]/20', text: 'text-[#257B68] dark:text-[#8FE0CA]', border: 'border-[#59C3A5]/30 dark:border-[#59C3A5]/35' },
      blue: { bg: 'bg-[#2563EB]/10 dark:bg-[#2563EB]/20', text: 'text-[#2563EB] dark:text-[#93C5FD]', border: 'border-[#2563EB]/25 dark:border-[#2563EB]/35' },
      coral: { bg: 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/20', text: 'text-[#B63B32] dark:text-[#FFB0AA]', border: 'border-[#FF6B5E]/25 dark:border-[#FF6B5E]/35' },
      yellow: { bg: 'bg-[#F4C84A]/15 dark:bg-[#F4C84A]/20', text: 'text-[#9A6B05] dark:text-[#FEF3C7]', border: 'border-[#F4C84A]/35 dark:border-[#F4C84A]/40' },
      green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-700' },
      red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-700' },
      orange: { bg: 'bg-[#FF6B5E]/10 dark:bg-[#FF6B5E]/20', text: 'text-[#B63B32] dark:text-[#FFB0AA]', border: 'border-[#FF6B5E]/25 dark:border-[#FF6B5E]/35' },
      purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
      gold: { bg: 'bg-[#F4C84A]/15 dark:bg-[#F4C84A]/20', text: 'text-[#9A6B05] dark:text-[#FEF3C7]', border: 'border-[#F4C84A]/35 dark:border-[#F4C84A]/40' },
      gray: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <>
      {/* Configuration trigger */}
      <Button variant="outline" size="sm" onClick={onOpen} className="w-full justify-center sm:w-auto">
        <Settings className="h-4 w-4 mr-2" />
        {resolvedCopy.title}
      </Button>

      {/* Configuration modal */}
      {isOpen && (
        <DndProvider backend={HTML5Backend}>
          <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/50 p-2 backdrop-blur-sm duration-200 fade-in sm:p-4">
            <div className="flex max-h-[calc(100vh-1rem)] w-full max-w-6xl animate-in flex-col overflow-hidden rounded-xl bg-white shadow-2xl duration-200 zoom-in-95 dark:bg-gray-800 sm:max-h-[90vh]">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 bg-[#2563EB] p-4 sm:p-6">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0 rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white sm:text-2xl">
                      {resolvedCopy.title}
                    </h2>
                    <p className="text-sm text-white/80 mt-0.5">
                      {resolvedCopy.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="shrink-0 rounded-full text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Main content */}
              <div className="flex-1 overflow-y-auto md:flex md:overflow-hidden">
                {/* Left column - available KPIs */}
                <div className="flex min-h-[280px] w-full flex-col border-b border-gray-200 dark:border-gray-700 md:w-1/2 md:border-b-0 md:border-r">
                  <div className="border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-3">
                      {resolvedCopy.availableTitle(filteredAvailableKPIs.length)}
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={resolvedCopy.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <ScrollArea className="min-h-[220px] flex-1 p-4 sm:p-6">
                    <div className="space-y-2">
                      {filteredAvailableKPIs.map((kpi) => {
                        const colorClasses = getModuleColorClasses(kpi.moduleColor);
                        return (
                          <div
                            key={kpi.id}
                            className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-[#2563EB] transition-all bg-white dark:bg-gray-800/50"
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
                          <p className="text-gray-500 dark:text-gray-400">{resolvedCopy.emptyAvailable}</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right column - selected KPIs */}
                <div className="flex min-h-[280px] w-full flex-col md:w-1/2">
                  <div className="border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                        {resolvedCopy.selectedTitle(orderedKPIs.length)}
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="w-full text-xs sm:w-auto"
                      >
                        <RotateCcw className="h-3 w-3 mr-2" />
                        {resolvedCopy.reset}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {resolvedCopy.reorderHint}
                    </p>
                  </div>
                  <ScrollArea className="min-h-[220px] flex-1 p-4 sm:p-6">
                    {orderedKPIs.length === 0 ? (
                      <div className="text-center py-12">
                        <Eye className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-1">
                          {resolvedCopy.emptySelectedTitle}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                          {resolvedCopy.emptySelectedDescription}
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
              <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {resolvedCopy.summary(orderedKPIs.length, availableKPIs.length)}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                    {resolvedCopy.cancel}
                  </Button>
                  <Button onClick={handleSave} className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] sm:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    {resolvedCopy.save}
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
