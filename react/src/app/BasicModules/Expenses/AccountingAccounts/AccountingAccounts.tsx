import { useState } from 'react';
import { Search, Plus, X, Trash2, Edit2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../../components/ui/button';

type AccountingAccount = {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parentAccount?: string;
  description?: string;
  isActive: boolean;
  balance: number;
};

type SortField = keyof AccountingAccount;
type SortDirection = 'asc' | 'desc' | null;

// Mock data for accounting accounts
const mockAccounts: AccountingAccount[] = [
  {
    id: '1',
    code: '5110',
    name: 'Gastos de Oficina',
    type: 'expense',
    description: 'Gastos generales de oficina y suministros',
    isActive: true,
    balance: 15000.00
  },
  {
    id: '2',
    code: '5120',
    name: 'Servicios Públicos',
    type: 'expense',
    description: 'Electricidad, agua, gas, internet',
    isActive: true,
    balance: 8500.00
  },
  {
    id: '3',
    code: '5130',
    name: 'Mantenimiento',
    type: 'expense',
    description: 'Mantenimiento de equipos e instalaciones',
    isActive: true,
    balance: 12000.00
  },
  {
    id: '4',
    code: '5140',
    name: 'Publicidad y Marketing',
    type: 'expense',
    description: 'Gastos en publicidad, marketing y promoción',
    isActive: true,
    balance: 25000.00
  },
  {
    id: '5',
    code: '5150',
    name: 'Honorarios Profesionales',
    type: 'expense',
    description: 'Servicios de consultores, abogados, contadores',
    isActive: true,
    balance: 30000.00
  },
  {
    id: '6',
    code: '5160',
    name: 'Seguros',
    type: 'expense',
    description: 'Pólizas de seguros diversos',
    isActive: true,
    balance: 18000.00
  },
  {
    id: '7',
    code: '5170',
    name: 'Arrendamiento',
    type: 'expense',
    description: 'Renta de oficinas y locales',
    isActive: true,
    balance: 40000.00
  },
  {
    id: '8',
    code: '1110',
    name: 'Caja',
    type: 'asset',
    description: 'Efectivo en caja',
    isActive: true,
    balance: 50000.00
  },
  {
    id: '9',
    code: '1120',
    name: 'Bancos',
    type: 'asset',
    description: 'Cuentas bancarias',
    isActive: true,
    balance: 250000.00
  },
  {
    id: '10',
    code: '2110',
    name: 'Proveedores',
    type: 'liability',
    description: 'Cuentas por pagar a proveedores',
    isActive: true,
    balance: 85000.00
  }
];

export default function AccountingAccounts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 text-[#147514]" />;
    }
    return <ArrowDown className="h-4 w-4 text-[#147514]" />;
  };

  // Filter and sort accounts
  const filteredAccounts = mockAccounts
    .filter(account => {
      const matchesSearch = 
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || account.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && account.isActive) ||
        (statusFilter === 'inactive' && !account.isActive);
      
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;
      
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      asset: 'Activo',
      liability: 'Pasivo',
      equity: 'Capital',
      income: 'Ingreso',
      expense: 'Gasto'
    };
    return types[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      liability: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      income: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Title Bar - Green Background */}
      <div className="bg-[#147514] dark:bg-[#0b3f1b] rounded-2xl shadow-sm dark:shadow-black/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <span className="text-4xl">📊</span>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Cuentas Contables
              </h1>
              <p className="text-white/90 text-sm mt-1">
                Administra el catálogo de cuentas contables
              </p>
            </div>
          </div>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 bg-white dark:bg-gray-800 text-[#147514] hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm font-semibold transition-all rounded-lg px-5 py-2.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Cuenta
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Código, nombre o descripción..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Tipo de Cuenta
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
            >
              <option value="all">Todos los tipos</option>
              <option value="asset">Activo</option>
              <option value="liability">Pasivo</option>
              <option value="equity">Capital</option>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
            >
              <option value="all">Todos</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Cuentas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {filteredAccounts.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Activas</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {filteredAccounts.filter(a => a.isActive).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Inactivas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {filteredAccounts.filter(a => !a.isActive).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(filteredAccounts.reduce((sum, a) => sum + a.balance, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('code')}
                    className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                  >
                    <span>Código</span>
                    {getSortIcon('code')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                  >
                    <span>Nombre</span>
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                  >
                    <span>Tipo</span>
                    {getSortIcon('type')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('balance')}
                    className="flex items-center gap-1 hover:text-[#147514] transition-colors"
                  >
                    <span>Saldo</span>
                    {getSortIcon('balance')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <Search className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No se encontraron cuentas</p>
                      <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {account.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {account.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(account.type)}`}>
                        {getTypeLabel(account.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {account.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(account.balance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        account.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {account.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Modal Header */}
            <div className="bg-[#147514] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Cuenta Contable</h2>
                  <p className="text-gray-800 dark:text-white/90 text-sm">Agrega una nueva cuenta al catálogo</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-800 dark:text-white/80 hover:text-gray-900 dark:hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Código */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 5110"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Tipo de Cuenta <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all">
                    <option value="">Seleccionar...</option>
                    <option value="asset">Activo</option>
                    <option value="liability">Pasivo</option>
                    <option value="equity">Capital</option>
                    <option value="income">Ingreso</option>
                    <option value="expense">Gasto</option>
                  </select>
                </div>

                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gastos de Oficina"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                  />
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Descripción de la cuenta..."
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Estado
                  </label>
                  <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all">
                    <option value="true">Activa</option>
                    <option value="false">Inactiva</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="text-red-500">*</span> Campos obligatorios
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement add account logic
                    setIsAddModalOpen(false);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#147514] hover:bg-[#105010] rounded-lg transition-colors shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Crear Cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
