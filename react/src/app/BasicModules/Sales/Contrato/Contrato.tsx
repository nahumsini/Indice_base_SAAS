import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileSignature,
  FileText,
  FolderOpen,
  PencilLine,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../components/ui/utils';
import { useTablePagination } from '../../../hooks/useTablePagination';
import {
  salesOwners,
  type SalesContact,
  useSalesCrm,
} from '../salesCrmContext';
import { SalesModalFrame } from '../components/SalesModalFrame';
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../components/SalesFilterBar';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from '../components/SalesTitleBar';
import { getSalesModalActionClassNames } from '../salesModalStyles';
import { digitalContractsBackendPreparation } from './services/digitalContractsService';
import { digitalContractTemplateRegistry } from './templates/contractTemplateRegistry';
import {
  digitalContractCountries,
  digitalContractSources,
  digitalContractStatuses,
  digitalContractTypes,
  digitalSignatureStatuses,
  type DigitalContract,
  type DigitalContractCountry,
  type DigitalContractFile,
  type DigitalContractSource,
  type DigitalContractStatus,
  type DigitalContractType,
  type DigitalSignatureStatus,
} from './types/digitalContractTypes';
import { useDigitalContractsTranslations } from './translations';

type FilterValue = 'all' | string;
type ExpirationFilter = 'all' | 'next30' | 'expired';
type CreateMode = 'upload' | 'template';
const contractActionClassNames = getSalesModalActionClassNames('coral');

type ContractFormState = {
  mode: CreateMode;
  title: string;
  clientId: string;
  opportunityId: string;
  quoteId: string;
  postSaleCaseId: string;
  contractType: DigitalContractType;
  source: DigitalContractSource;
  country: DigitalContractCountry;
  templateId: string;
  owner: string;
  status: DigitalContractStatus;
  expirationDate: string;
  files: string;
  notes: string;
};

type SignatureFormState = {
  recipientName: string;
  recipientEmail: string;
  provider: 'Prepared only' | 'DocuSign' | 'Adobe Sign' | 'Local provider';
};

const statusClasses: Record<DigitalContractStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Internal review': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05] dark:text-[#F4C84A]',
  Sent: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  Viewed: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66] dark:text-[#7AD8BF]',
  'Pending signature': 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  Signed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  Expired: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
  Cancelled: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FFB0AA]',
};

const signatureClasses: Record<DigitalSignatureStatus, string> = {
  'Not requested': 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Waiting: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] dark:text-blue-300',
  Signed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  Declined: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#FFB0AA]',
  Expired: 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getFutureIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDaysUntil(date?: string) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  const target = new Date(date).getTime();
  const today = new Date(getTodayIsoDate()).getTime();
  return Math.ceil((target - today) / 86400000);
}

function parseFiles(value: string, source: DigitalContractSource): DigitalContractFile[] {
  return value.split(',').map((file) => file.trim()).filter(Boolean).map((file, index) => ({
    id: `DCF-TMP-${Date.now()}-${index + 1}`,
    name: file,
    kind: file.toLowerCase().endsWith('.pdf') ? 'pdf' : 'attachment',
    source,
    status: source === 'Template generated' ? 'generated' : 'attached',
  }));
}

function MetricCard({
  icon,
  value,
  label,
  className,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border bg-white shadow-sm', className)}>
          {icon}
        </span>
        <div>
          <p className="text-2xl font-black leading-none text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white px-4 text-base font-medium text-slate-950 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  className,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25',
        className,
      )}
    >
      {icon}
    </button>
  );
}

function getInitialContractForm(contact?: SalesContact): ContractFormState {
  return {
    mode: 'template',
    title: '',
    clientId: contact?.id ?? '',
    opportunityId: 'none',
    quoteId: 'none',
    postSaleCaseId: 'none',
    contractType: 'Service agreement',
    source: 'Template generated',
    country: 'Mexico',
    templateId: digitalContractTemplateRegistry[0]?.id ?? 'none',
    owner: salesOwners[0],
    status: 'Draft',
    expirationDate: getFutureIsoDate(30),
    files: '',
    notes: '',
  };
}

