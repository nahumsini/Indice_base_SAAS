import { useState } from 'react';
import { Monitor, ShoppingBasket } from 'lucide-react';
import { CustomerDisplayManager } from './CustomerDisplayManager';
import { SelfServiceKioskManager } from './SelfServiceKioskManager';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

type KioskSection = 'self-service' | 'customer-display';

export default function KiosksWorkspace() {
  const [section, setSection] = useState<KioskSection>('self-service');
  const { copy } = usePointOfSaleKioskTranslations();

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B63B32]">{copy.workspace.eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{copy.workspace.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {copy.workspace.description}
        </p>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label={copy.workspace.navigationLabel}>
          <button type="button" onClick={() => setSection('self-service')} className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black ${section === 'self-service' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><ShoppingBasket className="h-4 w-4" />{copy.workspace.selfServiceTab}</button>
          <button type="button" onClick={() => setSection('customer-display')} className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-black ${section === 'customer-display' ? 'bg-[#FF6B5E] text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><Monitor className="h-4 w-4" />{copy.workspace.customerDisplayTab}</button>
        </nav>
      </header>

      {section === 'self-service' ? <SelfServiceKioskManager /> : <CustomerDisplayManager />}
    </div>
  );
}
