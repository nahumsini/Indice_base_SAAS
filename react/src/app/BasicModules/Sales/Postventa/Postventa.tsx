import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Link2,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
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
import {
  customerRelationTypes,
  lostReasons,
  postSaleRiskLevels,
  postSaleStatuses,
  postSaleTypes,
  salesOwners,
  type CustomerRelationType,
  type LostReason,
  type PostSaleRiskLevel,
  type PostSaleStatus,
  type PostSaleType,
  type SalesPostSaleCase,
  useSalesCrm,
} from '../salesCrmContext';
import { getSalesModalStyles } from '../salesModalStyles';
import { usePostSalesTranslations } from './translations';

type ViewMode = 'table' | 'followUp';
type FilterValue = 'all' | string;
const postSaleModalStyles = getSalesModalStyles('coral');
const futureOpportunityModalStyles = getSalesModalStyles('aqua');

type PostSaleFormState = {
  clientId: string;
  relatedOpportunityId: string;
  lastQuoteId: string;
  relationType: CustomerRelationType;
  postSaleType: PostSaleType;
  status: PostSaleStatus;
  owner: string;
  lastPurchaseDate: string;
  nextFollowUpDate: string;
  renewalDate: string;
  lifetimeValue: string;
  nextAction: string;
  notes: string;
  files: string;
};

type LostFollowUpFormState = {
  clientId: string;
  relatedOpportunityId: string;
  lostReason: LostReason;
  nextFollowUpDate: string;
  owner: string;
  notes: string;
};

type FutureOpportunityFormState = {
  opportunityName: string;
  expectedCloseDate: string;
  nextActionDate: string;
  notes: string;
};

const statusClasses: Record<PostSaleStatus, string> = {
  Active: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  'Pending follow-up': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  'In service': 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  'Renewal soon': 'border-violet-200 bg-violet-50 text-violet-700',
  Recurrent: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  'At risk': 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Closed: 'border-slate-200 bg-slate-50 text-slate-600',
};

const relationClasses: Record<CustomerRelationType, string> = {
  'One-time customer': 'border-slate-200 bg-slate-50 text-slate-700',
  'Recurrent customer': 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  'Renewal customer': 'border-violet-200 bg-violet-50 text-violet-700',
  'Dormant customer': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  'Lost prospect': 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
};

const riskClasses: Record<PostSaleRiskLevel, string> = {
  Low: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  Medium: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  High: 'border-[#FF6B5E]/30 bg-[#FF6B5E]/10 text-[#b63b32]',
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function parseFiles(value: string) {
  return value.split(',').map((file) => file.trim()).filter(Boolean);
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
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-none">
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
        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20',
        className,
      )}
    >
      {icon}
    </button>
  );
}

