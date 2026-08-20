import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Plus, Edit2, Trash2, Users, UserCheck, UserX, DollarSign, User, CreditCard, FileText } from 'lucide-react';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { buildSalesContactInputFromPointOfSale, buildSalesContactPatchFromPointOfSale } from '../../CommerceCore/posCustomerMutations';
import { usePointOfSaleCustomers } from '../../CommerceCore/usePointOfSaleCustomers';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import { type Customer, type CustomerStatus } from '../shared/commercial/customers';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
} from '../shared/components/PointOfSaleTitleBar';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';
import { AddCustomerModal } from './components/AddCustomerModal';
import { AccountStatementModal } from './components/AccountStatementModal';

type CustomerTableColumn = 'customer' | 'email' | 'phone' | 'type' | 'totalPurchases' | 'balance' | 'lastPurchase' | 'status';
type CustomerTableResizableColumn = CustomerTableColumn | 'actions';
type CustomerTableSortDirection = 'asc' | 'desc';
type CustomerTableColumnWidths = Record<CustomerTableResizableColumn, number>;

const CUSTOMER_TABLE_COLUMN_WIDTHS_STORAGE_KEY = 'indice:pos:customers:column-widths:v1';
const CUSTOMER_TABLE_MAX_COLUMN_WIDTH = 720;
const CUSTOMER_TABLE_LABELS: Record<CustomerTableResizableColumn, string> = {
  customer: 'Cliente',
  email: 'Email',
  phone: 'Teléfono',
  type: 'Tipo',
  totalPurchases: 'Total compras',
  balance: 'Saldo',
  lastPurchase: 'Última compra',
  status: 'Estado',
  actions: 'Acciones',
};
const CUSTOMER_TABLE_DEFAULT_WIDTHS: CustomerTableColumnWidths = {
  customer: 250,
  email: 250,
  phone: 160,
  type: 140,
  totalPurchases: 170,
  balance: 140,
  lastPurchase: 170,
  status: 130,
  actions: 200,
};
const CUSTOMER_TABLE_CONTENT_MINIMUM_WIDTHS: CustomerTableColumnWidths = {
  customer: 210,
  email: 210,
  phone: 150,
  type: 120,
  totalPurchases: 150,
  balance: 120,
  lastPurchase: 150,
  status: 120,
  actions: 200,
};

function estimateCustomerTableHeaderWidth(label: string, sortable: boolean) {
  const textWidth = Array.from(label).reduce((width, character) => width + (character === ' ' ? 4 : 7.4), 0);
  return Math.ceil(textWidth + (sortable ? 76 : 54));
}

function getCustomerTableMinimumWidths(): CustomerTableColumnWidths {
  return Object.fromEntries(
    (Object.keys(CUSTOMER_TABLE_LABELS) as CustomerTableResizableColumn[]).map((column) => [
      column,
      Math.max(
        CUSTOMER_TABLE_CONTENT_MINIMUM_WIDTHS[column],
        estimateCustomerTableHeaderWidth(CUSTOMER_TABLE_LABELS[column], column !== 'actions'),
      ),
    ]),
  ) as CustomerTableColumnWidths;
}

function getDefaultCustomerTableColumnWidths(minimumWidths: CustomerTableColumnWidths): CustomerTableColumnWidths {
  return Object.fromEntries(
    (Object.keys(CUSTOMER_TABLE_DEFAULT_WIDTHS) as CustomerTableResizableColumn[]).map((column) => [
      column,
      Math.max(CUSTOMER_TABLE_DEFAULT_WIDTHS[column], minimumWidths[column]),
    ]),
  ) as CustomerTableColumnWidths;
}

function loadCustomerTableColumnWidths(minimumWidths: CustomerTableColumnWidths): CustomerTableColumnWidths {
  const defaults = getDefaultCustomerTableColumnWidths(minimumWidths);
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = JSON.parse(window.localStorage.getItem(CUSTOMER_TABLE_COLUMN_WIDTHS_STORAGE_KEY) ?? 'null') as Partial<CustomerTableColumnWidths> | null;
    const columns = Object.keys(defaults) as CustomerTableResizableColumn[];
    if (!stored || !columns.every((column) => (
      Number.isFinite(stored[column])
      && Number(stored[column]) >= minimumWidths[column]
      && Number(stored[column]) <= CUSTOMER_TABLE_MAX_COLUMN_WIDTH
    ))) return defaults;
    return { ...defaults, ...stored } as CustomerTableColumnWidths;
  } catch {
    return defaults;
  }
}

