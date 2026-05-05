import { useState } from 'react';
import { Search, Plus, X, Trash2, Edit2, CreditCard, Banknote, Building2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../../components/ui/button';

type PaymentAccount = {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'credit_card' | 'debit_card' | 'digital_wallet';
  accountNumber?: string;
  bank?: string;
  currency: string;
  balance: number;
  isActive: boolean;
  lastTransaction?: string;
};

type SortField = keyof PaymentAccount;
type SortDirection = 'asc' | 'desc' | null;

// Mock data for payment accounts
const mockPaymentAccounts: PaymentAccount[] = [
  {
    id: '1',
    name: 'Cuenta Corriente Principal',
    type: 'bank',
    accountNumber: '****1234',
    bank: 'BBVA Bancomer',
    currency: 'MXN',
    balance: 250000.00,
    isActive: true,
    lastTransaction: '2026-04-01'
  },
  {
    id: '2',
    name: 'Cuenta de Ahorros',
    type: 'bank',
    accountNumber: '****5678',
    bank: 'Santander',
    currency: 'MXN',
    balance: 150000.00,
    isActive: true,
    lastTransaction: '2026-03-30'
  },
  {
    id: '3',
    name: 'Caja Chica',
    type: 'cash',
    currency: 'MXN',
    balance: 15000.00,
    isActive: true,
    lastTransaction: '2026-04-02'
  },
  {
    id: '4',
    name: 'Tarjeta Empresarial',
    type: 'credit_card',
    accountNumber: '****9012',
    bank: 'American Express',
    currency: 'MXN',
    balance: 85000.00,
    isActive: true,
    lastTransaction: '2026-04-01'
  },
  {
    id: '5',
    name: 'Tarjeta Débito Operaciones',
    type: 'debit_card',
    accountNumber: '****3456',
    bank: 'HSBC',
    currency: 'MXN',
    balance: 45000.00,
    isActive: true,
    lastTransaction: '2026-04-02'
  },
  {
    id: '6',
    name: 'PayPal Business',
    type: 'digital_wallet',
    accountNumber: 'business@empresa.com',
    currency: 'USD',
    balance: 12500.00,
    isActive: true,
    lastTransaction: '2026-03-29'
  },
  {
    id: '7',
    name: 'Cuenta USD',
    type: 'bank',
    accountNumber: '****7890',
    bank: 'Citibanamex',
    currency: 'USD',
    balance: 35000.00,
    isActive: true,
    lastTransaction: '2026-03-28'
  },
  {
    id: '8',
    name: 'Tarjeta Corporativa Respaldo',
    type: 'credit_card',
    accountNumber: '****2468',
    bank: 'Visa',
    currency: 'MXN',
    balance: 120000.00,
    isActive: false,
    lastTransaction: '2026-02-15'
  }
];

export default function PaymentAccounts() {
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
  const filteredAccounts = mockPaymentAccounts
    .filter(account => {
      const matchesSearch = 
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.bank?.toLowerCase().includes(searchTerm.toLowerCase());
      
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
      bank: 'Cuenta Bancaria',
      cash: 'Efectivo',
      credit_card: 'Tarjeta de Crédito',
      debit_card: 'Tarjeta de Débito',
      digital_wallet: 'Billetera Digital'
    };
    return types[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      bank: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      cash: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      credit_card: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      debit_card: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      digital_wallet: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-4 h-4" />;
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="w-4 h-4" />;
      case 'digital_wallet':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const locale = currency === 'USD' ? 'en-US' : 'es-MX';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Bar - Green Background */}
      <div className="bg-[#147514] dark:bg-[#0b3f1b] rounded-2xl shadow-sm dark:shadow-black/30 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <span className="text-4xl">💳</span>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Cuentas de Pago
              </h1>
              <p className="text-white/90 text-sm mt-1">
                Administra cuentas bancarias, tarjetas y métodos de pago
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
                placeholder="Nombre, número o banco..."
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
              <option value="bank">Cuenta Bancaria</option>
              <option value="cash">Efectivo</option>
              <option value="credit_card">Tarjeta de Crédito</option>
              <option value="debit_card">Tarjeta de Débito</option>
              <option value="digital_wallet">Billetera Digital</option>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Cuentas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {filteredAccounts.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {filteredAccounts.filter(a => a.isActive).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo MXN</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(
                  filteredAccounts
                    .filter(a => a.currency === 'MXN')
                    .reduce((sum, a) => sum + a.balance, 0),
                  'MXN'
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Banknote className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Saldo USD</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(
                  filteredAccounts
                    .filter(a => a.currency === 'USD')
                    .reduce((sum, a) => sum + a.balance, 0),
                  'USD'
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Banknote className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
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
                  Banco/Emisor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Número de Cuenta
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
                  Última Transacción
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
                  <td colSpan={8} className="px-6 py-12 text-center">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(account.type)}
                        {account.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(account.type)}`}>
                        {getTypeLabel(account.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {account.bank || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                      {account.accountNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(account.balance, account.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {account.lastTransaction ? formatDate(account.lastTransaction) : '-'}
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

      {/* Add Payment Account Modal */}
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
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Cuenta de Pago</h2>
                  <p className="text-gray-800 dark:text-white/90 text-sm">Registra una nueva cuenta o método de pago</p>
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
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nombre de la Cuenta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cuenta Corriente Principal"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Tipo de Cuenta <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all">
                    <option value="">Seleccionar...</option>
                    <option value="bank">Cuenta Bancaria</option>
                    <option value="cash">Efectivo</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                    <option value="debit_card">Tarjeta de Débito</option>
                    <option value="digital_wallet">Billetera Digital</option>
                  </select>
                </div>

                {/* Moneda */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Moneda <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all">
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="USD">USD - Dólar Americano</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="CAD">CAD - Dólar Canadiense</option>
                  </select>
                </div>

                {/* Banco/Emisor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Banco/Emisor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: BBVA Bancomer"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                  />
                </div>

                {/* Número de Cuenta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Número de Cuenta
                  </label>
                  <input
                    type="text"
                    placeholder="****1234"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                  />
                </div>

                {/* Saldo Inicial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Saldo Inicial <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#147514] focus:border-transparent transition-all"
                    />
                  </div>
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
                    // TODO: Implement add payment account logic
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
