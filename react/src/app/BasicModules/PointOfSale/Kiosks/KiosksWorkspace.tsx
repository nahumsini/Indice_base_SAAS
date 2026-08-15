import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CustomerDisplayManager } from './CustomerDisplayManager';
import { KioskCenterWorkspace } from './KioskCenterWorkspace';
import { RestaurantKioskWorkspace, type RestaurantKioskType } from './RestaurantKioskWorkspace';
import { SelfCheckoutWorkspace } from './SelfCheckoutWorkspace';
import { SelfServiceKioskManager } from './SelfServiceKioskManager';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

type KioskWorkspaceView = 'center' | 'customer-display' | 'customer-display-create' | 'self-service' | 'self-checkout' | 'restaurant-waiter' | 'restaurant-tables' | 'restaurant-kitchen';

export default function KiosksWorkspace() {
  const [view, setView] = useState<KioskWorkspaceView>('center');
  const { copy } = usePointOfSaleKioskTranslations();

  if (view === 'center') {
    return <KioskCenterWorkspace onOpenView={setView} onCreateView={(nextView) => setView(nextView === 'customer-display' ? 'customer-display-create' : nextView)} />;
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={() => setView('center')} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-[#B63B32] transition hover:border-[#FF6B5E] hover:bg-[#FF6B5E]/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
        <ArrowLeft className="h-4 w-4" />{copy.center.back}
      </button>

      {view.startsWith('restaurant-') ? (
        <RestaurantKioskWorkspace type={view.replace('restaurant-', '') as RestaurantKioskType} />
      ) : view === 'customer-display' || view === 'customer-display-create' ? (
        <CustomerDisplayManager startWithSetup={view === 'customer-display-create'} />
      ) : view === 'self-service' ? (
        <SelfServiceKioskManager />
      ) : (
        <SelfCheckoutWorkspace />
      )}
    </div>
  );
}
