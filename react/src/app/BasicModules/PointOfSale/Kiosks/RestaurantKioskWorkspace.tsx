import {
  ChefHat,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

export type RestaurantKioskType = 'waiter' | 'tables' | 'kitchen';

export function RestaurantKioskWorkspace({ type }: { type: RestaurantKioskType }) {
  const { copy } = usePointOfSaleKioskTranslations();
  const sampleOrders = [
    { table: copy.restaurant.sampleTable('04'), detail: copy.restaurant.sampleProducts(3), time: '04:18', status: copy.restaurant.preparing },
    { table: copy.restaurant.sampleTable('11'), detail: copy.restaurant.sampleProducts(5), time: '08:42', status: copy.restaurant.ready },
    { table: copy.restaurant.sampleBar('02'), detail: copy.restaurant.sampleProducts(2), time: '02:05', status: copy.restaurant.received },
  ];
  const configuration = {
    waiter: {
      icon: UtensilsCrossed,
      title: copy.restaurant.waiterTitle,
      description: copy.restaurant.waiterDescription,
      next: copy.restaurant.waiterNext,
    },
    tables: {
      icon: LayoutGrid,
      title: copy.restaurant.tablesTitle,
      description: copy.restaurant.tablesDescription,
      next: copy.restaurant.tablesNext,
    },
    kitchen: {
      icon: ChefHat,
      title: copy.restaurant.kitchenTitle,
      description: copy.restaurant.kitchenDescription,
      next: copy.restaurant.kitchenNext,
    },
  }[type];
  const Icon = configuration.icon;

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-6 dark:border-[#FF6B5E]/40 dark:bg-[#FF6B5E]/15">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FF6B5E] text-[#222831]"><Icon className="h-6 w-6" /></span>
          <div>
            <p className="text-xs font-medium text-[#B63B32]">{copy.restaurant.eyebrow}</p>
            <h2 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{configuration.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{configuration.description}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div><p className="text-xs font-medium text-[#B63B32]">{copy.restaurant.presentation}</p><h3 className="mt-1 text-lg font-medium">{configuration.title}</h3></div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"><RefreshCw className="h-3.5 w-3.5" />{copy.restaurant.synchronized}</span>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-3">
            {sampleOrders.map((order, index) => (
              <article key={order.table} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#B63B32] dark:bg-slate-950">{index === 1 ? <CheckCircle2 className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}</span><span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{order.time}</span></div>
                <h4 className="mt-4 text-base font-medium">{order.table}</h4>
                <p className="mt-1 text-xs text-slate-500">{order.detail}</p>
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 dark:bg-slate-950 dark:text-slate-200">{order.status}</p>
              </article>
            ))}
          </div>
          <p className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800">{copy.restaurant.presentationHelp}</p>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-[#222831] p-5 text-white dark:border-slate-700">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF6B5E] text-[#222831]"><ShoppingBag className="h-5 w-5" /></span><h3 className="text-lg font-medium">{copy.restaurant.synchronized}</h3></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{copy.restaurant.sharedDescription}</p>
          <ul className="mt-5 space-y-3 text-sm">
            {[copy.restaurant.syncOrder, copy.restaurant.syncInventory, copy.restaurant.syncStatus].map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B5E]" /><span className="text-slate-200">{item}</span></li>)}
          </ul>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-medium text-[#FF8A80]">{copy.restaurant.upcoming}</p><p className="mt-2 text-sm leading-6 text-slate-200">{configuration.next}</p></div>
        </aside>
      </div>
    </section>
  );
}
