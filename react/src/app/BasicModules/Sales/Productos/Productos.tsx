import { useMemo, useState, type ReactNode } from 'react';
import {
  Archive,
  Box,
  CircleDollarSign,
  Copy,
  Eye,
  Layers3,
  PackageCheck,
  PencilLine,
  Plus,
  Search,
  ShoppingCart,
  Tags,
  Warehouse,
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
  productCategories,
  productStatuses,
  productTaxCategories,
  productTypes,
  productVisibilities,
  type SalesCatalogItem,
  type SalesProductCategory,
  type SalesProductStatus,
  type SalesProductTaxCategory,
  type SalesProductType,
  type SalesProductVisibility,
  useSalesCrm,
} from '../salesCrmContext';
import { getSalesModalStyles } from '../salesModalStyles';
import { useProductsTranslations } from './translations';

type FilterValue = 'all' | string;
const productModalStyles = getSalesModalStyles('coral');
const productFieldClassName = 'border-slate-200 bg-white shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20';

type ProductFormState = {
  name: string;
  sku: string;
  category: SalesProductCategory;
  type: SalesProductType;
  price: string;
  cost: string;
  taxCategory: SalesProductTaxCategory;
  status: SalesProductStatus;
  visibility: SalesProductVisibility;
  description: string;
};

const initialProductForm: ProductFormState = {
  name: '',
  sku: '',
  category: 'Software',
  type: 'Service',
  price: '',
  cost: '',
  taxCategory: 'Standard VAT',
  status: 'Active',
  visibility: 'Commercial',
  description: '',
};

const statusClasses: Record<SalesProductStatus, string> = {
  Active: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  Draft: 'border-slate-200 bg-slate-50 text-slate-600',
  Review: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
  Archived: 'border-slate-300 bg-slate-100 text-slate-500',
};

const visibilityClasses: Record<SalesProductVisibility, string> = {
  Internal: 'border-slate-200 bg-white text-slate-600',
  Commercial: 'border-[#2563EB]/25 bg-[#2563EB]/10 text-[#1D4ED8]',
  'POS ready': 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  'Quote only': 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
};

