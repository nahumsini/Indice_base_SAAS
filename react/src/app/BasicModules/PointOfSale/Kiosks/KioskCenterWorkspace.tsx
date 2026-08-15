import { useEffect, useMemo, useState } from 'react';
import {
  Columns3,
  ChefHat,
  Copy,
  CreditCard,
  ExternalLink,
  Link2,
  LoaderCircle,
  LayoutGrid,
  Monitor,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Power,
  QrCode,
  ShieldOff,
  ShoppingBasket,
  UtensilsCrossed,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import {
  selfServiceKioskApi,
  type PosCashRegisterOption,
  type SelfServiceKioskAdmin,
} from '../SelfServiceKiosk/selfServiceKioskApi';
import {
  customerDisplayApi,
  type CustomerDisplayAdminItem,
  type CustomerDisplayPublicAccess,
} from '../shared/customerDisplay/customerDisplayApi';
import { useKioskQrCode } from '../../../components/kiosk-engine/useKioskQrCode';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

type CenterView = 'customer-display' | 'self-service' | 'self-checkout' | 'restaurant-waiter' | 'restaurant-tables' | 'restaurant-kitchen';
type RowType = 'customer-display' | 'self-service';
type ConnectionFilter = 'all' | 'online' | 'offline' | 'not-monitored';
type ColumnId = 'type' | 'scope' | 'connection' | 'activity' | 'expiration' | 'link';

type KioskCenterRow = {
  id: string;
  sourceId: number;
  type: RowType;
  name: string;
  code: string;
  branch: string;
  register: string;
  status: 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'EXPIRED';
  connection: 'online' | 'offline' | 'not-monitored';
  lastActivity?: string | null;
  expiresAt?: string | null;
  tokenHint: string;
};

const defaultColumns: Array<{ id: ColumnId; visible: boolean }> = [
  { id: 'type', visible: true },
  { id: 'scope', visible: true },
  { id: 'connection', visible: true },
  { id: 'activity', visible: true },
  { id: 'expiration', visible: true },
  { id: 'link', visible: true },
];

export function KioskCenterWorkspace({ onOpenView, onCreateView }: { onOpenView: (view: CenterView) => void; onCreateView: (view: CenterView) => void }) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const [displays, setDisplays] = useState<CustomerDisplayAdminItem[]>([]);
  const [services, setServices] = useState<SelfServiceKioskAdmin[]>([]);
  const [registers, setRegisters] = useState<PosCashRegisterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | RowType>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState(defaultColumns);
  const [showColumns, setShowColumns] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCreateType, setSelectedCreateType] = useState<CenterView>('customer-display');
  const [editingDisplay, setEditingDisplay] = useState<CustomerDisplayAdminItem | null>(null);
  const [accessDisplay, setAccessDisplay] = useState<CustomerDisplayAdminItem | null>(null);
  const [managingDisplay, setManagingDisplay] = useState<CustomerDisplayAdminItem | null>(null);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const [displayItems, serviceItems, registerItems] = await Promise.all([
        customerDisplayApi.listAdmin(),
        selfServiceKioskApi.listAdmin(),
        selfServiceKioskApi.listCashRegisters(),
      ]);
      setDisplays(displayItems);
      setServices(serviceItems);
      setRegisters(registerItems);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.center.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const rows = useMemo<KioskCenterRow[]>(() => {
    const registerById = new Map(registers.map((register) => [register.id, register]));
    const displayRows = displays.map((display): KioskCenterRow => {
      const register = registerById.get(display.cashRegisterId);
      return {
        id: `display-${display.id}`,
        sourceId: display.id,
        type: 'customer-display',
        name: display.name,
        code: display.code,
        branch: register?.warehouseName || display.cashRegisterName,
        register: `${display.cashRegisterCode} · ${display.cashRegisterName}`,
        status: display.status,
        connection: display.connected ? 'online' : 'offline',
        lastActivity: display.lastSeenAt,
        tokenHint: display.publicTokenHint,
      };
    });
    const serviceRows = services.map((service): KioskCenterRow => ({
      id: `service-${service.id}`,
      sourceId: service.id,
      type: 'self-service',
      name: service.name,
      code: service.code,
      branch: service.businessName || service.unitName || service.warehouseName,
      register: `${service.cashRegisterCode} · ${service.cashRegisterName}`,
      status: service.status,
      connection: 'not-monitored',
      lastActivity: service.updatedAt,
      expiresAt: service.expiresAt,
      tokenHint: service.publicTokenHint,
    }));
    return [...displayRows, ...serviceRows].sort((left, right) => left.name.localeCompare(right.name, locale));
  }, [displays, locale, registers, services]);

  const branches = useMemo(
    () => Array.from(new Set(rows.map((row) => row.branch).filter(Boolean))).sort((a, b) => a.localeCompare(b, locale)),
    [locale, rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return rows.filter((row) => (
      (!normalizedQuery || `${row.name} ${row.code} ${row.branch} ${row.register}`.toLocaleLowerCase(locale).includes(normalizedQuery))
      && (typeFilter === 'all' || row.type === typeFilter)
      && (branchFilter === 'all' || row.branch === branchFilter)
      && (statusFilter === 'all' || row.status === statusFilter)
      && (connectionFilter === 'all' || row.connection === connectionFilter)
    ));
  }, [branchFilter, connectionFilter, locale, query, rows, statusFilter, typeFilter]);

  useEffect(() => { setPage(1); }, [query, typeFilter, branchFilter, statusFilter, connectionFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, filteredRows.length);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleColumnIds = columns.filter((column) => column.visible).map((column) => column.id);
  const activeCount = rows.filter((row) => row.status === 'ACTIVE').length;

  const continueCreate = () => {
    setShowCreate(false);
    onCreateView(selectedCreateType);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#FF6B5E]/25 bg-white text-[#B63B32] dark:bg-slate-950"><Monitor className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-medium text-[#B63B32]">{copy.center.eyebrow}</p>
              <h2 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{copy.center.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{copy.center.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowColumns(true)} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#B63B32] dark:border-slate-700 dark:bg-slate-900 dark:text-white"><Columns3 className="h-4 w-4" />{copy.center.columns}</button>
            <button type="button" onClick={() => void reload()} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{copy.center.refresh}</button>
            <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831]"><Plus className="h-4 w-4" />{copy.center.create}</button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-sm font-medium text-slate-900 dark:text-white">{copy.center.filters}</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterField label={copy.center.search} className="xl:col-span-2">
            <span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.center.searchPlaceholder} className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900" /></span>
          </FilterField>
          <FilterSelect label={copy.center.type} value={typeFilter} onChange={(value) => setTypeFilter(value as 'all' | RowType)} options={[['all', copy.center.allTypes], ['customer-display', copy.center.customerDisplay], ['self-service', copy.center.selfService]]} />
          <FilterSelect label={copy.center.branch} value={branchFilter} onChange={setBranchFilter} options={[['all', copy.center.allBranches], ...branches.map((branch) => [branch, branch] as [string, string])]} />
          <FilterSelect label={copy.center.status} value={statusFilter} onChange={setStatusFilter} options={[['all', copy.center.allStatuses], ['ACTIVE', copy.common.active], ['DISABLED', copy.common.disabled], ['REVOKED', copy.common.revoked], ['EXPIRED', copy.common.expired]]} />
          <FilterSelect label={copy.center.connection} value={connectionFilter} onChange={(value) => setConnectionFilter(value as ConnectionFilter)} options={[['all', copy.center.allConnections], ['online', copy.center.online], ['offline', copy.center.offline], ['not-monitored', copy.center.notMonitored]]} />
        </div>
      </section>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      <p className="text-sm text-slate-600 dark:text-slate-300">{copy.center.insight(filteredRows.length, rows.length, activeCount)}</p>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <tr><th className="px-5 py-4">{copy.center.name}</th>{visibleColumnIds.map((column) => <th key={column} className="px-5 py-4">{columnLabel(column, copy.center)}</th>)}<th className="px-5 py-4 text-right">{copy.center.actions}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={visibleColumnIds.length + 2} className="px-5 py-14 text-center text-slate-500">{copy.center.loading}</td></tr> : null}
              {!loading && visibleRows.length === 0 ? <tr><td colSpan={visibleColumnIds.length + 2} className="px-5 py-14 text-center text-slate-500">{copy.center.empty}</td></tr> : null}
              {!loading && visibleRows.map((row) => {
                const display = row.type === 'customer-display' ? displays.find((item) => item.id === row.sourceId) ?? null : null;
                return <KioskRow key={row.id} row={row} columns={visibleColumnIds} locale={locale} onManage={() => onOpenView(row.type)} onOpenExperience={() => onOpenView(row.type === 'self-service' ? 'self-checkout' : 'customer-display')} onEdit={display ? () => setEditingDisplay(display) : undefined} onAccess={display ? () => setAccessDisplay(display) : undefined} onMore={display ? () => setManagingDisplay(display) : undefined} />;
              })}
            </tbody>
          </table>
        </div>
        <PointOfSaleTablePagination currentPage={safePage} itemLabel="kioscos" onPageChange={setPage} onPageSizeChange={setPageSize} pageEnd={pageEnd} pageSize={pageSize} pageStart={pageStart} totalCount={filteredRows.length} totalPages={totalPages} />
      </section>

      {showCreate ? <CreateKioskModal selected={selectedCreateType} onSelected={setSelectedCreateType} onClose={() => setShowCreate(false)} onContinue={continueCreate} /> : null}
      {showColumns ? <KioskColumnsModal columns={columns} onClose={() => setShowColumns(false)} onApply={setColumns} /> : null}
      {editingDisplay ? <EditCustomerDisplayModal display={editingDisplay} onClose={() => setEditingDisplay(null)} onSaved={() => { setEditingDisplay(null); void reload(); }} /> : null}
      {accessDisplay ? <CustomerDisplayAccessModal display={accessDisplay} onClose={() => setAccessDisplay(null)} /> : null}
      {managingDisplay ? <CustomerDisplayLifecycleModal display={managingDisplay} onClose={() => setManagingDisplay(null)} onChanged={() => { setManagingDisplay(null); void reload(); }} /> : null}
    </div>
  );
}

