import { AlertTriangle, Clock, PackageSearch, RefreshCw } from 'lucide-react';
import type { InventoryMovement, InventoryStockItem } from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

export function InventoryHealthPanel({
  items,
  movements,
  t,
}: {
  items: InventoryStockItem[];
  movements: InventoryMovement[];
  t: InventoryTranslations;
}) {
  const lowStock = items.filter((item) => item.status === 'lowStock').length;
  const outOfStock = items.filter((item) => item.status === 'outOfStock').length;
  const packages = items.filter((item) => item.isPackage).length;
  const pendingSync = movements.filter((movement) => movement.status === 'pendingSync').length;
  const staleLocations = Math.max(items.filter((item) => item.usesInventory && !item.lastMovementAt).length, 0);
  const alerts = [
    { icon: AlertTriangle, label: t.health.lowStock(lowStock), tone: 'text-[#9a6b05] bg-[#F4C84A]/10 border-[#F4C84A]/35' },
    { icon: PackageSearch, label: t.health.outOfStock(outOfStock), tone: 'text-[#B63B32] bg-[#FF6B5E]/10 border-[#FF6B5E]/30' },
    { icon: Clock, label: t.health.staleLocations(staleLocations), tone: 'text-slate-600 bg-slate-50 border-slate-200' },
    { icon: PackageSearch, label: t.health.packageDependencies(packages), tone: 'text-[#2563EB] bg-[#2563EB]/10 border-[#2563EB]/25' },
    { icon: RefreshCw, label: t.health.pendingSync(pendingSync), tone: 'text-[#177d66] bg-[#59C3A5]/10 border-[#59C3A5]/25' },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-medium text-slate-950">{t.health.title}</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <article key={alert.label} className={`rounded-lg border px-4 py-3 ${alert.tone}`}>
              <Icon className="mb-3 h-4 w-4" />
              <p className="text-sm font-medium leading-5">{alert.label}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
