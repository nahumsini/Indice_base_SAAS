import { useEffect, useMemo, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type ReactNode, type SetStateAction } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Copy,
  Paperclip,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { AttachmentsModal } from '../Expenses/components/AttachmentsModal';
import {
  providerAccountingAccountOptions,
  providerBusinessOptions,
  providerBusinessUnitOptions,
  providerFilterTypeOptions,
  providerStatusOptions,
  providerTypeOptions,
  providerUserOptions,
  type ProviderRecord,
  type ProviderStatus,
  type ProviderType,
  useProveedoresLogic,
} from './useProveedoresLogic';

type SortField = keyof ProviderRecord;
type SortDirection = 'asc' | 'desc' | null;

const defaultColumnWidths: Record<string, number> = {
  folio: 120,
  name: 190,
  company: 190,
  type: 150,
  contactName: 190,
  email: 210,
  phone: 150,
  taxId: 150,
  address: 230,
  accountingAccount: 190,
  status: 140,
  attachments: 140,
  authorizer: 180,
  performer: 180,
  auditNotes: 210,
  actions: 270,
};

const tableActionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800/80';

const inlineInputBaseClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#147514] focus:ring-2 focus:ring-[#147514]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const filterInputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white';

const compareSortValues = (leftValue: unknown, rightValue: unknown, direction: Exclude<SortDirection, null>) => {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (leftValue instanceof Date && rightValue instanceof Date) {
    return (leftValue.getTime() - rightValue.getTime()) * multiplier;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * multiplier;
};

const getProviderStatusLabel = (status: ProviderStatus) => {
  return providerStatusOptions.find(option => option.value === status)?.label ?? status;
};

const getProviderStatusClass = (status: ProviderStatus) => {
  if (status === 'active') {
    return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
};

interface ProveedoresPageProps {
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  providers?: ProviderRecord[];
}

export default function ProveedoresPage({ onProvidersChange, providers: controlledProviders }: ProveedoresPageProps) {
  const {
    activateProvider,
    addProvider,
    businessFilter,
    businessUnitFilter,
    deleteProvider,
    duplicateProvider,
    filteredProviders,
    providers,
    searchTerm,
    setBusinessFilter,
    setBusinessUnitFilter,
    setSearchTerm,
    setStatusFilter,
    setTypeFilter,
    statusFilter,
    typeFilter,
    updateProvider,
  } = useProveedoresLogic({
    onProvidersChange,
    providers: controlledProviders,
  });
  const [attachmentsProvider, setAttachmentsProvider] = useState<ProviderRecord | null>(null);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  const handleAddProvider = () => {
    const providerId = addProvider();
    setEditingProviderId(providerId);
  };

  const saveProviderAttachments = (attachments: string[]) => {
    if (!attachmentsProvider) return;

    updateProvider(attachmentsProvider.id, { attachments });
  };

  return (
    <div className="space-y-6">
      <ProvidersHeaderBanner
        providersCount={providers.length}
        onAddProvider={handleAddProvider}
      />

      <ProvidersFilterBar
        businessFilter={businessFilter}
        businessUnitFilter={businessUnitFilter}
        filteredCount={filteredProviders.length}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onBusinessChange={setBusinessFilter}
        onBusinessUnitChange={setBusinessUnitFilter}
        onSearchChange={setSearchTerm}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
      />

      <ProvidersTable
        editingProviderId={editingProviderId}
        providers={filteredProviders}
        onActivateProvider={activateProvider}
        onDeleteProvider={deleteProvider}
        onDuplicateProvider={duplicateProvider}
        onEditProvider={setEditingProviderId}
        onOpenAttachments={setAttachmentsProvider}
        onUpdateProvider={updateProvider}
      />

      {attachmentsProvider && (
        <AttachmentsModal
          isOpen={true}
          onClose={() => setAttachmentsProvider(null)}
          expenseFolio={attachmentsProvider.folio}
          expenseConcept={attachmentsProvider.name}
          attachments={attachmentsProvider.attachments}
          onSave={saveProviderAttachments}
        />
      )}
    </div>
  );
}

function ProvidersHeaderBanner({
  onAddProvider,
  providersCount,
}: {
  onAddProvider: () => void;
  providersCount: number;
}) {
  return (
    <div className="bg-[#147514] dark:bg-[#0b3f1b] rounded-2xl shadow-sm dark:shadow-black/30 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="text-4xl">🏢</span>
          <div>
            <h2 className="text-2xl font-bold text-white">Proveedores</h2>
            <p className="text-sm text-white/90 mt-1">
              Gestiona y organiza todos los proveedores del sistema.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-11 items-center rounded-xl border border-white/20 bg-white/15 px-4 text-sm font-semibold text-white dark:bg-white/10">
            {providersCount} proveedores registrados
          </span>
          <button
            type="button"
            onClick={onAddProvider}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#147514] shadow-md transition-colors hover:bg-gray-50 dark:text-[#0b3f1b] dark:hover:bg-gray-100"
          >
            <Plus className="h-4 w-4" />
            Agregar proveedor
          </button>
        </div>
      </div>
    </div>
  );
}

function ProvidersFilterBar({
  businessFilter,
  businessUnitFilter,
  filteredCount,
  onBusinessChange,
  onBusinessUnitChange,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  searchTerm,
  statusFilter,
  typeFilter,
}: {
  businessFilter: string;
  businessUnitFilter: string;
  filteredCount: number;
  onBusinessChange: (value: string) => void;
  onBusinessUnitChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProviderStatus | 'all') => void;
  onTypeChange: (value: ProviderType | 'all') => void;
  searchTerm: string;
  statusFilter: ProviderStatus | 'all';
  typeFilter: ProviderType | 'all';
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#147514]/10 text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Filtros de proveedores</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Busca por nombre, empresa o contacto principal.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center rounded-full bg-[#147514]/10 px-3 py-1 text-xs font-bold text-[#147514] dark:bg-emerald-400/10 dark:text-emerald-300">
          {filteredCount} resultados
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Nombre, empresa o contacto..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-[#147514] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <FilterSelect
          label="Tipo de proveedor"
          value={typeFilter}
          options={providerFilterTypeOptions}
          onChange={(value) => onTypeChange(value as ProviderType | 'all')}
        />

        <FilterSelect
          label="Unidad"
          value={businessUnitFilter}
          options={[
            { value: 'all', label: 'Todas' },
            ...providerBusinessUnitOptions.map(unit => ({ value: unit, label: unit })),
          ]}
          onChange={onBusinessUnitChange}
        />

        <FilterSelect
          label="Negocio"
          value={businessFilter}
          options={[
            { value: 'all', label: 'Todos' },
            ...providerBusinessOptions.map(business => ({ value: business, label: business })),
          ]}
          onChange={onBusinessChange}
        />

        <FilterSelect
          label="Estado"
          value={statusFilter}
          options={[
            { value: 'all', label: 'Todos' },
            ...providerStatusOptions,
          ]}
          onChange={(value) => onStatusChange(value as ProviderStatus | 'all')}
        />
      </div>
    </div>
  );
}

function ProvidersTable({
  editingProviderId,
  onActivateProvider,
  onDeleteProvider,
  onDuplicateProvider,
  onEditProvider,
  onOpenAttachments,
  onUpdateProvider,
  providers,
}: {
  editingProviderId: string | null;
  onActivateProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onDuplicateProvider: (providerId: string) => void;
  onEditProvider: (providerId: string) => void;
  onOpenAttachments: (provider: ProviderRecord) => void;
  onUpdateProvider: (providerId: string, updates: Partial<ProviderRecord>) => void;
  providers: ProviderRecord[];
}) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultColumnWidths);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);

  const userOptions = useMemo(() => [
    { value: '', label: 'Seleccionar' },
    ...providerUserOptions.map(user => ({ value: user, label: user })),
  ], []);

  const sortedProviders = useMemo(() => {
    if (!sortField || !sortDirection) return providers;

    return [...providers].sort((leftProvider, rightProvider) =>
      compareSortValues(leftProvider[sortField], rightProvider[sortField], sortDirection),
    );
  }, [providers, sortDirection, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
        return;
      }

      if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
        return;
      }
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 text-[#147514]" />;
    }
    return <ArrowDown className="h-4 w-4 text-[#147514]" />;
  };

  const handleResizeStart = (event: ReactMouseEvent, columnKey: string) => {
    event.preventDefault();
    setResizingColumn(columnKey);
    setResizeStartX(event.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  useEffect(() => {
    if (!resizingColumn) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      const diff = event.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);

      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeStartWidth, resizeStartX, resizingColumn]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <SortableHeader columnKey="folio" label="Folio" width={columnWidths.folio} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('folio')} />
              <SortableHeader columnKey="name" label="Nombre del proveedor" width={columnWidths.name} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('name')} />
              <SortableHeader columnKey="company" label="Empresa" width={columnWidths.company} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('company')} />
              <SortableHeader columnKey="type" label="Tipo de proveedor" width={columnWidths.type} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('type')} />
              <SortableHeader columnKey="contactName" label="Contacto principal" width={columnWidths.contactName} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('contactName')} />
              <SortableHeader columnKey="email" label="Correo" width={columnWidths.email} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('email')} />
              <SortableHeader columnKey="phone" label="Teléfono" width={columnWidths.phone} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('phone')} />
              <SortableHeader columnKey="taxId" label="RFC / ID fiscal" width={columnWidths.taxId} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('taxId')} />
              <SortableHeader columnKey="address" label="Dirección" width={columnWidths.address} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('address')} />
              <SortableHeader columnKey="accountingAccount" label="Cuenta contable asociada" width={columnWidths.accountingAccount} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('accountingAccount')} />
              <SortableHeader columnKey="status" label="Estado" width={columnWidths.status} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('status')} />
              <SortableHeader columnKey="attachments" label="Archivos Adjuntos" width={columnWidths.attachments} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('attachments')} />
              <SortableHeader columnKey="authorizer" label="Autoriza" width={columnWidths.authorizer} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('authorizer')} />
              <SortableHeader columnKey="performer" label="Realiza" width={columnWidths.performer} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('performer')} />
              <SortableHeader columnKey="auditNotes" label="Auditoría" width={columnWidths.auditNotes} resizingColumn={resizingColumn} onResizeStart={handleResizeStart} onSort={handleSort} sortIcon={getSortIcon('auditNotes')} />
              <th
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedProviders.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <Search className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No se encontraron proveedores</p>
                    <p className="text-sm">Agrega un proveedor o ajusta los filtros.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedProviders.map(provider => (
                <EditableProviderRow
                  key={provider.id}
                  columnWidths={columnWidths}
                  isEditing={editingProviderId === provider.id}
                  provider={provider}
                  userOptions={userOptions}
                  onActivateProvider={onActivateProvider}
                  onDeleteProvider={onDeleteProvider}
                  onDuplicateProvider={onDuplicateProvider}
                  onEditProvider={onEditProvider}
                  onOpenAttachments={onOpenAttachments}
                  onUpdateProvider={onUpdateProvider}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditableProviderRow({
  columnWidths,
  isEditing,
  onActivateProvider,
  onDeleteProvider,
  onDuplicateProvider,
  onEditProvider,
  onOpenAttachments,
  onUpdateProvider,
  provider,
  userOptions,
}: {
  columnWidths: Record<string, number>;
  isEditing: boolean;
  onActivateProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onDuplicateProvider: (providerId: string) => void;
  onEditProvider: (providerId: string) => void;
  onOpenAttachments: (provider: ProviderRecord) => void;
  onUpdateProvider: (providerId: string, updates: Partial<ProviderRecord>) => void;
  provider: ProviderRecord;
  userOptions: Array<{ value: string; label: string }>;
}) {
  const startEditing = () => onEditProvider(provider.id);
  const statusClass = getProviderStatusClass(provider.status);

  return (
    <tr
      className={`
        transition-colors group relative
        ${isEditing ? 'bg-green-50/50 ring-1 ring-inset ring-[#147514]/25 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
        ${!isEditing && provider.status === 'inactive' ? 'bg-slate-50/70 dark:bg-slate-900/20' : ''}
      `}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        <span className="font-mono font-medium">{provider.folio}</span>
      </td>

      <EditableTextCell field="name" label="Nombre del proveedor" provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} />
      <EditableTextCell field="company" label="Empresa" provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} />

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.type, minWidth: columnWidths.type }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Tipo de proveedor ${provider.folio}`}
            value={provider.type}
            options={providerTypeOptions}
            onChange={(type) => onUpdateProvider(provider.id, { type })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{provider.type}</ReadonlyPill>
        )}
      </td>

      <EditableTextCell field="contactName" label="Contacto principal" provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} />
      <EditableTextCell field="email" label="Correo" provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} />
      <EditableTextCell field="phone" label="Teléfono" provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} />
      <EditableTextCell field="taxId" label="RFC / ID fiscal" provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} />
      <EditableTextCell field="address" label="Dirección" provider={provider} columnWidths={columnWidths} isEditing={isEditing} onStartEdit={startEditing} onUpdateProvider={onUpdateProvider} />

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.accountingAccount, minWidth: columnWidths.accountingAccount }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Cuenta contable ${provider.folio}`}
            value={provider.accountingAccount}
            options={providerAccountingAccountOptions}
            onChange={(accountingAccount) => onUpdateProvider(provider.id, { accountingAccount })}
          />
        ) : (
          <ReadonlyPill onClick={startEditing}>{provider.accountingAccount}</ReadonlyPill>
        )}
      </td>

      <td className="px-6 py-4" style={{ width: columnWidths.status, minWidth: columnWidths.status }}>
        {isEditing ? (
          <EditableSelect
            ariaLabel={`Estado ${provider.folio}`}
            value={provider.status}
            options={providerStatusOptions}
            onChange={(status) => onUpdateProvider(provider.id, { status })}
          />
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className={`w-full rounded-full border px-3 py-2 text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${statusClass}`}
          >
            {getProviderStatusLabel(provider.status)}
          </button>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-center" style={{ width: columnWidths.attachments, minWidth: columnWidths.attachments }}>
        <button
          type="button"
          onClick={() => onOpenAttachments(provider)}
          className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm ${
            provider.attachments.length > 0
              ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-300 dark:hover:bg-green-900/60'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
          title={provider.attachments.length > 0 ? 'Ver archivos adjuntos' : 'Agregar archivos'}
          aria-label={provider.attachments.length > 0 ? 'Ver archivos adjuntos' : 'Agregar archivos'}
        >
          <Paperclip className="h-4 w-4" />
          <span>{provider.attachments.length}</span>
        </button>
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.authorizer, minWidth: columnWidths.authorizer }}>
        <EditableSelect
          ariaLabel={`Usuario que autoriza ${provider.folio}`}
          value={provider.authorizer}
          options={userOptions}
          onChange={(authorizer) => onUpdateProvider(provider.id, { authorizer })}
        />
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.performer, minWidth: columnWidths.performer }}>
        <EditableSelect
          ariaLabel={`Usuario que realiza ${provider.folio}`}
          value={provider.performer}
          options={userOptions}
          onChange={(performer) => onUpdateProvider(provider.id, { performer })}
        />
      </td>

      <td className="px-6 py-4 whitespace-nowrap" style={{ width: columnWidths.auditNotes, minWidth: columnWidths.auditNotes }}>
        <EditableTextInput
          ariaLabel={`Notas de auditoría ${provider.folio}`}
          placeholder="Agregar auditoría"
          value={provider.auditNotes}
          onChange={(auditNotes) => onUpdateProvider(provider.id, { auditNotes })}
        />
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-center" style={{ width: columnWidths.actions, minWidth: columnWidths.actions }}>
        <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
          <button
            onClick={() => onDuplicateProvider(provider.id)}
            className={`${tableActionButtonBaseClass} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60`}
            title="Duplicar"
            aria-label="Duplicar"
            type="button"
          >
            <Copy className="h-4 w-4 text-blue-600" />
          </button>
          <button
            onClick={() => onDeleteProvider(provider.id)}
            className={`${tableActionButtonBaseClass} border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60`}
            title="Eliminar"
            aria-label="Eliminar"
            type="button"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
          <button
            onClick={startEditing}
            className={`${tableActionButtonBaseClass} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60`}
            title="Editar"
            aria-label="Editar"
            type="button"
          >
            <Pencil className="h-4 w-4 text-amber-600" />
          </button>
          <button
            onClick={() => onActivateProvider(provider.id)}
            className={`${tableActionButtonBaseClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60`}
            title="Marcar como activo"
            aria-label="Marcar como activo"
            type="button"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </button>
          <button
            onClick={startEditing}
            className={`${tableActionButtonBaseClass} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/60 dark:text-violet-300 dark:hover:bg-violet-900/60`}
            title="Auditar"
            aria-label="Auditar"
            type="button"
          >
            <ShieldCheck className="h-4 w-4 text-violet-600" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditableTextCell({
  columnWidths,
  field,
  isEditing,
  label,
  onStartEdit,
  onUpdateProvider,
  provider,
}: {
  columnWidths: Record<string, number>;
  field: keyof Pick<ProviderRecord, 'name' | 'company' | 'contactName' | 'email' | 'phone' | 'taxId' | 'address'>;
  isEditing: boolean;
  label: string;
  onStartEdit: () => void;
  onUpdateProvider: (providerId: string, updates: Partial<ProviderRecord>) => void;
  provider: ProviderRecord;
}) {
  const value = provider[field];

  return (
    <td className="px-6 py-4" style={{ width: columnWidths[field], minWidth: columnWidths[field] }}>
      {isEditing ? (
        <EditableTextInput
          ariaLabel={`${label} ${provider.folio}`}
          value={value}
          onChange={(fieldValue) => onUpdateProvider(provider.id, { [field]: fieldValue })}
        />
      ) : (
        <ReadonlyPill onClick={onStartEdit}>{value || '-'}</ReadonlyPill>
      )}
    </td>
  );
}

