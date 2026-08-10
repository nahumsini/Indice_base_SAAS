import { useMemo, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { IndiceModuleShell } from '../../components/frontend-os';
import { useRoutedModuleTab } from '../../hooks/useRoutedModuleTab';
import { productionRows } from './data';

const tabIds = ['prototypes', 'recipes', 'batch-planning', 'material-requests', 'material-receipts', 'transformation', 'quality-closure', 'kpis'] as const;
type ProductionTabId = (typeof tabIds)[number];
const tabs = [
  { id: 'prototypes', label: 'Prototypes', icon: '🧪' }, { id: 'recipes', label: 'Recipes', icon: '📐' }, { id: 'batch-planning', label: 'Batch planning', icon: '🗓️' }, { id: 'material-requests', label: 'Material requests', icon: '📋' }, { id: 'material-receipts', label: 'Material receipts', icon: '📥' }, { id: 'transformation', label: 'Transformation', icon: '⚙️' }, { id: 'quality-closure', label: 'Quality and closure', icon: '✅' }, { id: 'kpis', label: 'KPIs', icon: '📈' },
] as const;
const copy: Record<ProductionTabId, { title: string; description: string; action: string }> = {
  prototypes: { title: 'Prototypes', description: 'Create, test, document, and approve product samples before releasing a recipe.', action: 'Create prototype' },
  recipes: { title: 'Recipes', description: 'Maintain approved material quantities, instructions, and recipe versions.', action: 'Create recipe' },
  'batch-planning': { title: 'Batch planning', description: 'Plan production lots, quantities, dates, and responsible teams.', action: 'Plan batch' },
  'material-requests': { title: 'Material requests', description: 'Request raw materials from the Material warehouse for a planned lot.', action: 'Create request' },
  'material-receipts': { title: 'Material receipts', description: 'Confirm the physical materials received from the warehouse fulfillment.', action: 'Confirm receipt' },
  transformation: { title: 'Transformation', description: 'Record execution progress, actual consumption, time, and material waste.', action: 'Start transformation' },
  'quality-closure': { title: 'Quality and closure', description: 'Approve, reject, or close a lot before sending finished goods to Inventory.', action: 'Review lot' },
  kpis: { title: 'Production KPIs', description: 'Monitor planned output, active lots, waste, quality, and production readiness.', action: 'View details' },
};

export default function ProductionModule({ onNavigate: _onNavigate }: { onNavigate?: (page?: string) => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const { activeTab, setActiveTab } = useRoutedModuleTab<ProductionTabId>('prototypes', tabIds, {});
  const tabCopy = useMemo(() => copy[activeTab], [activeTab]);
  return <IndiceModuleShell activeTab={activeTab} contentRef={contentRef} currentModule="production" onTabChange={setActiveTab} subtitle="Plan, transform, verify, and close production lots with material traceability." tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label, icon: tab.icon }))} title="Production" tone="coral"><div ref={contentRef} className="space-y-5"><section className="rounded-xl border border-[#FF6B5E]/30 bg-[#FFF0EE] px-5 py-4 dark:bg-[#3a2220]"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-medium text-slate-900 dark:text-white">{tabCopy.title}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{tabCopy.description}</p></div><Button className="bg-[#FF6B5E] font-medium hover:bg-[#e95a4e]">{tabCopy.action}</Button></div></section><section className="grid gap-4 md:grid-cols-4"><Metric label="Planned lots" value="3" /><Metric label="Awaiting materials" value="1" /><Metric label="In transformation" value="1" /><Metric label="Quality review" value="1" /></section><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-5 py-4 font-medium">Lot</th><th className="px-5 py-4 font-medium">Product</th><th className="px-5 py-4 font-medium">Recipe</th><th className="px-5 py-4 font-medium">Planned quantity</th><th className="px-5 py-4 font-medium">Materials received</th><th className="px-5 py-4 font-medium">Waste</th><th className="px-5 py-4 font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{productionRows.map((row) => <tr key={row.id} className="text-slate-700 dark:text-slate-200"><td className="px-5 py-4 font-medium">{row.batch}</td><td className="px-5 py-4">{row.prototype}</td><td className="px-5 py-4">{row.recipe}</td><td className="px-5 py-4">{row.quantity}</td><td className="px-5 py-4">{row.received}</td><td className="px-5 py-4">{row.waste}</td><td className="px-5 py-4">{row.status}</td></tr>)}</tbody></table></div></section></div></IndiceModuleShell>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="text-2xl font-medium text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{label}</p></article>; }