export default function Contrato() {
  const t = useDigitalContractsTranslations();
  const {
    contacts,
    opportunities,
    quotes,
    postSaleCases,
    contracts,
    addContract,
    updateContractStatus,
    updateContractSignatureStatus,
    requestContractSignature,
  } = useSalesCrm();

  const [selectedContractId, setSelectedContractId] = useState(contracts[0]?.id ?? '');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [filesContract, setFilesContract] = useState<DigitalContract | null>(null);
  const [signatureContract, setSignatureContract] = useState<DigitalContract | null>(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<FilterValue>('all');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [signatureFilter, setSignatureFilter] = useState<FilterValue>('all');
  const [typeFilter, setTypeFilter] = useState<FilterValue>('all');
  const [ownerFilter, setOwnerFilter] = useState<FilterValue>('all');
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>('all');
  const [form, setForm] = useState<ContractFormState>(() => getInitialContractForm(contacts[0]));
  const [signatureForm, setSignatureForm] = useState<SignatureFormState>({
    recipientName: '',
    recipientEmail: '',
    provider: 'Prepared only',
  });

  const selectedContract = contracts.find((contract) => contract.id === selectedContractId) ?? contracts[0] ?? null;

  const filteredContracts = useMemo(() => contracts.filter((contract) => {
    const opportunity = opportunities.find((item) => item.id === contract.relatedOpportunityId);
    const quote = quotes.find((item) => item.id === contract.relatedQuoteId);
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [
      contract.title,
      contract.contractNumber,
      contract.clientName,
      contract.owner,
      opportunity?.opportunityName ?? '',
      quote?.quoteNumber ?? '',
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesClient = clientFilter === 'all' || contract.clientId === clientFilter;
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesSignature = signatureFilter === 'all' || contract.signatureStatus === signatureFilter;
    const matchesType = typeFilter === 'all' || contract.contractType === typeFilter;
    const matchesOwner = ownerFilter === 'all' || contract.owner === ownerFilter;
    const expirationDays = getDaysUntil(contract.expirationDate);
    const matchesExpiration = expirationFilter === 'all'
      || (expirationFilter === 'next30' && expirationDays >= 0 && expirationDays <= 30)
      || (expirationFilter === 'expired' && expirationDays < 0);

    return matchesSearch && matchesClient && matchesStatus && matchesSignature && matchesType && matchesOwner && matchesExpiration;
  }), [clientFilter, contracts, expirationFilter, opportunities, ownerFilter, quotes, search, signatureFilter, statusFilter, typeFilter]);
  const {
    currentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd,
    pageSize,
    pageSizeOptions,
    pageStart,
    paginatedRows: paginatedContracts,
    totalCount,
    totalPages,
  } = useTablePagination({
    resetKey: `${search}:${clientFilter}:${statusFilter}:${signatureFilter}:${typeFilter}:${ownerFilter}:${expirationFilter}:${contracts.map((contract) => contract.id).join('|')}`,
    rows: filteredContracts,
  });

  const activeContracts = contracts.filter((contract) => !['Signed', 'Expired', 'Cancelled'].includes(contract.status)).length;
  const pendingSignatures = contracts.filter((contract) => contract.signatureStatus === 'Waiting' || contract.status === 'Pending signature').length;
  const expiringSoon = contracts.filter((contract) => {
    const days = getDaysUntil(contract.expirationDate);
    return days >= 0 && days <= 30;
  }).length;
  const signedThisMonth = contracts.filter((contract) => contract.status === 'Signed').length;
  const renewalContracts = contracts.filter((contract) => contract.contractType === 'Renewal agreement').length;

  const clientOptions = [
    { value: 'all', label: t.filters.allClients },
    ...contacts.map((contact) => ({ value: contact.id, label: `${contact.company} · ${contact.contactPerson}` })),
  ];
  const statusOptions = [
    { value: 'all', label: t.filters.allStatuses },
    ...digitalContractStatuses.map((status) => ({ value: status, label: t.statusLabels[status] })),
  ];
  const signatureOptions = [
    { value: 'all', label: t.filters.allSignatureStatuses },
    ...digitalSignatureStatuses.map((status) => ({ value: status, label: t.signatureLabels[status] })),
  ];
  const typeOptions = [
    { value: 'all', label: t.filters.allTypes },
    ...digitalContractTypes.map((type) => ({ value: type, label: t.typeLabels[type] })),
  ];
  const ownerOptions = [
    { value: 'all', label: t.filters.allOwners },
    ...salesOwners.map((owner) => ({ value: owner, label: owner })),
  ];

  const selectedTemplate = digitalContractTemplateRegistry.find((template) => template.id === form.templateId) ?? digitalContractTemplateRegistry[0];

  const setFormMode = (mode: CreateMode) => {
    setForm((current) => ({
      ...current,
      mode,
      source: mode === 'template' ? 'Template generated' : 'Uploaded document',
      templateId: mode === 'template' ? current.templateId || digitalContractTemplateRegistry[0]?.id : 'none',
    }));
  };

  const handleCreateContract = () => {
    const contact = contacts.find((item) => item.id === form.clientId);
    if (!contact || !form.title.trim()) {
      return;
    }

    const template = digitalContractTemplateRegistry.find((item) => item.id === form.templateId);
    const dynamicFieldValues = template?.dynamicFields.reduce<Record<string, string>>((result, field) => {
      result[field.key] = field.exampleValue;
      return result;
    }, {}) ?? {
      client_name: contact.company,
      responsible_seller: form.owner,
    };

    const createdContract = addContract({
      title: form.title.trim(),
      clientId: contact.id,
      clientName: contact.company,
      contactPerson: contact.contactPerson,
      relatedOpportunityId: form.opportunityId === 'none' ? undefined : form.opportunityId,
      relatedQuoteId: form.quoteId === 'none' ? undefined : form.quoteId,
      relatedPostSaleCaseId: form.postSaleCaseId === 'none' ? undefined : form.postSaleCaseId,
      contractType: form.contractType,
      status: form.status,
      owner: form.owner,
      signatureStatus: 'Not requested',
      source: form.source,
      country: form.country,
      templateId: form.mode === 'template' && form.templateId !== 'none' ? form.templateId : undefined,
      dynamicFieldValues,
      expirationDate: form.expirationDate,
      files: parseFiles(form.files || `${form.title.trim()}.pdf`, form.source),
      lifecycle: [
        { labelKey: 'created', status: 'done' },
        { labelKey: 'assigned', status: 'current' },
        { labelKey: 'documentPrepared', status: 'future' },
        { labelKey: 'signatureRequested', status: 'future' },
        { labelKey: 'clientReview', status: 'future' },
        { labelKey: 'signedVersionStored', status: 'future' },
      ],
      notes: form.notes,
    });
    setSelectedContractId(createdContract.id);
    setForm(getInitialContractForm(contacts[0]));
    setIsCreateOpen(false);
  };

  const openSignatureModal = (contract: DigitalContract) => {
    setSignatureContract(contract);
    setSignatureForm({
      recipientName: contract.contactPerson,
      recipientEmail: contacts.find((contact) => contact.id === contract.clientId)?.email ?? '',
      provider: 'Prepared only',
    });
  };

  const handlePrepareSignature = () => {
    if (!signatureContract || !signatureForm.recipientName.trim() || !signatureForm.recipientEmail.trim()) {
      return;
    }

    requestContractSignature(signatureContract.id, {
      id: `SIG-${Date.now()}`,
      requestedAt: getTodayIsoDate(),
      requestedBy: signatureContract.owner,
      recipientName: signatureForm.recipientName.trim(),
      recipientEmail: signatureForm.recipientEmail.trim(),
      provider: signatureForm.provider,
      status: 'Waiting',
    });
    setSignatureContract(null);
  };

  return (
    <section className="space-y-5">
      <SalesTitleBar
        icon="📝"
        rhIndent
        title={t.header.title}
        subtitle={t.header.subtitle}
        actions={(
          <>
            <Button className={salesTitleBarPrimaryActionClassName} onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.header.createContract}
            </Button>
            <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={() => setIsTemplatesOpen(true)}>
              <FolderOpen className="h-4 w-4" />
              {t.header.templateLibrary}
            </Button>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<FileSignature className="h-5 w-5" />} value={activeContracts} label={t.metrics.activeContracts} className="text-[#2563EB]" />
        <MetricCard icon={<Send className="h-5 w-5" />} value={pendingSignatures} label={t.metrics.pendingSignatures} className="text-[#2563EB]" />
        <MetricCard icon={<CalendarClock className="h-5 w-5" />} value={expiringSoon} label={t.metrics.expiringSoon} className="text-[#9a6b05]" />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} value={signedThisMonth} label={t.metrics.signedThisMonth} className="text-[#177d66]" />
        <MetricCard icon={<Sparkles className="h-5 w-5" />} value={renewalContracts} label={t.metrics.renewalContracts} className="text-[#b63b32]" />
      </div>

      <div className="rounded-lg border border-[#F4C84A]/40 bg-[#F4C84A]/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#9a6b05]" />
          <div>
            <h3 className="font-black text-slate-950">{t.sections.legalBoundary}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t.notices.legalBoundary}</p>
          </div>
        </div>
      </div>

      <SalesFilterBar
        title={t.filters.title}
        gridClassName="xl:grid-cols-4 2xl:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))]"
      >
        <SalesFilterSearch
          label={t.filters.search}
          value={search}
          onValueChange={setSearch}
          placeholder={t.filters.searchPlaceholder}
        />
        <SalesFilterSelect label={t.filters.status} value={statusFilter} onValueChange={setStatusFilter} options={statusOptions} />
        <SalesFilterSelect label={t.filters.contractType} value={typeFilter} onValueChange={setTypeFilter} options={typeOptions} />
        <SalesFilterSelect label={t.filters.client} value={clientFilter} onValueChange={setClientFilter} options={clientOptions} />
        <SalesFilterSelect label={t.filters.signatureStatus} value={signatureFilter} onValueChange={setSignatureFilter} options={signatureOptions} />
        <SalesFilterSelect label={t.filters.owner} value={ownerFilter} onValueChange={setOwnerFilter} options={ownerOptions} />
        <SalesFilterSelect
          label={t.filters.expiration}
          value={expirationFilter}
          onValueChange={(value) => setExpirationFilter(value as ExpirationFilter)}
          options={[
            { value: 'all', label: t.filters.allExpirations },
            { value: 'next30', label: t.filters.next30 },
            { value: 'expired', label: t.filters.expired },
          ]}
        />
      </SalesFilterBar>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#2563EB]" />
              <h3 className="text-xl font-black text-slate-950">{t.sections.tableTitle}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t.sections.tableDescription}</p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="min-w-[240px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.title}</TableHead>
                  <TableHead className="min-w-[180px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.client}</TableHead>
                  <TableHead className="min-w-[220px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.opportunity}</TableHead>
                  <TableHead className="min-w-[140px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.quote}</TableHead>
                  <TableHead className="min-w-[170px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.type}</TableHead>
                  <TableHead className="min-w-[175px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.status}</TableHead>
                  <TableHead className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.owner}</TableHead>
                  <TableHead className="min-w-[165px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.signature}</TableHead>
                  <TableHead className="min-w-[130px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.updated}</TableHead>
                  <TableHead className="min-w-[130px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.expiration}</TableHead>
                  <TableHead className="min-w-[100px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.files}</TableHead>
                  <TableHead className="min-w-[160px] px-5 py-4 text-xs font-black uppercase tracking-normal text-slate-500">{t.table.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                      {t.table.empty}
                    </TableCell>
                  </TableRow>
                ) : paginatedContracts.map((contract) => {
                  const opportunity = opportunities.find((item) => item.id === contract.relatedOpportunityId);
                  const quote = quotes.find((item) => item.id === contract.relatedQuoteId);

                  return (
                    <TableRow key={contract.id} className="align-top hover:bg-slate-50/70">
                      <TableCell className="px-5 py-4">
                        <button type="button" className="text-left" onClick={() => setSelectedContractId(contract.id)}>
                          <p className="font-black text-slate-950">{contract.title}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-500">{contract.contractNumber}</p>
                          <Badge className="mt-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600">
                            {t.sourceLabels[contract.source]}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="font-black text-slate-950">{contract.clientName}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{contract.contactPerson}</p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {opportunity ? (
                          <Badge className="rounded-full border border-[#2563EB]/25 bg-[#2563EB]/10 px-2 py-1 text-xs font-bold text-[#1D4ED8]">
                            {opportunity.opportunityName}
                          </Badge>
                        ) : <span className="text-sm font-semibold text-slate-400">{t.common.unassigned}</span>}
                      </TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-700">{quote?.quoteNumber ?? t.common.notAvailable}</TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-700">{t.typeLabels[contract.contractType]}</TableCell>
                      <TableCell className="px-5 py-4">
                        <Select value={contract.status} onValueChange={(value) => updateContractStatus(contract.id, value as DigitalContractStatus)}>
                          <SelectTrigger className={cn('h-9 rounded-lg border px-3 text-sm font-black shadow-none', statusClasses[contract.status])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {digitalContractStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {t.statusLabels[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-700">{contract.owner}</TableCell>
                      <TableCell className="px-5 py-4">
                        <Select value={contract.signatureStatus} onValueChange={(value) => updateContractSignatureStatus(contract.id, value as DigitalSignatureStatus)}>
                          <SelectTrigger className={cn('h-9 rounded-lg border px-3 text-sm font-black shadow-none', signatureClasses[contract.signatureStatus])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {digitalSignatureStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {t.signatureLabels[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-600">{contract.lastUpdated}</TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-600">{contract.expirationDate}</TableCell>
                      <TableCell className="px-5 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          onClick={() => setFilesContract(contract)}
                        >
                          <FileText className="h-4 w-4 text-[#2563EB]" />
                          {contract.files.length}
                        </button>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="mx-auto grid w-fit grid-cols-[repeat(4,2.25rem)] gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                          <ActionButton label={t.actions.preview} icon={<FileSignature className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15 dark:text-blue-300 dark:hover:bg-[#2563EB]/20" onClick={() => setSelectedContractId(contract.id)} />
                          <ActionButton label={t.actions.files} icon={<FolderOpen className="h-4 w-4" />} className="border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05] hover:bg-[#F4C84A]/20 dark:text-[#F4C84A] dark:hover:bg-[#F4C84A]/25" onClick={() => setFilesContract(contract)} />
                          <ActionButton label={t.actions.requestSignature} icon={<Send className="h-4 w-4" />} className="border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20 dark:text-[#7AD8BF] dark:hover:bg-[#59C3A5]/25" onClick={() => openSignatureModal(contract)} />
                          <ActionButton label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            currentPage={currentPage}
            itemLabel={t.header.title.toLocaleLowerCase()}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageEnd={pageEnd}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            pageStart={pageStart}
            totalCount={totalCount}
            totalPages={totalPages}
          />
        </div>

        <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#2563EB]" />
            <h3 className="text-xl font-black text-slate-950">{t.sections.previewTitle}</h3>
          </div>
          <p className="text-sm leading-6 text-slate-500">{t.sections.previewDescription}</p>

          {selectedContract ? (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-500">{selectedContract.contractNumber}</p>
                <h4 className="mt-2 text-lg font-black text-slate-950">{selectedContract.title}</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', statusClasses[selectedContract.status])}>
                    {t.statusLabels[selectedContract.status]}
                  </Badge>
                  <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', signatureClasses[selectedContract.signatureStatus])}>
                    {t.signatureLabels[selectedContract.signatureStatus]}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-black text-slate-950">{t.sections.lifecycle}</h4>
                <div className="mt-3 space-y-2">
                  {selectedContract.lifecycle.map((step) => (
                    <div key={step.labelKey} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                      <span className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-black',
                        step.status === 'done' && 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]',
                        step.status === 'current' && 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
                        step.status === 'future' && 'border-slate-200 bg-slate-50 text-slate-400',
                      )}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-bold text-slate-700">{t.lifecycleLabels[step.labelKey]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-black text-slate-950">{t.sections.dynamicFields}</h4>
                <div className="mt-3 grid gap-2">
                  {Object.entries(selectedContract.dynamicFieldValues).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-normal text-slate-400">
                        {t.dynamicFieldLabels[key as keyof typeof t.dynamicFieldLabels] ?? key}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#F4C84A]/40 bg-[#F4C84A]/10 p-4">
                <p className="text-sm font-bold text-[#9a6b05]">
                  {selectedContract.source === 'Template generated' ? t.notices.generated : t.notices.upload}
                </p>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      <SalesModalFrame
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        closeLabel={t.common.cancel}
        title={t.forms.create.title}
        description={t.forms.create.description}
        icon={<FileSignature className="h-5 w-5" />}
        modalType="standard-form"
        bodyClassName="grid gap-4 md:grid-cols-2"
        footer={(
          <>
            <Button variant="outline" className={contractActionClassNames.secondary} onClick={() => setIsCreateOpen(false)}>{t.common.cancel}</Button>
            <Button className={contractActionClassNames.primary} onClick={handleCreateContract}>
              <Plus className="h-4 w-4" />
              {t.forms.create.submit}
            </Button>
          </>
        )}
      >
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">{t.forms.create.mode}</label>
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2">
                <Button
                  variant={form.mode === 'upload' ? 'default' : 'ghost'}
                  className={cn('rounded-lg', form.mode === 'upload' && 'bg-[#FF6B5E] text-white hover:bg-[#E85C50]')}
                  onClick={() => setFormMode('upload')}
                >
                  <FolderOpen className="h-4 w-4" />
                  {t.forms.create.uploadMode}
                </Button>
                <Button
                  variant={form.mode === 'template' ? 'default' : 'ghost'}
                  className={cn('rounded-lg', form.mode === 'template' && 'bg-[#FF6B5E] text-white hover:bg-[#E85C50]')}
                  onClick={() => setFormMode('template')}
                >
                  <Sparkles className="h-4 w-4" />
                  {t.forms.create.templateMode}
                </Button>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">{t.forms.create.contractTitle}</label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={t.forms.create.contractTitlePlaceholder} />
            </div>
            <FilterSelect label={t.forms.create.client} value={form.clientId} onValueChange={(value) => setForm((current) => ({ ...current, clientId: value }))} options={contacts.map((contact) => ({ value: contact.id, label: `${contact.company} · ${contact.contactPerson}` }))} />
            <FilterSelect label={t.forms.create.opportunity} value={form.opportunityId} onValueChange={(value) => setForm((current) => ({ ...current, opportunityId: value }))} options={[{ value: 'none', label: t.common.none }, ...opportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName }))]} />
            <FilterSelect label={t.forms.create.quote} value={form.quoteId} onValueChange={(value) => setForm((current) => ({ ...current, quoteId: value }))} options={[{ value: 'none', label: t.common.none }, ...quotes.map((quote) => ({ value: quote.id, label: `${quote.quoteNumber} · ${quote.clientName}` }))]} />
            <FilterSelect label={t.forms.create.postSale} value={form.postSaleCaseId} onValueChange={(value) => setForm((current) => ({ ...current, postSaleCaseId: value }))} options={[{ value: 'none', label: t.common.none }, ...postSaleCases.map((postSaleCase) => ({ value: postSaleCase.id, label: postSaleCase.clientName }))]} />
            <FilterSelect label={t.forms.create.type} value={form.contractType} onValueChange={(value) => setForm((current) => ({ ...current, contractType: value as DigitalContractType }))} options={digitalContractTypes.map((type) => ({ value: type, label: t.typeLabels[type] }))} />
            <FilterSelect label={t.forms.create.country} value={form.country} onValueChange={(value) => setForm((current) => ({ ...current, country: value as DigitalContractCountry }))} options={digitalContractCountries.map((country) => ({ value: country, label: t.countryLabels[country] }))} />
            <FilterSelect label={t.forms.create.owner} value={form.owner} onValueChange={(value) => setForm((current) => ({ ...current, owner: value }))} options={salesOwners.map((owner) => ({ value: owner, label: owner }))} />
            <FilterSelect label={t.forms.create.status} value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as DigitalContractStatus }))} options={digitalContractStatuses.map((status) => ({ value: status, label: t.statusLabels[status] }))} />
            <FilterSelect label={t.forms.create.source} value={form.source} onValueChange={(value) => setForm((current) => ({ ...current, source: value as DigitalContractSource }))} options={digitalContractSources.map((source) => ({ value: source, label: t.sourceLabels[source] }))} />
            {form.mode === 'template' ? (
              <FilterSelect label={t.forms.create.template} value={form.templateId} onValueChange={(value) => setForm((current) => ({ ...current, templateId: value }))} options={digitalContractTemplateRegistry.map((template) => ({ value: template.id, label: template.name }))} />
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t.forms.create.expiration}</label>
              <Input type="date" value={form.expirationDate} onChange={(event) => setForm((current) => ({ ...current, expirationDate: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">{t.forms.create.files}</label>
              <Input value={form.files} onChange={(event) => setForm((current) => ({ ...current, files: event.target.value }))} placeholder={t.forms.create.filesPlaceholder} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">{t.forms.create.notes}</label>
              <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.forms.create.notesPlaceholder} />
            </div>
            {form.mode === 'template' && selectedTemplate ? (
              <div className="rounded-lg border border-[#222831]/15 bg-[#222831]/5 p-4 md:col-span-2">
                <h4 className="font-semibold text-slate-950">{selectedTemplate.name}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">{selectedTemplate.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTemplate.dynamicFields.map((field) => (
                    <Badge key={field.key} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                      {t.dynamicFieldLabels[field.key]}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
      </SalesModalFrame>

      <SalesModalFrame
        open={isTemplatesOpen}
        onOpenChange={setIsTemplatesOpen}
        closeLabel={t.common.close}
        title={t.sections.templateRegistry}
        description={t.sections.templateRegistryDescription}
        icon={<FolderOpen className="h-5 w-5" />}
        modalType="large-workspace"
        bodyClassName="space-y-4"
        footerClassName="sm:justify-end"
        footer={(
          <Button className={contractActionClassNames.primary} onClick={() => setIsTemplatesOpen(false)}>{t.common.close}</Button>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-3">
            {digitalContractTemplateRegistry.map((template) => (
              <article key={template.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{template.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{template.version} · {t.countryLabels[template.country]}</p>
                  </div>
                  <Badge className="rounded-full border border-[#2563EB]/25 bg-[#2563EB]/10 px-2 py-1 text-xs font-medium text-[#1D4ED8]">
                    {t.typeLabels[template.contractType]}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{template.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {template.dynamicFields.map((field) => (
                    <Badge key={field.key} variant="outline" className="rounded-full text-xs">
                      {t.dynamicFieldLabels[field.key]}
                    </Badge>
                  ))}
                </div>
              </article>
            ))}
        </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-950">{t.sections.backendReady}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {digitalContractsBackendPreparation.entities.map((entity) => (
                <Badge key={entity} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                  {entity}
                </Badge>
              ))}
            </div>
          </div>
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(filesContract)}
        onOpenChange={(open) => !open && setFilesContract(null)}
        closeLabel={t.common.close}
        title={t.sections.files}
        description={t.notices.upload}
        icon={<FolderOpen className="h-5 w-5" />}
        modalType="standard-form"
        bodyClassName="space-y-3"
        footerClassName="sm:justify-end"
        footer={(
          <Button className={contractActionClassNames.primary} onClick={() => setFilesContract(null)}>{t.common.close}</Button>
        )}
      >
            {filesContract?.files.map((file) => (
              <div key={file.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-[#222831]" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{file.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {t.fileKindLabels[file.kind]} · {t.fileStatusLabels[file.status]} · {t.sourceLabels[file.source]}
                    </p>
                  </div>
                </div>
              </div>
            ))}
      </SalesModalFrame>

      <SalesModalFrame
        open={Boolean(signatureContract)}
        onOpenChange={(open) => !open && setSignatureContract(null)}
        closeLabel={t.common.cancel}
        title={t.forms.signature.title}
        description={t.forms.signature.description}
        icon={<Send className="h-5 w-5" />}
        modalType="standard-form"
        bodyClassName="grid gap-4 md:grid-cols-2"
        footer={(
          <>
            <Button variant="outline" className={contractActionClassNames.secondary} onClick={() => setSignatureContract(null)}>{t.common.cancel}</Button>
            <Button className={contractActionClassNames.primary} onClick={handlePrepareSignature}>
              <Send className="h-4 w-4" />
              {t.forms.signature.submit}
            </Button>
          </>
        )}
      >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t.forms.signature.recipientName}</label>
              <Input value={signatureForm.recipientName} onChange={(event) => setSignatureForm((current) => ({ ...current, recipientName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">{t.forms.signature.recipientEmail}</label>
              <Input value={signatureForm.recipientEmail} onChange={(event) => setSignatureForm((current) => ({ ...current, recipientEmail: event.target.value }))} />
            </div>
            <FilterSelect
              label={t.forms.signature.provider}
              value={signatureForm.provider}
              onValueChange={(value) => setSignatureForm((current) => ({ ...current, provider: value as SignatureFormState['provider'] }))}
              options={[
                { value: 'Prepared only', label: t.forms.signature.providerPreparedOnly },
                { value: 'DocuSign', label: t.forms.signature.providerDocuSign },
                { value: 'Adobe Sign', label: t.forms.signature.providerAdobeSign },
                { value: 'Local provider', label: t.forms.signature.providerLocal },
              ]}
            />
            <div className="rounded-lg border border-[#F4C84A]/40 bg-[#F4C84A]/10 p-4">
              <p className="text-sm font-medium text-[#9a6b05]">{t.notices.legalBoundary}</p>
            </div>
      </SalesModalFrame>
    </section>
  );
}