function FollowUpLane({
  title,
  description,
  cases,
  emptyLabel,
  renderMeta,
}: {
  title: string;
  description: string;
  cases: SalesPostSaleCase[];
  emptyLabel: string;
  renderMeta: (postSaleCase: SalesPostSaleCase) => string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="mt-4 space-y-3">
        {cases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">
            {emptyLabel}
          </div>
        ) : cases.map((postSaleCase) => (
          <article key={postSaleCase.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">{postSaleCase.clientName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{postSaleCase.nextAction}</p>
              </div>
              <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', riskClasses[postSaleCase.riskLevel])}>
                {renderMeta(postSaleCase)}
              </Badge>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Postventa() {
  const t = usePostSalesTranslations();
  const {
    contacts,
    opportunities,
    quotes,
    postSaleCases,
    addPostSaleCase,
    addOpportunity,
    updatePostSaleCaseStatus,
  } = useSalesCrm();

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [selectedFilesCase, setSelectedFilesCase] = useState<SalesPostSaleCase | null>(null);
  const [futureOpportunityCase, setFutureOpportunityCase] = useState<SalesPostSaleCase | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [relationFilter, setRelationFilter] = useState<FilterValue>('all');
  const [typeFilter, setTypeFilter] = useState<FilterValue>('all');
  const [ownerFilter, setOwnerFilter] = useState<FilterValue>('all');
  const [renewalFilter, setRenewalFilter] = useState<FilterValue>('all');
  const [followUpFilter, setFollowUpFilter] = useState<FilterValue>('all');
  const [riskFilter, setRiskFilter] = useState<FilterValue>('all');
  const [caseForm, setCaseForm] = useState<PostSaleFormState>(() => ({
    clientId: contacts[0]?.id ?? '',
    relatedOpportunityId: 'none',
    lastQuoteId: 'none',
    relationType: 'One-time customer',
    postSaleType: 'Standard post-sale',
    status: 'Active',
    owner: salesOwners[0],
    lastPurchaseDate: getTodayIsoDate(),
    nextFollowUpDate: getFutureIsoDate(7),
    renewalDate: getFutureIsoDate(90),
    lifetimeValue: '',
    nextAction: '',
    notes: '',
    files: '',
  }));
  const [lostForm, setLostForm] = useState<LostFollowUpFormState>(() => ({
    clientId: contacts[0]?.id ?? '',
    relatedOpportunityId: 'none',
    lostReason: 'Timing',
    nextFollowUpDate: getFutureIsoDate(30),
    owner: salesOwners[0],
    notes: '',
  }));
  const [futureForm, setFutureForm] = useState<FutureOpportunityFormState>(() => ({
    opportunityName: '',
    expectedCloseDate: getFutureIsoDate(30),
    nextActionDate: getFutureIsoDate(7),
    notes: '',
  }));

  const statusOptions = [
    { value: 'all', label: t.filters.allStatuses },
    ...postSaleStatuses.map((status) => ({ value: status, label: t.statusLabels[status] })),
  ];
  const relationOptions = [
    { value: 'all', label: t.filters.allRelationTypes },
    ...customerRelationTypes.map((relationType) => ({ value: relationType, label: t.relationTypeLabels[relationType] })),
  ];
  const postSaleTypeOptions = [
    { value: 'all', label: t.filters.allPostSaleTypes },
    ...postSaleTypes.map((postSaleType) => ({ value: postSaleType, label: t.postSaleTypeLabels[postSaleType] })),
  ];
  const ownerOptions = [
    { value: 'all', label: t.filters.allOwners },
    ...salesOwners.map((owner) => ({ value: owner, label: owner })),
  ];
  const riskOptions = [
    { value: 'all', label: t.filters.allRisk },
    { value: 'high', label: t.filters.highRisk },
    ...postSaleRiskLevels.map((risk) => ({ value: risk, label: t.riskLabels[risk] })),
  ];

  const filteredCases = useMemo(() => postSaleCases.filter((postSaleCase) => {
    const opportunity = opportunities.find((item) => item.id === postSaleCase.relatedOpportunityId);
    const quote = quotes.find((item) => item.id === postSaleCase.lastQuoteId);
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [
      postSaleCase.clientName,
      postSaleCase.contactPerson,
      postSaleCase.owner,
      postSaleCase.notes,
      postSaleCase.nextAction,
      opportunity?.opportunityName ?? '',
      quote?.quoteNumber ?? '',
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === 'all' || postSaleCase.status === statusFilter;
    const matchesRelation = relationFilter === 'all' || postSaleCase.relationType === relationFilter;
    const matchesType = typeFilter === 'all' || postSaleCase.postSaleType === typeFilter;
    const matchesOwner = ownerFilter === 'all' || postSaleCase.owner === ownerFilter;
    const renewalDays = getDaysUntil(postSaleCase.renewalDate);
    const followUpDays = getDaysUntil(postSaleCase.nextFollowUpDate);
    const matchesRenewal = renewalFilter === 'all'
      || (renewalFilter === 'next30' && renewalDays >= 0 && renewalDays <= 30)
      || (renewalFilter === 'missing' && !postSaleCase.renewalDate);
    const matchesFollowUp = followUpFilter === 'all'
      || (followUpFilter === 'next7' && followUpDays >= 0 && followUpDays <= 7)
      || (followUpFilter === 'overdue' && followUpDays < 0);
    const matchesRisk = riskFilter === 'all'
      || (riskFilter === 'high' && postSaleCase.riskLevel === 'High')
      || postSaleCase.riskLevel === riskFilter;

    return matchesSearch && matchesStatus && matchesRelation && matchesType && matchesOwner && matchesRenewal && matchesFollowUp && matchesRisk;
  }), [followUpFilter, opportunities, ownerFilter, postSaleCases, quotes, relationFilter, renewalFilter, riskFilter, search, statusFilter, typeFilter]);

  const activePostSales = postSaleCases.filter((postSaleCase) => !['Completed', 'Closed'].includes(postSaleCase.status)).length;
  const recurrentCustomers = postSaleCases.filter((postSaleCase) => postSaleCase.relationType === 'Recurrent customer' || postSaleCase.postSaleType === 'Recurrent post-sale').length;
  const renewalsSoon = postSaleCases.filter((postSaleCase) => {
    const days = getDaysUntil(postSaleCase.renewalDate);
    return days >= 0 && days <= 30;
  }).length;
  const atRiskClients = postSaleCases.filter((postSaleCase) => postSaleCase.status === 'At risk' || postSaleCase.riskLevel === 'High').length;
  const futureFollowUps = postSaleCases.filter((postSaleCase) => getDaysUntil(postSaleCase.nextFollowUpDate) >= 0).length;

  const upcomingContacts = filteredCases
    .filter((postSaleCase) => {
      const days = getDaysUntil(postSaleCase.nextFollowUpDate);
      return days >= 0 && days <= 14;
    })
    .sort((first, second) => getDaysUntil(first.nextFollowUpDate) - getDaysUntil(second.nextFollowUpDate));
  const renewalCases = filteredCases.filter((postSaleCase) => {
    const days = getDaysUntil(postSaleCase.renewalDate);
    return days >= 0 && days <= 30;
  });
  const dormantCases = filteredCases.filter((postSaleCase) => postSaleCase.relationType === 'Dormant customer');
  const riskCases = filteredCases.filter((postSaleCase) => postSaleCase.status === 'At risk' || postSaleCase.riskLevel === 'High');
  const reactivationCases = filteredCases.filter((postSaleCase) => postSaleCase.relationType === 'Lost prospect');

  const handleCreateCase = () => {
    const contact = contacts.find((item) => item.id === caseForm.clientId);

    if (!contact || !caseForm.nextAction.trim()) {
      return;
    }

    addPostSaleCase({
      clientId: contact.id,
      clientName: contact.company,
      contactPerson: contact.contactPerson,
      relatedOpportunityId: caseForm.relatedOpportunityId === 'none' ? undefined : caseForm.relatedOpportunityId,
      lastQuoteId: caseForm.lastQuoteId === 'none' ? undefined : caseForm.lastQuoteId,
      relationType: caseForm.relationType,
      postSaleType: caseForm.postSaleType,
      status: caseForm.status,
      owner: caseForm.owner,
      lastPurchaseDate: caseForm.lastPurchaseDate || undefined,
      nextFollowUpDate: caseForm.nextFollowUpDate,
      renewalDate: caseForm.renewalDate || undefined,
      lifetimeValue: Number(caseForm.lifetimeValue) || 0,
      notes: caseForm.notes,
      files: parseFiles(caseForm.files),
      nextAction: caseForm.nextAction,
      riskLevel: caseForm.status === 'At risk' ? 'High' : 'Low',
      commercialHistory: [
        contact.company,
        caseForm.relatedOpportunityId === 'none' ? t.common.unassigned : caseForm.relatedOpportunityId,
        caseForm.nextAction,
      ],
    });
    setIsCaseModalOpen(false);
  };

  const handleCreateLostFollowUp = () => {
    const contact = contacts.find((item) => item.id === lostForm.clientId);

    if (!contact) {
      return;
    }

    addPostSaleCase({
      clientId: contact.id,
      clientName: contact.company,
      contactPerson: contact.contactPerson,
      relatedOpportunityId: lostForm.relatedOpportunityId === 'none' ? undefined : lostForm.relatedOpportunityId,
      lastQuoteId: undefined,
      relationType: 'Lost prospect',
      postSaleType: 'Standard post-sale',
      status: 'Pending follow-up',
      owner: lostForm.owner,
      lastPurchaseDate: undefined,
      nextFollowUpDate: lostForm.nextFollowUpDate,
      renewalDate: undefined,
      lifetimeValue: 0,
      notes: lostForm.notes,
      files: [],
      lostReason: lostForm.lostReason,
      nextAction: t.forms.lost.submit,
      riskLevel: 'Medium',
      commercialHistory: [t.relationTypeLabels['Lost prospect'], t.lostReasonLabels[lostForm.lostReason], lostForm.nextFollowUpDate],
    });
    setIsLostModalOpen(false);
  };

  const openFutureOpportunityModal = (postSaleCase: SalesPostSaleCase) => {
    setFutureOpportunityCase(postSaleCase);
    setFutureForm({
      opportunityName: `${postSaleCase.clientName} ${t.forms.opportunity.defaultSuffix}`,
      expectedCloseDate: postSaleCase.renewalDate ?? getFutureIsoDate(30),
      nextActionDate: postSaleCase.nextFollowUpDate,
      notes: postSaleCase.notes,
    });
  };

  const handleCreateFutureOpportunity = () => {
    if (!futureOpportunityCase || !futureForm.opportunityName.trim()) {
      return;
    }

    const contact = contacts.find((item) => item.id === futureOpportunityCase.clientId);

    addOpportunity({
      opportunityName: futureForm.opportunityName.trim(),
      contactId: contact?.id ?? '',
      company: futureOpportunityCase.clientName,
      contactPerson: futureOpportunityCase.contactPerson,
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
      source: contact?.source ?? 'Existing customer',
      stage: 'New',
      temperature: futureOpportunityCase.riskLevel === 'High' ? 'Warm' : 'Hot',
      owner: futureOpportunityCase.owner,
      estimatedValue: formatCurrency(Math.max(futureOpportunityCase.lifetimeValue, 1)),
      probability: '25%',
      expectedCloseDate: futureForm.expectedCloseDate,
      nextAction: 'Follow up',
      nextActionDate: futureForm.nextActionDate,
      lastContact: getTodayIsoDate(),
      files: futureOpportunityCase.files,
      status: 'Active',
      notes: futureForm.notes,
    });
    setFutureOpportunityCase(null);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-2xl shadow-sm ring-1 ring-[#FF6B5E]/20">
              <span aria-hidden="true">{t.header.emoji}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t.header.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t.header.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="h-11 rounded-lg bg-[#FF6B5E] px-4 text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E8564B]" onClick={() => setIsCaseModalOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.header.createCase}
            </Button>
            <Button variant="outline" className="h-11 rounded-lg border-slate-200 bg-white px-4 text-slate-800 hover:bg-slate-50" onClick={() => setIsLostModalOpen(true)}>
              <RefreshCw className="h-4 w-4" />
              {t.header.lostFollowUp}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<ShieldCheck className="h-5 w-5" />} value={activePostSales} label={t.metrics.activePostSales} className="text-[#2563EB]" />
        <MetricCard icon={<RefreshCw className="h-5 w-5" />} value={recurrentCustomers} label={t.metrics.recurrentCustomers} className="text-[#177d66]" />
        <MetricCard icon={<CalendarClock className="h-5 w-5" />} value={renewalsSoon} label={t.metrics.renewalsSoon} className="text-violet-600" />
        <MetricCard icon={<AlertTriangle className="h-5 w-5" />} value={atRiskClients} label={t.metrics.atRiskClients} className="text-[#b63b32]" />
        <MetricCard icon={<Clock3 className="h-5 w-5" />} value={futureFollowUps} label={t.metrics.futureFollowUps} className="text-[#9a6b05]" />
      </div>

      <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {(['table', 'followUp'] as ViewMode[]).map((view) => (
          <Button
            key={view}
            type="button"
            variant={viewMode === view ? 'default' : 'ghost'}
            className={cn('h-10 rounded-lg px-4', viewMode === view && 'bg-[#F4C84A] text-[#222831] hover:bg-[#e5b835]')}
            onClick={() => setViewMode(view)}
          >
            {view === 'table' ? <UsersRound className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
            {t.views[view]}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-[#2563EB]" />
          <h3 className="text-lg font-bold text-slate-950">{t.filters.title}</h3>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.filters.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.filters.searchPlaceholder}
                className="h-11 rounded-lg border-slate-200 bg-white pl-11 text-base font-semibold text-slate-950 shadow-none"
              />
            </div>
          </div>
          <FilterSelect label={t.filters.status} value={statusFilter} onValueChange={setStatusFilter} options={statusOptions} />
          <FilterSelect label={t.filters.relationType} value={relationFilter} onValueChange={setRelationFilter} options={relationOptions} />
          <FilterSelect label={t.filters.postSaleType} value={typeFilter} onValueChange={setTypeFilter} options={postSaleTypeOptions} />
          <FilterSelect label={t.filters.owner} value={ownerFilter} onValueChange={setOwnerFilter} options={ownerOptions} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FilterSelect
            label={t.filters.renewal}
            value={renewalFilter}
            onValueChange={setRenewalFilter}
            options={[
              { value: 'all', label: t.filters.allRenewals },
              { value: 'next30', label: t.filters.renewalNext30 },
              { value: 'missing', label: t.filters.renewalMissing },
            ]}
          />
          <FilterSelect
            label={t.filters.followUp}
            value={followUpFilter}
            onValueChange={setFollowUpFilter}
            options={[
              { value: 'all', label: t.filters.allFollowUps },
              { value: 'next7', label: t.filters.followUpNext7 },
              { value: 'overdue', label: t.filters.followUpOverdue },
            ]}
          />
          <FilterSelect label={t.filters.risk} value={riskFilter} onValueChange={setRiskFilter} options={riskOptions} />
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-[#2563EB]" />
              <h3 className="text-xl font-black text-slate-950">{t.sections.tableTitle}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t.sections.tableDescription}</p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="min-w-[220px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.client}</TableHead>
                  <TableHead className="min-w-[220px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.opportunity}</TableHead>
                  <TableHead className="min-w-[140px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.quote}</TableHead>
                  <TableHead className="min-w-[170px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.relationType}</TableHead>
                  <TableHead className="min-w-[170px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.postSaleType}</TableHead>
                  <TableHead className="min-w-[170px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.status}</TableHead>
                  <TableHead className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.owner}</TableHead>
                  <TableHead className="min-w-[130px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.lastPurchase}</TableHead>
                  <TableHead className="min-w-[140px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.nextFollowUp}</TableHead>
                  <TableHead className="min-w-[130px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.renewalDate}</TableHead>
                  <TableHead className="min-w-[140px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.lifetimeValue}</TableHead>
                  <TableHead className="min-w-[260px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.notes}</TableHead>
                  <TableHead className="min-w-[100px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.files}</TableHead>
                  <TableHead className="min-w-[150px] px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                      {t.table.empty}
                    </TableCell>
                  </TableRow>
                ) : filteredCases.map((postSaleCase) => {
                  const opportunity = opportunities.find((item) => item.id === postSaleCase.relatedOpportunityId);
                  const quote = quotes.find((item) => item.id === postSaleCase.lastQuoteId);

                  return (
                    <TableRow key={postSaleCase.id} className="align-top hover:bg-slate-50/70">
                      <TableCell className="px-5 py-4">
                        <p className="font-black text-slate-950">{postSaleCase.clientName}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{postSaleCase.contactPerson}</p>
                        <Badge className={cn('mt-2 rounded-full border px-2 py-1 text-xs font-bold', riskClasses[postSaleCase.riskLevel])}>
                          {t.riskLabels[postSaleCase.riskLevel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        {opportunity ? (
                          <Badge className="rounded-full border border-[#2563EB]/25 bg-[#2563EB]/10 px-2 py-1 text-xs font-bold text-[#1D4ED8]">
                            {opportunity.opportunityName}
                          </Badge>
                        ) : <span className="text-sm font-semibold text-slate-400">{t.common.unassigned}</span>}
                      </TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-700">{quote?.quoteNumber ?? t.common.notAvailable}</TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', relationClasses[postSaleCase.relationType])}>
                          {t.relationTypeLabels[postSaleCase.relationType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-700">{t.postSaleTypeLabels[postSaleCase.postSaleType]}</TableCell>
                      <TableCell className="px-5 py-4">
                        <Select value={postSaleCase.status} onValueChange={(value) => updatePostSaleCaseStatus(postSaleCase.id, value as PostSaleStatus)}>
                          <SelectTrigger className={cn('h-9 rounded-lg border px-3 text-sm font-black shadow-none', statusClasses[postSaleCase.status])}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {postSaleStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {t.statusLabels[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-700">{postSaleCase.owner}</TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-600">{postSaleCase.lastPurchaseDate ?? t.common.notAvailable}</TableCell>
                      <TableCell className="px-5 py-4 font-black text-slate-950">{postSaleCase.nextFollowUpDate}</TableCell>
                      <TableCell className="px-5 py-4 font-semibold text-slate-600">{postSaleCase.renewalDate ?? t.common.notAvailable}</TableCell>
                      <TableCell className="px-5 py-4 font-black text-slate-950">{formatCurrency(postSaleCase.lifetimeValue)}</TableCell>
                      <TableCell className="px-5 py-4">
                        <p className="max-w-[300px] text-sm leading-6 text-slate-600">{postSaleCase.notes}</p>
                        {postSaleCase.lostReason ? (
                          <Badge className="mt-2 rounded-full border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 px-2 py-1 text-xs font-bold text-[#b63b32]">
                            {t.lostReasonLabels[postSaleCase.lostReason]}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          onClick={() => setSelectedFilesCase(postSaleCase)}
                        >
                          <FileText className="h-4 w-4 text-[#2563EB]" />
                          {postSaleCase.files.length}
                        </button>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex gap-2">
                          <ActionButton label={t.actions.files} icon={<FileText className="h-4 w-4" />} className="border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8] hover:bg-[#2563EB]/15" onClick={() => setSelectedFilesCase(postSaleCase)} />
                          <ActionButton label={t.actions.futureOpportunity} icon={<Sparkles className="h-4 w-4" />} className="border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66] hover:bg-[#59C3A5]/20" onClick={() => openFutureOpportunityModal(postSaleCase)} />
                          <ActionButton label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-[#2563EB]" />
            <h3 className="text-xl font-black text-slate-950">{t.sections.followUpTitle}</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t.sections.followUpDescription}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <FollowUpLane title={t.followUp.upcomingContacts} description={t.followUp.upcomingContactsDescription} cases={upcomingContacts} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => postSaleCase.nextFollowUpDate} />
            <FollowUpLane title={t.followUp.renewalsSoon} description={t.followUp.renewalsSoonDescription} cases={renewalCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => postSaleCase.renewalDate ?? t.common.notAvailable} />
            <FollowUpLane title={t.followUp.dormantCustomers} description={t.followUp.dormantCustomersDescription} cases={dormantCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => t.riskLabels[postSaleCase.riskLevel]} />
            <FollowUpLane title={t.followUp.atRiskClients} description={t.followUp.atRiskClientsDescription} cases={riskCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => t.statusLabels[postSaleCase.status]} />
            <FollowUpLane title={t.followUp.reactivations} description={t.followUp.reactivationsDescription} cases={reactivationCases} emptyLabel={t.followUp.empty} renderMeta={(postSaleCase) => postSaleCase.lostReason ? t.lostReasonLabels[postSaleCase.lostReason] : t.common.none} />
          </div>
        </div>
      )}

      <Dialog open={isCaseModalOpen} onOpenChange={setIsCaseModalOpen}>
        <DialogContent className={cn(postSaleModalStyles.content, 'max-h-[90vh] max-w-5xl')} closeButtonClassName={postSaleModalStyles.close}>
          <DialogHeader className={postSaleModalStyles.header}>
            <DialogTitle className={postSaleModalStyles.title}>
              <ShieldCheck className={cn('h-5 w-5', postSaleModalStyles.icon)} />
              {t.forms.postSale.title}
            </DialogTitle>
            <DialogDescription className={postSaleModalStyles.description}>{t.forms.postSale.description}</DialogDescription>
          </DialogHeader>

          <div className={cn(postSaleModalStyles.body, 'grid gap-4 md:grid-cols-2')}>
            <FilterSelect label={t.forms.postSale.client} value={caseForm.clientId} onValueChange={(value) => setCaseForm((current) => ({ ...current, clientId: value }))} options={contacts.map((contact) => ({ value: contact.id, label: `${contact.company} · ${contact.contactPerson}` }))} />
            <FilterSelect label={t.forms.postSale.opportunity} value={caseForm.relatedOpportunityId} onValueChange={(value) => setCaseForm((current) => ({ ...current, relatedOpportunityId: value }))} options={[{ value: 'none', label: t.common.none }, ...opportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName }))]} />
            <FilterSelect label={t.forms.postSale.quote} value={caseForm.lastQuoteId} onValueChange={(value) => setCaseForm((current) => ({ ...current, lastQuoteId: value }))} options={[{ value: 'none', label: t.common.none }, ...quotes.map((quote) => ({ value: quote.id, label: `${quote.quoteNumber} · ${quote.clientName}` }))]} />
            <FilterSelect label={t.forms.postSale.relationType} value={caseForm.relationType} onValueChange={(value) => setCaseForm((current) => ({ ...current, relationType: value as CustomerRelationType }))} options={customerRelationTypes.map((relationType) => ({ value: relationType, label: t.relationTypeLabels[relationType] }))} />
            <FilterSelect label={t.forms.postSale.postSaleType} value={caseForm.postSaleType} onValueChange={(value) => setCaseForm((current) => ({ ...current, postSaleType: value as PostSaleType }))} options={postSaleTypes.map((postSaleType) => ({ value: postSaleType, label: t.postSaleTypeLabels[postSaleType] }))} />
            <FilterSelect label={t.forms.postSale.status} value={caseForm.status} onValueChange={(value) => setCaseForm((current) => ({ ...current, status: value as PostSaleStatus }))} options={postSaleStatuses.map((status) => ({ value: status, label: t.statusLabels[status] }))} />
            <FilterSelect label={t.forms.postSale.owner} value={caseForm.owner} onValueChange={(value) => setCaseForm((current) => ({ ...current, owner: value }))} options={salesOwners.map((owner) => ({ value: owner, label: owner }))} />
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.postSale.lifetimeValue}</label>
              <Input type="number" value={caseForm.lifetimeValue} onChange={(event) => setCaseForm((current) => ({ ...current, lifetimeValue: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.postSale.lastPurchaseDate}</label>
              <Input type="date" value={caseForm.lastPurchaseDate} onChange={(event) => setCaseForm((current) => ({ ...current, lastPurchaseDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.postSale.nextFollowUpDate}</label>
              <Input type="date" value={caseForm.nextFollowUpDate} onChange={(event) => setCaseForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.postSale.renewalDate}</label>
              <Input type="date" value={caseForm.renewalDate} onChange={(event) => setCaseForm((current) => ({ ...current, renewalDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.postSale.nextAction}</label>
              <Input value={caseForm.nextAction} onChange={(event) => setCaseForm((current) => ({ ...current, nextAction: event.target.value }))} placeholder={t.forms.postSale.nextActionPlaceholder} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.postSale.notes}</label>
              <Textarea value={caseForm.notes} onChange={(event) => setCaseForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.forms.postSale.notesPlaceholder} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.postSale.files}</label>
              <Input value={caseForm.files} onChange={(event) => setCaseForm((current) => ({ ...current, files: event.target.value }))} placeholder={t.forms.postSale.filesPlaceholder} />
            </div>
          </div>

          <DialogFooter className={postSaleModalStyles.footer}>
            <Button variant="outline" className={postSaleModalStyles.secondaryButton} onClick={() => setIsCaseModalOpen(false)}>{t.common.cancel}</Button>
            <Button className={postSaleModalStyles.primaryButton} onClick={handleCreateCase}>
              <Plus className="h-4 w-4" />
              {t.forms.postSale.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLostModalOpen} onOpenChange={setIsLostModalOpen}>
        <DialogContent className={cn(postSaleModalStyles.content, 'max-w-3xl')} closeButtonClassName={postSaleModalStyles.close}>
          <DialogHeader className={postSaleModalStyles.header}>
            <DialogTitle className={postSaleModalStyles.title}>
              <RefreshCw className={cn('h-5 w-5', postSaleModalStyles.icon)} />
              {t.forms.lost.title}
            </DialogTitle>
            <DialogDescription className={postSaleModalStyles.description}>{t.forms.lost.description}</DialogDescription>
          </DialogHeader>
          <div className={cn(postSaleModalStyles.body, 'grid gap-4 md:grid-cols-2')}>
            <FilterSelect label={t.forms.lost.client} value={lostForm.clientId} onValueChange={(value) => setLostForm((current) => ({ ...current, clientId: value }))} options={contacts.map((contact) => ({ value: contact.id, label: `${contact.company} · ${contact.contactPerson}` }))} />
            <FilterSelect label={t.forms.lost.opportunity} value={lostForm.relatedOpportunityId} onValueChange={(value) => setLostForm((current) => ({ ...current, relatedOpportunityId: value }))} options={[{ value: 'none', label: t.common.none }, ...opportunities.map((opportunity) => ({ value: opportunity.id, label: opportunity.opportunityName }))]} />
            <FilterSelect label={t.forms.lost.reason} value={lostForm.lostReason} onValueChange={(value) => setLostForm((current) => ({ ...current, lostReason: value as LostReason }))} options={lostReasons.map((reason) => ({ value: reason, label: t.lostReasonLabels[reason] }))} />
            <FilterSelect label={t.forms.lost.owner} value={lostForm.owner} onValueChange={(value) => setLostForm((current) => ({ ...current, owner: value }))} options={salesOwners.map((owner) => ({ value: owner, label: owner }))} />
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.lost.nextFollowUpDate}</label>
              <Input type="date" value={lostForm.nextFollowUpDate} onChange={(event) => setLostForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.lost.notes}</label>
              <Textarea value={lostForm.notes} onChange={(event) => setLostForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.forms.lost.notesPlaceholder} />
            </div>
          </div>
          <DialogFooter className={postSaleModalStyles.footer}>
            <Button variant="outline" className={postSaleModalStyles.secondaryButton} onClick={() => setIsLostModalOpen(false)}>{t.common.cancel}</Button>
            <Button className={postSaleModalStyles.primaryButton} onClick={handleCreateLostFollowUp}>
              <RefreshCw className="h-4 w-4" />
              {t.forms.lost.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedFilesCase)} onOpenChange={(open) => !open && setSelectedFilesCase(null)}>
        <DialogContent className={cn(postSaleModalStyles.content, 'max-w-xl')} closeButtonClassName={postSaleModalStyles.close}>
          <DialogHeader className={postSaleModalStyles.header}>
            <DialogTitle className={postSaleModalStyles.smallTitle}>
              <FileText className={cn('h-5 w-5', postSaleModalStyles.icon)} />
              {t.filesModal.title}
            </DialogTitle>
            <DialogDescription className={postSaleModalStyles.description}>{t.filesModal.description}</DialogDescription>
          </DialogHeader>
          <div className={cn(postSaleModalStyles.body, 'space-y-3')}>
            <p className="text-sm font-bold text-slate-500">{selectedFilesCase?.clientName}</p>
            {selectedFilesCase?.files.length ? selectedFilesCase.files.map((file) => (
              <div key={file} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <FileText className="h-4 w-4 text-[#B63B32]" />
                <span className="text-sm font-semibold text-slate-700">{file}</span>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                {t.filesModal.empty}
              </div>
            )}
          </div>
          <DialogFooter className={postSaleModalStyles.footer}>
            <Button className={postSaleModalStyles.primaryButton} onClick={() => setSelectedFilesCase(null)}>{t.common.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(futureOpportunityCase)} onOpenChange={(open) => !open && setFutureOpportunityCase(null)}>
        <DialogContent className={cn(futureOpportunityModalStyles.content, 'max-w-2xl')} closeButtonClassName={futureOpportunityModalStyles.close}>
          <DialogHeader className={futureOpportunityModalStyles.header}>
            <DialogTitle className={futureOpportunityModalStyles.title}>
              <Link2 className={cn('h-5 w-5', futureOpportunityModalStyles.icon)} />
              {t.forms.opportunity.title}
            </DialogTitle>
            <DialogDescription className={futureOpportunityModalStyles.description}>{t.forms.opportunity.description}</DialogDescription>
          </DialogHeader>
          <div className={cn(futureOpportunityModalStyles.body, 'space-y-4')}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.opportunityName}</label>
              <Input value={futureForm.opportunityName} onChange={(event) => setFutureForm((current) => ({ ...current, opportunityName: event.target.value }))} placeholder={t.forms.opportunity.opportunityNamePlaceholder} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.expectedCloseDate}</label>
                <Input type="date" value={futureForm.expectedCloseDate} onChange={(event) => setFutureForm((current) => ({ ...current, expectedCloseDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.nextActionDate}</label>
                <Input type="date" value={futureForm.nextActionDate} onChange={(event) => setFutureForm((current) => ({ ...current, nextActionDate: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.forms.opportunity.notes}</label>
              <Textarea value={futureForm.notes} onChange={(event) => setFutureForm((current) => ({ ...current, notes: event.target.value }))} placeholder={t.forms.opportunity.notesPlaceholder} />
            </div>
          </div>
          <DialogFooter className={futureOpportunityModalStyles.footer}>
            <Button variant="outline" className={futureOpportunityModalStyles.secondaryButton} onClick={() => setFutureOpportunityCase(null)}>{t.common.cancel}</Button>
            <Button className={futureOpportunityModalStyles.primaryButton} onClick={handleCreateFutureOpportunity}>
              <Sparkles className="h-4 w-4" />
              {t.forms.opportunity.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