function resizeCustomerTableColumn(
  widths: CustomerTableColumnWidths,
  column: CustomerTableResizableColumn,
  delta: number,
  minimumWidth: number,
) {
  return {
    ...widths,
    [column]: Math.round(Math.min(Math.max(widths[column] + delta, minimumWidth), CUSTOMER_TABLE_MAX_COLUMN_WIDTH)),
  };
}

export default function Clientes() {
  const { addContact, updateContact } = useSalesCrm();
  const sharedCustomers = usePointOfSaleCustomers();
  const minimumColumnWidths = useMemo(() => getCustomerTableMinimumWidths(), []);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);
  const [deletedCustomerIds, setDeletedCustomerIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAccountStatementModal, setShowAccountStatementModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [customerPendingDeletion, setCustomerPendingDeletion] = useState<Customer | null>(null);
  const [notice, setNotice] = useState('');
  const [sortKey, setSortKey] = useState<CustomerTableColumn>('customer');
  const [sortDirection, setSortDirection] = useState<CustomerTableSortDirection>('asc');
  const [columnWidths, setColumnWidths] = useState<CustomerTableColumnWidths>(() => loadCustomerTableColumnWidths(minimumColumnWidths));

  useEffect(() => {
    try {
      window.localStorage.setItem(CUSTOMER_TABLE_COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {
      // Column resizing remains available when browser storage is unavailable.
    }
  }, [columnWidths]);

  const customers = useMemo(() => {
    const sharedCustomerIds = new Set(sharedCustomers.map((customer) => customer.id));
    const localCustomerById = new Map(localCustomers.map((customer) => [customer.id, customer]));
    const mergedCustomers = [
      ...sharedCustomers.map((customer) => localCustomerById.get(customer.id) ?? customer),
      ...localCustomers.filter((customer) => !sharedCustomerIds.has(customer.id)),
    ];

    return mergedCustomers.filter((customer) => !deletedCustomerIds.includes(customer.id));
  }, [deletedCustomerIds, localCustomers, sharedCustomers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = searchTerm === '' ||
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        (customer.rfc && customer.rfc.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);
  const sortedCustomers = useMemo(() => [...filteredCustomers].sort((left, right) => {
    const primary = compareCustomers(left, right, sortKey);
    const directional = sortDirection === 'asc' ? primary : -primary;
    return directional || left.id.localeCompare(right.id, 'es-MX', { numeric: true, sensitivity: 'base' });
  }), [filteredCustomers, sortDirection, sortKey]);
  const customersPaginationResetKey = useMemo(
    () => `${searchTerm}:${statusFilter}:${sortKey}:${sortDirection}:${sortedCustomers.map((customer) => customer.id).join('|')}`,
    [searchTerm, sortDirection, sortKey, sortedCustomers, statusFilter],
  );
  const customersPagination = useTablePagination({
    resetKey: customersPaginationResetKey,
    rows: sortedCustomers,
  });
  const tableWidth = (Object.keys(columnWidths) as CustomerTableResizableColumn[])
    .reduce((total, column) => total + columnWidths[column], 0);
  const defaultColumnWidths = useMemo(
    () => getDefaultCustomerTableColumnWidths(minimumColumnWidths),
    [minimumColumnWidths],
  );

  const sortBy = (column: CustomerTableColumn) => {
    if (column === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(column);
    setSortDirection('asc');
  };

  const resizeColumnBy = (column: CustomerTableResizableColumn, delta: number) => {
    setColumnWidths((current) => resizeCustomerTableColumn(current, column, delta, minimumColumnWidths[column]));
  };

  const startColumnResize = (event: React.PointerEvent<HTMLSpanElement>, column: CustomerTableResizableColumn) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidths = { ...columnWidths };
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      setColumnWidths(resizeCustomerTableColumn(
        startWidths,
        column,
        pointerEvent.clientX - startX,
        minimumColumnWidths[column],
      ));
    };
    const stopColumnResize = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopColumnResize);
      window.removeEventListener('pointercancel', stopColumnResize);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopColumnResize);
    window.addEventListener('pointercancel', stopColumnResize);
  };

  const resetColumnWidths = () => setColumnWidths(defaultColumnWidths);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = customers.filter(c => c.status === 'inactive').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalPurchases, 0);
    const totalBalance = customers.reduce((sum, c) => sum + c.currentBalance, 0);

    return {
      total: customers.length,
      active,
      inactive,
      totalRevenue,
      totalBalance,
    };
  }, [customers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const handleAddCustomer = (customerData: Partial<Customer>) => {
    const customerId = customerData.id ?? selectedCustomer?.id;
    const currentCustomer = customerId ? customers.find((customer) => customer.id === customerId) : undefined;

    if (currentCustomer) {
      const updatedCustomer: Customer = {
        ...currentCustomer,
        ...customerData,
        id: currentCustomer.id,
        createdAt: currentCustomer.createdAt,
      };

      const isSharedCustomer = sharedCustomers.some((customer) => customer.id === currentCustomer.id);
      if (isSharedCustomer) {
        updateContact(currentCustomer.id, buildSalesContactPatchFromPointOfSale(updatedCustomer));
        setNotice('Cliente actualizado en Contactos de Sales y disponible para POS.');
      } else {
        setLocalCustomers((current) => [
          updatedCustomer,
          ...current.filter((customer) => customer.id !== updatedCustomer.id),
        ]);
        setNotice('Cliente local POS actualizado.');
      }
      return;
    }

    const newCustomer: Customer = {
      id: `customer-${Date.now()}`,
      createdAt: new Date(),
      status: 'active',
      totalPurchases: 0,
      currentBalance: 0,
      loyaltyPoints: 0,
      ...customerData as Customer,
    };
    addContact(buildSalesContactInputFromPointOfSale(newCustomer));
    setNotice('Cliente creado en Contactos de Sales y disponible para POS.');
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAddModal(true);
  };

  const handleDeleteCustomer = (id: string) => {
    if (sharedCustomers.some((customer) => customer.id === id)) {
      updateContact(id, { status: 'Inactive' });
      setNotice('Cliente desactivado para POS sin borrar el contacto maestro.');
      return;
    }

    setLocalCustomers((current) => current.filter((customer) => customer.id !== id));
    setDeletedCustomerIds((current) => Array.from(new Set([...current, id])));
    setNotice('Cliente oculto del directorio operativo POS.');
  };

  const handleCreditData = (customer: Customer) => {
    setNotice(`Crédito POS preparado para ${customer.name}. Cartera concentra la gestión formal de ventas a crédito.`);
  };

  const handleAccountStatement = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowAccountStatementModal(true);
  };

  return (
    <div className="space-y-6">
      <PointOfSaleTitleBar
        eyebrow="Clientes POS"
        icon="👤"
        rhIndent
        title="Clientes"
        subtitle="Directorio rápido compartido con Sales para tickets, crédito operativo y estados de cuenta POS."
        actions={(
        <button
          onClick={() => {
            setSelectedCustomer(undefined);
            setShowAddModal(true);
          }}
          className={pointOfSaleTitleBarPrimaryActionClassName}
        >
          <Plus className="w-4 h-4" />
          Agregar cliente
        </button>
        )}
      />

      {notice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {notice}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total clientes</p>
              <p className="text-2xl font-medium text-gray-900 dark:text-white">{kpis.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-medium text-green-600 dark:text-green-400">{kpis.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Inactivos</p>
              <p className="text-2xl font-medium text-red-600 dark:text-red-400">{kpis.inactive}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#C64237] dark:text-[#FFB5AE]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ventas totales</p>
              <p className="text-lg font-medium text-[#C64237] dark:text-[#FFB5AE]">
                {formatCurrency(kpis.totalRevenue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Saldo pendiente</p>
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                {formatCurrency(kpis.totalBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Buscar cliente
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, email, teléfono o RFC..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'all')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#FF6B5E] focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="overflow-x-auto overscroll-x-contain">
          <table style={{ width: `${tableWidth}px`, minWidth: '100%' }} className="table-fixed divide-y divide-slate-200 text-sm leading-5 dark:divide-slate-700">
            <colgroup>
              {(Object.keys(CUSTOMER_TABLE_LABELS) as CustomerTableResizableColumn[]).map((column) => (
                <col key={column} style={{ width: `${columnWidths[column]}px` }} />
              ))}
            </colgroup>
            <thead className="bg-slate-50 text-[13px] font-normal leading-4 text-slate-500 dark:bg-slate-950/60 dark:text-slate-300">
              <tr className="h-[52px]">
                {(Object.keys(CUSTOMER_TABLE_LABELS) as CustomerTableResizableColumn[]).map((column) => (
                  column === 'actions' ? (
                    <th key={column} scope="col" className="relative px-3 text-right text-[13px] font-normal leading-4">
                      {CUSTOMER_TABLE_LABELS[column]}
                      <CustomerColumnResizeHandle
                        currentWidth={columnWidths[column]}
                        minimumWidth={minimumColumnWidths[column]}
                        label={`Cambiar ancho de ${CUSTOMER_TABLE_LABELS[column]}`}
                        onPointerDown={(event) => startColumnResize(event, column)}
                        onResizeBy={(delta) => resizeColumnBy(column, delta)}
                        onReset={resetColumnWidths}
                      />
                    </th>
                  ) : (
                    <CustomerTableHead
                      key={column}
                      column={column}
                      label={CUSTOMER_TABLE_LABELS[column]}
                      align={column === 'totalPurchases' || column === 'balance' ? 'right' : column === 'type' || column === 'status' ? 'center' : 'left'}
                      sortDirection={sortDirection}
                      sortKey={sortKey}
                      onSort={sortBy}
                      resizeHandle={<CustomerColumnResizeHandle
                        currentWidth={columnWidths[column]}
                        minimumWidth={minimumColumnWidths[column]}
                        label={`Cambiar ancho de ${CUSTOMER_TABLE_LABELS[column]}`}
                        onPointerDown={(event) => startColumnResize(event, column)}
                        onResizeBy={(delta) => resizeColumnBy(column, delta)}
                        onReset={resetColumnWidths}
                      />}
                    />
                  )
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || statusFilter !== 'all' ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                customersPagination.paginatedRows.map((customer) => (
                  <tr
                    key={customer.id}
                    className="h-16 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className="overflow-hidden px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950 dark:text-white" title={customer.name}>{customer.name}</p>
                        {customer.rfc && (
                          <p className="truncate font-mono text-xs font-normal text-slate-500 dark:text-slate-400" title={customer.rfc}>{customer.rfc}</p>
                        )}
                      </div>
                    </td>
                    <td className="overflow-hidden px-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-300">
                      <span className="block truncate" title={customer.email}>{customer.email}</span>
                    </td>
                    <td className="overflow-hidden px-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-300">
                      <span className="block truncate" title={customer.phone}>{customer.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        customer.customerType === 'individual'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      }`}>
                        {customer.customerType === 'individual' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {customer.customerType === 'individual' ? 'Física' : 'Moral'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-normal tabular-nums text-slate-950 dark:text-white">
                      {formatCurrency(customer.totalPurchases)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-normal tabular-nums">
                      <span className={customer.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}>
                        {formatCurrency(customer.currentBalance)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-normal text-slate-700 dark:text-slate-300">
                      {formatDate(customer.lastPurchaseDate)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        customer.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
                      }`}>
                        {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end">
                        <div className="inline-flex items-center justify-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <CustomerTableAction
                            label="Editar cliente"
                            tone="coral"
                            onClick={() => handleEditCustomer(customer)}
                            icon={<Edit2 className="h-4 w-4" />}
                          />
                          <CustomerTableAction
                            label="Datos de crédito"
                            tone="blue"
                            onClick={() => handleCreditData(customer)}
                            icon={<CreditCard className="h-4 w-4" />}
                          />
                          <CustomerTableAction
                            label="Estado de cuenta"
                            tone="green"
                            onClick={() => handleAccountStatement(customer)}
                            icon={<FileText className="h-4 w-4" />}
                          />
                          <CustomerTableAction
                            label="Quitar cliente"
                            tone="red"
                            onClick={() => setCustomerPendingDeletion(customer)}
                            icon={<Trash2 className="h-4 w-4" />}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PointOfSaleTablePagination {...customersPagination} itemLabel="clientes" />
      </div>

      {/* Add/Edit Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedCustomer(undefined);
        }}
        onSave={handleAddCustomer}
        customer={selectedCustomer}
      />

      {/* Account Statement Modal */}
      {selectedCustomer && (
        <AccountStatementModal
          isOpen={showAccountStatementModal}
          onClose={() => {
            setShowAccountStatementModal(false);
            setSelectedCustomer(undefined);
          }}
          customer={selectedCustomer}
        />
      )}

      <ConfirmDeleteDialog
        isVisible={Boolean(customerPendingDeletion)}
        title="Quitar cliente de POS"
        itemName={customerPendingDeletion?.name}
        description={
          customerPendingDeletion && sharedCustomers.some((customer) => customer.id === customerPendingDeletion.id)
            ? 'Se desactivara para POS sin borrar el contacto maestro de Sales.'
            : 'Se ocultara del directorio operativo POS.'
        }
        cancelLabel="Cancelar"
        confirmLabel="Quitar cliente"
        onCancel={() => setCustomerPendingDeletion(null)}
        onConfirm={() => {
          if (customerPendingDeletion) {
            handleDeleteCustomer(customerPendingDeletion.id);
          }
          setCustomerPendingDeletion(null);
        }}
      />
    </div>
  );
}

function customerSortValue(customer: Customer, column: CustomerTableColumn): string | number {
  if (column === 'customer') return customer.name;
  if (column === 'email') return customer.email;
  if (column === 'phone') return customer.phone;
  if (column === 'type') return customer.customerType;
  if (column === 'totalPurchases') return customer.totalPurchases;
  if (column === 'balance') return customer.currentBalance;
  if (column === 'lastPurchase') return customer.lastPurchaseDate?.getTime() ?? Number.NEGATIVE_INFINITY;
  return customer.status;
}

function compareCustomers(left: Customer, right: Customer, column: CustomerTableColumn) {
  const leftValue = customerSortValue(left, column);
  const rightValue = customerSortValue(right, column);
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue;
  return String(leftValue).localeCompare(String(rightValue), 'es-MX', { numeric: true, sensitivity: 'base' });
}

function CustomerTableHead({ align, column, label, onSort, resizeHandle, sortDirection, sortKey }: {
  align: 'left' | 'center' | 'right';
  column: CustomerTableColumn;
  label: string;
  onSort: (column: CustomerTableColumn) => void;
  resizeHandle: React.ReactNode;
  sortDirection: CustomerTableSortDirection;
  sortKey: CustomerTableColumn;
}) {
  const isActive = column === sortKey;
  const nextDirection = isActive && sortDirection === 'asc' ? 'desc' : 'asc';
  const sortLabel = `${label}: ordenar ${nextDirection === 'asc' ? 'ascendente' : 'descendente'}`;
  const SortIcon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown;
  const justifyClassName = align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left';

  return (
    <th
      scope="col"
      aria-sort={isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`relative px-3 text-[13px] font-normal leading-4 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={sortLabel}
        title={sortLabel}
        className={`group flex h-full min-h-9 w-full min-w-0 items-center gap-1.5 rounded-md pr-2 text-[13px] font-normal leading-4 outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 ${justifyClassName} ${isActive ? 'text-[#B63B32] dark:text-[#FFB0AA]' : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'}`}
      >
        <span className="whitespace-nowrap">{label}</span>
        <SortIcon
          className={`h-3.5 w-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
          aria-hidden="true"
        />
      </button>
      {resizeHandle}
    </th>
  );
}

function CustomerColumnResizeHandle({ currentWidth, label, minimumWidth, onPointerDown, onReset, onResizeBy }: {
  currentWidth: number;
  label: string;
  minimumWidth: number;
  onPointerDown: (event: React.PointerEvent<HTMLSpanElement>) => void;
  onReset: () => void;
  onResizeBy: (delta: number) => void;
}) {
  return (
    <span
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemax={CUSTOMER_TABLE_MAX_COLUMN_WIDTH}
      aria-valuemin={Math.round(minimumWidth)}
      aria-valuenow={Math.round(currentWidth)}
      aria-valuetext={`${Math.round(currentWidth)} px`}
      tabIndex={0}
      title={label}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onReset();
      }}
      onKeyDown={(event) => {
        const delta = event.shiftKey ? 24 : 8;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onResizeBy(-delta);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          onResizeBy(delta);
        } else if (event.key === 'Home') {
          event.preventDefault();
          onReset();
        }
      }}
      className="group/resize absolute right-0 top-0 z-10 flex h-full w-4 translate-x-1/2 touch-none cursor-col-resize items-center justify-center outline-none"
    >
      <span className="h-7 w-px bg-slate-300 opacity-60 transition group-hover/resize:w-0.5 group-hover/resize:bg-[#FF6B5E] group-hover/resize:opacity-100 group-focus-visible/resize:w-0.5 group-focus-visible/resize:bg-[#FF6B5E] group-focus-visible/resize:opacity-100 dark:bg-slate-600" aria-hidden="true" />
    </span>
  );
}

function CustomerTableAction({ icon, label, onClick, tone }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: 'coral' | 'blue' | 'green' | 'red';
}) {
  const toneClassName = {
    coral: 'border-[#FFB0AA] bg-[#FFF4F2] text-[#B63B32] hover:bg-[#FFE7E3] dark:bg-[#FF6B5E]/10',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    red: 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/35 ${toneClassName}`}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}
