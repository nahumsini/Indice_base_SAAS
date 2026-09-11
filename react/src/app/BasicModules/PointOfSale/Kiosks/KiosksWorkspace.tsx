import { useState } from 'react';
import { useLocation } from 'react-router';
import { readKioskAdminNavigationTarget } from '../../../components/kiosk-engine/kioskAdminNavigation';
import { KioskCenterWorkspace, type CreatableKioskExperience } from './KioskCenterWorkspace';
import { SelfCheckoutCreationFlow } from './SelfCheckoutCreationFlow';
import { StandardKioskCreationFlow } from './StandardKioskCreationFlow';
import { RestaurantKioskCreationFlow } from './RestaurantKioskCreationFlow';

export default function KiosksWorkspace() {
  const location = useLocation();
  const kioskAdminTarget = readKioskAdminNavigationTarget(location.search);
  const initialKioskId = kioskAdminTarget && [
    'customer_display',
    'self_service',
    'self_checkout',
    'waiter_station',
    'table_order_center',
    'kitchen_display',
  ].includes(kioskAdminTarget.kioskType) ? kioskAdminTarget.engineId : null;
  const [creationType, setCreationType] = useState<CreatableKioskExperience | null>(null);
  const [centerRefreshKey, setCenterRefreshKey] = useState(0);
  const [createdKioskName, setCreatedKioskName] = useState('');

  const finishCreation = (name: string) => {
    setCreationType(null);
    setCreatedKioskName(name);
    setCenterRefreshKey((current) => current + 1);
  };

  return (
    <>
      <KioskCenterWorkspace
        refreshKey={centerRefreshKey}
        createdKioskName={createdKioskName}
        initialKioskId={initialKioskId}
        onCreateView={setCreationType}
      />

      {creationType === 'self-checkout' ? (
        <SelfCheckoutCreationFlow
          onClose={() => setCreationType(null)}
          onCreated={(kiosk) => finishCreation(kiosk.name)}
        />
      ) : null}

      {creationType === 'customer-display' || creationType === 'self-service' ? (
        <StandardKioskCreationFlow
          type={creationType}
          onClose={() => setCreationType(null)}
          onCreated={finishCreation}
        />
      ) : null}

      {creationType === 'restaurant-waiter' || creationType === 'restaurant-tables' || creationType === 'restaurant-kitchen' ? (
        <RestaurantKioskCreationFlow
          type={creationType}
          onClose={() => setCreationType(null)}
          onCreated={(kiosk) => finishCreation(kiosk.name)}
        />
      ) : null}
    </>
  );
}