function EditableSelect<T extends string>({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  value: T;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={inlineInputBaseClass}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function EditableTextInput({
  ariaLabel,
  onChange,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className={inlineInputBaseClass}
      placeholder={placeholder}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ReadonlyPill({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full max-w-xs truncate rounded-xl border border-transparent px-3 py-2 text-left text-sm font-semibold text-slate-800 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={filterInputClass}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SortableHeader({
  columnKey,
  label,
  onResizeStart,
  onSort,
  resizingColumn,
  sortIcon,
  width,
}: {
  columnKey: SortField;
  label: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  onSort: (field: SortField) => void;
  resizingColumn: string | null;
  sortIcon: ReactNode;
  width: number;
}) {
  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative group"
      style={{ width, minWidth: width }}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSort(columnKey)}
          className="flex items-center gap-1 hover:text-[#147514] transition-colors"
        >
          <span>{label}</span>
          {sortIcon}
        </button>
        <ColumnResizeHandle columnKey={columnKey} resizingColumn={resizingColumn} onResizeStart={onResizeStart} />
      </div>
    </th>
  );
}

function ColumnResizeHandle({
  columnKey,
  onResizeStart,
  resizingColumn,
}: {
  columnKey: string;
  onResizeStart: (event: ReactMouseEvent, columnKey: string) => void;
  resizingColumn: string | null;
}) {
  return (
    <div
      onMouseDown={(event) => onResizeStart(event, columnKey)}
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#147514] opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: resizingColumn === columnKey ? '#147514' : '' }}
    />
  );
}
