import { useState } from 'react';
import { ChefHat, CreditCard, LayoutGrid, Monitor, ShoppingBasket, UtensilsCrossed } from 'lucide-react';
import { CustomerDisplayManager } from './CustomerDisplayManager';
import { SelfCheckoutWorkspace } from './SelfCheckoutWorkspace';
import { SelfServiceKioskManager } from './SelfServiceKioskManager';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

type KioskSection = 'self-service' | 'customer-display' | 'self-checkout';

export default function KiosksWorkspace() {
  const [section, setSection] = useState<KioskSection>('customer-display');
  const { copy } = usePointOfSaleKioskTranslations();

  const upcomingScreens = [
    { label: copy.workspace.waiterTab, icon: <UtensilsCrossed className="h-4 w-4" /> },
    { label: copy.workspace.kitchenTab, icon: <ChefHat className="h-4 w-4" /> },
    { label: copy.workspace.tablesTab, icon: <LayoutGrid className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-medium text-[#B63B32]">{copy.workspace.eyebrow}</p>
        <h2 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{copy.workspace.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {copy.workspace.description}
        </p>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label={copy.workspace.navigationLabel}>
          <button type="button" onClick={() => setSection('customer-display')} className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium ${section === 'customer-display' ? 'bg-[#FF6B5E] text-[#222831]' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><Monitor className="h-4 w-4" />{copy.workspace.customerDisplayTab}</button>
          <button type="button" onClick={() => setSection('self-service')} className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium ${section === 'self-service' ? 'bg-[#FF6B5E] text-[#222831]' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><ShoppingBasket className="h-4 w-4" />{copy.workspace.selfServiceTab}</button>
          <button type="button" onClick={() => setSection('self-checkout')} className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium ${section === 'self-checkout' ? 'bg-[#FF6B5E] text-[#222831]' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><CreditCard className="h-4 w-4" />{copy.workspace.selfCheckoutTab}</button>
          {upcomingScreens.map((screen) => (
            <button
              key={screen.label}
              type="button"
              disabled
              title={copy.workspace.comingSoon}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-500"
            >
              {screen.icon}
              {screen.label}
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] dark:bg-slate-800">{copy.workspace.comingSoon}</span>
            </button>
          ))}
        </nav>
      </header>

      {section === 'self-service' ? (
        <SelfServiceKioskManager />
      ) : section === 'self-checkout' ? (
        <SelfCheckoutWorkspace />
      ) : (
        <CustomerDisplayManager />
      )}
    </div>
  );
}
