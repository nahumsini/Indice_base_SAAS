import { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Edit2, Layers, Percent, Plus, Search, ShieldCheck, Tag } from 'lucide-react';
import {
  PointOfSaleTitleBar,
  pointOfSaleTitleBarPrimaryActionClassName,
  pointOfSaleTitleBarSecondaryActionClassName,
} from '../shared/components/PointOfSaleTitleBar';

type PriceStatus = 'active' | 'scheduled' | 'paused';

interface PriceRule {
  id: string;
  listName: string;
  scope: string;
  margin: number;
  discountCap: number;
  status: PriceStatus;
  updatedAt: string;
}

const priceRules: PriceRule[] = [
  {
    id: 'price-retail',
    listName: 'Mostrador general',
    scope: 'Productos activos POS',
    margin: 32,
    discountCap: 10,
    status: 'active',
    updatedAt: '2026-07-12',
  },
  {
    id: 'price-wholesale',
    listName: 'Mayoreo operativo',
    scope: 'Clientes con volumen',
    margin: 18,
    discountCap: 6,
    status: 'active',
    updatedAt: '2026-07-10',
  },
  {
    id: 'price-seasonal',
    listName: 'Temporada',
    scope: 'Categorias seleccionadas',
    margin: 24,
    discountCap: 14,
    status: 'scheduled',
    updatedAt: '2026-07-08',
  },
];

const statusLabels: Record<PriceStatus, string> = {
  active: 'Activa',
  scheduled: 'Programada',
  paused: 'Pausada',
};

const statusClasses: Record<PriceStatus, string> = {
  active: 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#14745F] dark:text-[#9DE7D3]',
  scheduled: 'border-[#F4C84A]/40 bg-[#F4C84A]/15 text-[#8A6500] dark:text-[#F4C84A]',
  paused: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function Precios() {
  const [search, setSearch] = useState('');
  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return priceRules;
    }

    return priceRules.filter((rule) => `${rule.listName} ${rule.scope} ${statusLabels[rule.status]}`.toLowerCase().includes(query));
  }, [search]);

  const activeRules = filteredRules.filter((rule) => rule.status === 'active').length;
  const averageMargin = filteredRules.length === 0
    ? 0
    : filteredRules.reduce((sum, rule) => sum + rule.margin, 0) / filteredRules.length;
  const maxDiscountCap = filteredRules.reduce((max, rule) => Math.max(max, rule.discountCap), 0);

  return (
    <div className="space-y-6">
      <PointOfSaleTitleBar
        eyebrow="Precios POS"
        icon="💲"
        rhIndent
        title="Precios"
        subtitle="Listas, margenes y topes comerciales para venta retail."
        actions={(
          <>
            <button className={pointOfSaleTitleBarSecondaryActionClassName} type="button">
              <Calculator className="h-4 w-4" />
              Recalcular
            </button>
            <button className={pointOfSaleTitleBarPrimaryActionClassName} type="button">
              <Plus className="h-4 w-4" />
              Nueva lista
            </button>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi icon={Layers} label="Listas visibles" value={String(filteredRules.length)} />
        <Kpi icon={Percent} label="Margen promedio" value={`${averageMargin.toFixed(1)}%`} tone="coral" />
        <Kpi icon={ShieldCheck} label="Tope descuento" value={`${maxDiscountCap}%`} tone="aqua" />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar lista, alcance o estado"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
          />
        </label>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-gray-900/40">
              <tr>
                {['Lista', 'Alcance', 'Margen', 'Descuento max.', 'Estado', 'Actualizacion', 'Acciones'].map((header) => (
                  <th key={header} className={`px-5 py-4 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 ${header === 'Acciones' ? 'text-right' : 'text-left'}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="transition hover:bg-slate-50/80 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-4 font-bold text-slate-950 dark:text-white">{rule.listName}</td>
                  <td className="px-5 py-4 font-semibold text-slate-600 dark:text-slate-300">{rule.scope}</td>
                  <td className="px-5 py-4 font-black text-[#C64237] dark:text-[#FFB5AE]">{rule.margin}%</td>
                  <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">{rule.discountCap}%</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[rule.status]}`}>
                      {statusLabels[rule.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(rule.updatedAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-sm dark:border-slate-700 dark:bg-gray-900">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#C64237] transition hover:bg-[#FF6B5E]/10 dark:text-[#FFB5AE]"
                        aria-label={`Editar ${rule.listName}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#14745F] transition hover:bg-[#59C3A5]/10 dark:text-[#9DE7D3]"
                        aria-label={`Activar ${rule.listName}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRules.length === 0 && (
            <div className="px-6 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Sin listas con esos filtros.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  tone = 'default',
  value,
}: {
  icon: typeof Tag;
  label: string;
  tone?: 'default' | 'coral' | 'aqua';
  value: string;
}) {
  const iconClassName = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    coral: 'bg-[#FF6B5E]/10 text-[#C64237] dark:text-[#FFB5AE]',
    aqua: 'bg-[#59C3A5]/10 text-[#14745F] dark:text-[#9DE7D3]',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-lg font-bold text-slate-950 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