const toneClasses: Record<SalesCatalogItem['thumbnailTone'], string> = {
  blue: 'bg-[#FF6B5E]/10 text-[#B63B32] ring-[#FF6B5E]/25',
  aqua: 'bg-slate-50 text-slate-700 ring-slate-200',
  yellow: 'bg-[#F4C84A]/15 text-[#9a6b05] ring-[#F4C84A]/35',
  coral: 'bg-[#FF6B5E]/10 text-[#B63B32] ring-[#FF6B5E]/25',
  graphite: 'bg-[#222831]/5 text-[#222831] ring-[#222831]/15',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function getMargin(product: SalesCatalogItem) {
  if (product.price <= 0) {
    return 0;
  }

  return Math.round(((product.price - product.cost) / product.price) * 100);
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
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
          {icon}
        </span>
        <div>
          <p className="text-xl font-black leading-none text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CatalogAction({
  label,
  icon,
  className,
}: {
  label: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B5E]/20',
        className,
      )}
    >
      {icon}
    </button>
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
        <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-none focus:ring-[#FF6B5E]/20">
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

export default function Productos() {
  const t = useProductsTranslations();
  const { products, addProduct } = useSalesCrm();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FilterValue>('all');
  const [typeFilter, setTypeFilter] = useState<FilterValue>('all');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<FilterValue>('all');
  const [form, setForm] = useState<ProductFormState>(initialProductForm);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || [
      product.name,
      product.sku,
      product.category,
      product.type,
      product.description,
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesVisibility = visibilityFilter === 'all' || product.visibility === visibilityFilter;

    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesVisibility;
  }), [categoryFilter, products, search, statusFilter, typeFilter, visibilityFilter]);

  const activeCount = products.filter((product) => product.status === 'Active').length;
  const averageMargin = Math.round(products.reduce((total, product) => total + getMargin(product), 0) / Math.max(products.length, 1));
  const posReadyCount = products.filter((product) => product.posPrepared || product.visibility === 'POS ready').length;
  const inventoryPreparedCount = products.filter((product) => product.stockPrepared || product.warehousePrepared).length;

  const categoryOptions = [
    { value: 'all', label: t.filters.allCategories },
    ...productCategories.map((category) => ({ value: category, label: t.categoryLabels[category] })),
  ];
  const typeOptions = [
    { value: 'all', label: t.filters.allTypes },
    ...productTypes.map((type) => ({ value: type, label: t.typeLabels[type] })),
  ];
  const statusOptions = [
    { value: 'all', label: t.filters.allStatuses },
    ...productStatuses.map((status) => ({ value: status, label: t.statusLabels[status] })),
  ];
  const visibilityOptions = [
    { value: 'all', label: t.filters.allVisibilities },
    ...productVisibilities.map((visibility) => ({ value: visibility, label: t.visibilityLabels[visibility] })),
  ];

  const handleCreateProduct = () => {
    if (!form.name.trim() || !form.sku.trim()) {
      return;
    }

    addProduct({
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      type: form.type,
      description: form.description.trim(),
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      taxCategory: form.taxCategory,
      status: form.status,
      visibility: form.visibility,
      thumbnailTone: 'blue',
      stockPrepared: form.type === 'Product' || form.type === 'Operational item',
      warehousePrepared: form.type === 'Product' || form.type === 'Operational item',
      posPrepared: form.visibility === 'POS ready',
      variantsPrepared: form.type === 'Subscription' || form.type === 'Package',
    });
    setForm(initialProductForm);
    setIsCreateOpen(false);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <span className="text-2xl leading-none" aria-hidden="true">{t.header.emoji}</span>
              {t.header.title}
            </h2>
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">{t.header.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="h-10 gap-2 rounded-lg border-[#FF6B5E]/25 bg-white px-4 text-sm font-semibold text-[#B63B32] shadow-none hover:bg-[#FF6B5E]/10">
              <CircleDollarSign className="h-4 w-4" />
              {t.header.secondaryAction}
            </Button>
            <Button className="h-10 gap-2 rounded-lg bg-[#FF6B5E] px-4 text-sm font-semibold text-white shadow-sm shadow-[#FF6B5E]/20 hover:bg-[#E85C50]" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              {t.header.primaryAction}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<PackageCheck className="h-5 w-5" />} value={activeCount} label={t.metrics.activeItems} className="text-[#FF6B5E]" />
        <MetricCard icon={<CircleDollarSign className="h-5 w-5" />} value={`${averageMargin}%`} label={t.metrics.averageMargin} className="text-[#9a6b05]" />
        <MetricCard icon={<ShoppingCart className="h-5 w-5" />} value={posReadyCount} label={t.metrics.posReady} className="text-[#2563EB]" />
        <MetricCard icon={<Warehouse className="h-5 w-5" />} value={inventoryPreparedCount} label={t.metrics.inventoryPrepared} className="text-[#b63b32]" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-950">{t.filters.title}</h3>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.filters.search}</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.filters.searchPlaceholder}
                className="h-11 rounded-lg border-slate-200 bg-white pl-11 text-base font-semibold text-slate-950 shadow-none placeholder:text-slate-400 focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"
              />
            </div>
          </div>
          <FilterSelect label={t.filters.category} value={categoryFilter} onValueChange={setCategoryFilter} options={categoryOptions} />
          <FilterSelect label={t.filters.type} value={typeFilter} onValueChange={setTypeFilter} options={typeOptions} />
          <FilterSelect label={t.filters.status} value={statusFilter} onValueChange={setStatusFilter} options={statusOptions} />
          <FilterSelect label={t.filters.visibility} value={visibilityFilter} onValueChange={setVisibilityFilter} options={visibilityOptions} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {filteredProducts.slice(0, 3).map((product) => (
          <article key={product.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#FF6B5E]/35 hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ring-1', toneClasses[product.thumbnailTone])}>
                <Box className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', visibilityClasses[product.visibility])}>
                    {t.visibilityLabels[product.visibility]}
                  </Badge>
                  <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', statusClasses[product.status])}>
                    {t.statusLabels[product.status]}
                  </Badge>
                </div>
                <h3 className="mt-3 truncate text-lg font-black text-slate-950">{product.name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{product.sku}</p>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">{t.labels.price}</p>
                <p className="mt-1 font-black text-slate-950">{formatCurrency(product.price)}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">{t.labels.margin}</p>
                <p className="mt-1 font-black text-[#B63B32]">{getMargin(product)}%</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-semibold text-slate-500">{t.labels.type}</p>
                <p className="mt-1 truncate font-black text-slate-950">{t.typeLabels[product.type]}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-xl font-black text-slate-950">{t.sections.tableTitle}</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t.sections.tableDescription}</p>
            </div>
            <Badge className="w-fit rounded-full border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-3 py-1 text-sm font-bold text-[#B63B32]">
              {products.length} {t.metrics.quoteReady}
            </Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1580px]">
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="min-w-[260px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.item}</TableHead>
                <TableHead className="min-w-[150px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.sku}</TableHead>
                <TableHead className="min-w-[140px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.category}</TableHead>
                <TableHead className="min-w-[150px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.type}</TableHead>
                <TableHead className="min-w-[120px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.price}</TableHead>
                <TableHead className="min-w-[120px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.cost}</TableHead>
                <TableHead className="min-w-[110px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.margin}</TableHead>
                <TableHead className="min-w-[150px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.tax}</TableHead>
                <TableHead className="min-w-[130px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.status}</TableHead>
                <TableHead className="min-w-[140px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.visibility}</TableHead>
                <TableHead className="min-w-[130px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.updated}</TableHead>
                <TableHead className="min-w-[130px] px-5 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{t.table.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                    {t.table.empty}
                  </TableCell>
                </TableRow>
              ) : filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-slate-200 align-top hover:bg-slate-50/80">
                  <TableCell className="px-5 py-5">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', toneClasses[product.thumbnailTone])}>
                        <Box className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-950">{product.name}</p>
                        <p className="mt-1 max-w-[320px] text-sm leading-5 text-slate-500">{product.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {product.stockPrepared ? <Badge variant="outline" className="rounded-full text-xs">{t.labels.stockReady}</Badge> : null}
                          {product.warehousePrepared ? <Badge variant="outline" className="rounded-full text-xs">{t.labels.warehouseReady}</Badge> : null}
                          {product.posPrepared ? <Badge variant="outline" className="rounded-full text-xs">{t.labels.posReady}</Badge> : null}
                          {product.variantsPrepared ? <Badge variant="outline" className="rounded-full text-xs">{t.labels.variantsReady}</Badge> : null}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-5 py-5 font-semibold text-slate-700">{product.sku}</TableCell>
                  <TableCell className="px-5 py-5 font-semibold text-slate-700">{t.categoryLabels[product.category]}</TableCell>
                  <TableCell className="px-5 py-5 font-semibold text-slate-700">{t.typeLabels[product.type]}</TableCell>
                  <TableCell className="px-5 py-5 font-black text-slate-950">{formatCurrency(product.price)}</TableCell>
                  <TableCell className="px-5 py-5 font-semibold text-slate-600">{formatCurrency(product.cost)}</TableCell>
                  <TableCell className="px-5 py-5 font-black text-[#B63B32]">{getMargin(product)}%</TableCell>
                  <TableCell className="px-5 py-5 font-semibold text-slate-700">{t.taxLabels[product.taxCategory]}</TableCell>
                  <TableCell className="px-5 py-5">
                    <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', statusClasses[product.status])}>
                      {t.statusLabels[product.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-5">
                    <Badge className={cn('rounded-full border px-2 py-1 text-xs font-bold', visibilityClasses[product.visibility])}>
                      {t.visibilityLabels[product.visibility]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-5 font-semibold text-slate-600">{product.lastUpdated}</TableCell>
                  <TableCell className="px-5 py-5">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                      <CatalogAction label={t.actions.view} icon={<Eye className="h-4 w-4" />} className="border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32] hover:bg-[#FF6B5E]/15" />
                      <CatalogAction label={t.actions.edit} icon={<PencilLine className="h-4 w-4" />} className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50" />
                      <CatalogAction label={t.actions.duplicate} icon={<Copy className="h-4 w-4" />} className="border-[#F4C84A]/40 bg-[#F4C84A]/10 text-[#9a6b05] hover:bg-[#F4C84A]/20" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className={cn(productModalStyles.content, 'max-h-[90vh] max-w-4xl')} closeButtonClassName={productModalStyles.close}>
          <DialogHeader className={productModalStyles.header}>
            <DialogTitle className={productModalStyles.title}>
              <Tags className={cn('h-5 w-5', productModalStyles.icon)} />
              {t.form.title}
            </DialogTitle>
            <DialogDescription className={productModalStyles.description}>{t.form.description}</DialogDescription>
          </DialogHeader>

          <div className={cn(productModalStyles.body, 'grid gap-4 md:grid-cols-2')}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.form.fields.name}</label>
              <Input className={productFieldClassName} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={t.form.placeholders.name} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.form.fields.sku}</label>
              <Input className={productFieldClassName} value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} placeholder={t.form.placeholders.sku} />
            </div>
            <FilterSelect label={t.form.fields.category} value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value as SalesProductCategory }))} options={productCategories.map((category) => ({ value: category, label: t.categoryLabels[category] }))} />
            <FilterSelect label={t.form.fields.type} value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as SalesProductType }))} options={productTypes.map((type) => ({ value: type, label: t.typeLabels[type] }))} />
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.form.fields.price}</label>
              <Input className={productFieldClassName} type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">{t.form.fields.cost}</label>
              <Input className={productFieldClassName} type="number" value={form.cost} onChange={(event) => setForm((current) => ({ ...current, cost: event.target.value }))} />
            </div>
            <FilterSelect label={t.form.fields.taxCategory} value={form.taxCategory} onValueChange={(value) => setForm((current) => ({ ...current, taxCategory: value as SalesProductTaxCategory }))} options={productTaxCategories.map((tax) => ({ value: tax, label: t.taxLabels[tax] }))} />
            <FilterSelect label={t.form.fields.status} value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as SalesProductStatus }))} options={productStatuses.map((status) => ({ value: status, label: t.statusLabels[status] }))} />
            <FilterSelect label={t.form.fields.visibility} value={form.visibility} onValueChange={(value) => setForm((current) => ({ ...current, visibility: value as SalesProductVisibility }))} options={productVisibilities.map((visibility) => ({ value: visibility, label: t.visibilityLabels[visibility] }))} />
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">{t.form.fields.description}</label>
              <Textarea className={productFieldClassName} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder={t.form.placeholders.description} />
            </div>
          </div>

          <DialogFooter className={productModalStyles.footer}>
            <Button variant="outline" className={productModalStyles.secondaryButton} onClick={() => setIsCreateOpen(false)}>
              <Archive className="h-4 w-4" />
              {t.common.cancel}
            </Button>
            <Button className={productModalStyles.primaryButton} onClick={handleCreateProduct}>
              <Plus className="h-4 w-4" />
              {t.form.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