function KioskRow({ row, columns, locale, onManage, onOpenExperience, onEdit, onAccess, onMore }: { row: KioskCenterRow; columns: ColumnId[]; locale: string; onManage: () => void; onOpenExperience: () => void; onEdit?: () => void; onAccess?: () => void; onMore?: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  return <tr className="align-middle hover:bg-slate-50/70 dark:hover:bg-slate-900/60">
    <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]">{row.type === 'customer-display' ? <Monitor className="h-5 w-5" /> : <ShoppingBasket className="h-5 w-5" />}</span><div><p className="font-medium text-slate-950 dark:text-white">{row.name}</p><p className="text-xs text-slate-500">{row.code}</p></div></div></td>
    {columns.map((column) => <td key={column} className="px-5 py-4 text-slate-600 dark:text-slate-300">{renderColumn(column, row, locale, copy)}</td>)}
    <td className="px-5 py-4"><div className="flex justify-end gap-2">{onEdit && onAccess && onMore ? <><button type="button" onClick={onEdit} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-white"><Pencil className="h-4 w-4" />{copy.center.edit}</button><button type="button" onClick={onAccess} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#FF6B5E] px-3 text-xs font-medium text-[#222831]"><ExternalLink className="h-4 w-4" />{copy.center.access}</button><button type="button" onClick={onMore} aria-label={copy.center.more} title={copy.center.more} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 dark:border-slate-700"><MoreHorizontal className="h-4 w-4" /></button></> : <><button type="button" onClick={onOpenExperience} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#FF6B5E]/35 px-3 text-xs font-medium text-[#B63B32]"><ExternalLink className="h-4 w-4" />{copy.center.openExperience}</button><button type="button" onClick={onManage} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#222831] px-3 text-xs font-medium text-white"><Settings2 className="h-4 w-4" />{copy.center.manage}</button></>}</div></td>
  </tr>;
}

function renderColumn(column: ColumnId, row: KioskCenterRow, locale: string, copy: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']) {
  if (column === 'type') return row.type === 'customer-display' ? copy.center.customerDisplay : copy.center.selfService;
  if (column === 'scope') return <div><p className="font-medium text-slate-800 dark:text-white">{row.branch}</p><p className="text-xs text-slate-500">{row.register}</p></div>;
  if (column === 'connection') return <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${row.connection === 'online' ? 'bg-emerald-50 text-emerald-700' : row.connection === 'offline' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{row.connection === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{row.connection === 'online' ? copy.center.online : row.connection === 'offline' ? copy.center.offline : copy.center.notMonitored}</span>;
  if (column === 'activity') return row.lastActivity ? new Date(row.lastActivity).toLocaleString(locale) : copy.center.noActivity;
  if (column === 'expiration') return row.expiresAt ? new Date(row.expiresAt).toLocaleDateString(locale) : copy.center.noExpiration;
  return <div><span className="inline-flex items-center gap-2 text-xs font-medium"><Link2 className="h-4 w-4" />{copy.center.protectedLink}</span><p className="mt-1 font-mono text-xs text-slate-400">••••{row.tokenHint}</p></div>;
}

function columnLabel(column: ColumnId, center: ReturnType<typeof usePointOfSaleKioskTranslations>['copy']['center']) {
  return { type: center.type, scope: center.scope, connection: center.connection, activity: center.lastActivity, expiration: center.expires, link: center.link }[column];
}

function FilterField({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={className}><span className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>{children}</label>; }
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <FilterField label={label}><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></FilterField>; }

function CreateKioskModal({ selected, onSelected, onClose, onContinue }: { selected: CenterView; onSelected: (value: CenterView) => void; onClose: () => void; onContinue: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const options = [
    { id: 'customer-display' as const, icon: Monitor, title: copy.center.customerDisplay, description: copy.center.displayDescription },
    { id: 'self-service' as const, icon: ShoppingBasket, title: copy.workspace.selfServiceTab, description: copy.center.serviceDescription },
    { id: 'self-checkout' as const, icon: CreditCard, title: copy.workspace.selfCheckoutTab, description: copy.center.checkoutDescription },
    { id: 'restaurant-waiter' as const, icon: UtensilsCrossed, title: copy.center.waiter, description: copy.center.waiterDescription },
    { id: 'restaurant-tables' as const, icon: LayoutGrid, title: copy.center.tables, description: copy.center.tablesDescription },
    { id: 'restaurant-kitchen' as const, icon: ChefHat, title: copy.center.kitchen, description: copy.center.kitchenDescription },
  ];
  return <PosModalFrame modalType="standard-form" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={<Plus className="h-6 w-6" />} onClose={onClose} title={copy.center.createTitle} subtitle={copy.center.createDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<div className="flex gap-3"><button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button><button type="button" onClick={onContinue} className={posModalPrimaryActionClassName}>{copy.center.continue}</button></div>}>
    <div className="grid gap-3 md:grid-cols-2">{options.map(({ id, icon: Icon, title, description }) => <button key={id} type="button" onClick={() => onSelected(id)} className={`flex gap-4 rounded-xl border p-4 text-left ${selected === id ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#B63B32] dark:bg-slate-950"><Icon className="h-5 w-5" /></span><span><strong className="block text-sm font-medium text-slate-950 dark:text-white">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-300">{description}</span></span></button>)}</div>
  </PosModalFrame>;
}

function EditCustomerDisplayModal({ display, onClose, onSaved }: { display: CustomerDisplayAdminItem; onClose: () => void; onSaved: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [name, setName] = useState(display.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await customerDisplayApi.updateAdmin(display.id, { name: name.trim() });
      onSaved();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.customerDisplayAdmin.transitionError);
    } finally {
      setSaving(false);
    }
  };
  return <PosModalFrame modalType="standard-form" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={<Pencil className="h-6 w-6" />} isCloseDisabled={saving} onClose={onClose} title={copy.center.editDisplayTitle} subtitle={copy.center.editDisplayDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<div className="flex gap-3"><button type="button" onClick={onClose} disabled={saving} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button><button type="button" onClick={() => void save()} disabled={saving || !name.trim()} className={posModalPrimaryActionClassName}>{saving ? copy.common.saving : copy.center.save}</button></div>}>
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <label><span className="mb-2 block text-sm font-medium">{copy.customerDisplaySetup.deviceName}</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" /></label>
      <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950"><p className="font-medium">{display.cashRegisterCode} · {display.cashRegisterName}</p><p className="mt-1 text-xs text-slate-500">{copy.center.protectedLink} · ••••{display.publicTokenHint}</p></div>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
    </div>
  </PosModalFrame>;
}

function CustomerDisplayAccessModal({ display, onClose }: { display: CustomerDisplayAdminItem; onClose: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [access, setAccess] = useState<CustomerDisplayPublicAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const absoluteUrl = access ? toAbsoluteUrl(access.displayUrl) : '';
  const qrCode = useKioskQrCode(absoluteUrl, '#B63B32');
  useEffect(() => {
    let active = true;
    setLoading(true);
    void customerDisplayApi.publicAccess(display.id)
      .then((response) => { if (active) setAccess(response); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : copy.center.loadError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [display.id]);
  const copyLink = async () => {
    if (!absoluteUrl) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
    } catch {
      setError(copy.customerDisplaySetup.copyError);
    }
  };
  return <PosModalFrame modalType="standard-form" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={<QrCode className="h-6 w-6" />} onClose={onClose} title={copy.center.accessDisplayTitle} subtitle={copy.center.accessDisplayDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<div className="flex gap-3"><button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>{copy.customerDisplaySetup.close}</button>{absoluteUrl ? <button type="button" onClick={() => window.open(absoluteUrl, '_blank', 'noopener,noreferrer')} className={posModalPrimaryActionClassName}><ExternalLink className="h-4 w-4" />{copy.center.openLink}</button> : null}</div>}>
    {loading ? <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />{copy.center.loadingAccess}</div> : null}
    {!loading && error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
    {!loading && access ? <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]"><section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium text-[#B63B32]">{display.name}</p><p className="mt-2 break-all text-sm font-medium">{absoluteUrl}</p><p className="mt-3 text-xs text-slate-500">{display.cashRegisterCode} · {display.cashRegisterName} · ••••{access.publicTokenHint}</p><button type="button" onClick={() => void copyLink()} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium dark:border-slate-700"><Copy className="h-4 w-4" />{copied ? copy.center.copied : copy.center.copyLink}</button></section><aside className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900">{qrCode ? <img src={qrCode} alt="" className="mx-auto w-full max-w-48" /> : <LoaderCircle className="mx-auto mt-16 h-6 w-6 animate-spin" />}<p className="mt-3 text-xs leading-5 text-slate-500">{copy.center.qrHelp}</p></aside></div> : null}
  </PosModalFrame>;
}

function CustomerDisplayLifecycleModal({ display, onClose, onChanged }: { display: CustomerDisplayAdminItem; onClose: () => void; onChanged: () => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const transition = async (action: 'disable' | 'enable' | 'revoke') => {
    setBusy(true);
    setError('');
    try {
      await customerDisplayApi.transitionAdmin(display.id, action, reason.trim());
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.customerDisplayAdmin.transitionError);
    } finally {
      setBusy(false);
    }
  };
  return <PosModalFrame modalType="confirmation" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={<Settings2 className="h-6 w-6" />} isCloseDisabled={busy} onClose={onClose} title={copy.center.lifecycleTitle} subtitle={copy.center.lifecycleDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<button type="button" onClick={onClose} disabled={busy} className={posModalSecondaryActionClassName}>{copy.common.cancel}</button>}>
    <div className="space-y-4"><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="font-medium">{display.name}</p><p className="mt-1 text-xs text-slate-500">{display.cashRegisterCode} · {display.cashRegisterName}</p></div><label><span className="mb-2 block text-sm font-medium">{copy.center.actionReason}</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" /></label><div className="grid gap-3 sm:grid-cols-2">{display.status === 'ACTIVE' ? <button type="button" onClick={() => void transition('disable')} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300 text-sm font-medium text-amber-800"><Power className="h-4 w-4" />{copy.center.disable}</button> : display.status === 'DISABLED' ? <button type="button" onClick={() => void transition('enable')} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-300 text-sm font-medium text-emerald-800"><Power className="h-4 w-4" />{copy.center.enable}</button> : null}{!['REVOKED', 'EXPIRED'].includes(display.status) ? <button type="button" onClick={() => void transition('revoke')} disabled={busy || !reason.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-medium text-red-700 disabled:opacity-50"><ShieldOff className="h-4 w-4" />{copy.center.revoke}</button> : null}</div>{error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}</div>
  </PosModalFrame>;
}

function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function KioskColumnsModal({ columns, onClose, onApply }: { columns: Array<{ id: ColumnId; visible: boolean }>; onClose: () => void; onApply: (columns: Array<{ id: ColumnId; visible: boolean }>) => void }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [draft, setDraft] = useState(columns);
  return <PosModalFrame modalType="standard-form" closeLabel={copy.common.cancel} eyebrow={copy.common.engine} icon={<Columns3 className="h-6 w-6" />} onClose={onClose} title={copy.center.columnsTitle} subtitle={copy.center.columnsDescription} tone="coral" footerClassName={posModalModuleFooterClassName} footer={<div className="flex gap-3"><button type="button" onClick={() => setDraft(defaultColumns)} className={posModalSecondaryActionClassName}><RotateCcw className="h-4 w-4" />{copy.center.restore}</button><button type="button" onClick={() => { onApply(draft); onClose(); }} className={posModalPrimaryActionClassName}>{copy.center.apply}</button></div>}>
    <div className="space-y-2">{draft.map((column) => <label key={column.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"><input type="checkbox" checked={column.visible} onChange={() => setDraft((current) => current.map((item) => item.id === column.id ? { ...item, visible: !item.visible } : item))} className="h-4 w-4 accent-[#FF6B5E]" /><span className="text-sm font-medium">{columnLabel(column.id, copy.center)}</span></label>)}</div>
  </PosModalFrame>;
}
