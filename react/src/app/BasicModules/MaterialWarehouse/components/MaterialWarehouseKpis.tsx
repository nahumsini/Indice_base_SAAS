import { AlertTriangle, BadgeCheck, Boxes, FileWarning } from 'lucide-react';
import { materialRecords } from '../data';

export function MaterialWarehouseKpis() {
  const lowStock = materialRecords.filter((item) => item.onHand - item.reserved <= item.minimum).length;
  const expiring = materialRecords.filter((item) => item.certificateStatus === 'EXPIRING').length;
  const missing = materialRecords.filter((item) => item.certificateStatus === 'MISSING').length;
  const cards = [
    { label: 'Materials tracked', value: materialRecords.length, icon: Boxes },
    { label: 'Low stock materials', value: lowStock, icon: AlertTriangle },
    { label: 'Certificates expiring', value: expiring, icon: FileWarning },
    { label: 'Certificate coverage', value: `${Math.round(((materialRecords.length - missing) / materialRecords.length) * 100)}%`, icon: BadgeCheck },
  ];
  return <section className="space-y-5"><div className="rounded-xl border border-[#FF6B5E]/30 bg-[#FFF0EE] px-5 py-4 dark:bg-[#3a2220]"><h2 className="text-xl font-medium text-slate-900 dark:text-white">Material warehouse KPIs</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Decision support in the preferred currency; transaction records preserve their native currency.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Preferred-currency conversion is reserved for consolidated analytics. Exchange-rate date and native-currency breakdown will be supplied by the backend integration.</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, value }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><Icon className="h-5 w-5 text-[#FF6B5E]" /><p className="mt-5 text-2xl font-medium text-slate-900 dark:text-white">{value}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{label}</p></article>)}</div></section>;
}
