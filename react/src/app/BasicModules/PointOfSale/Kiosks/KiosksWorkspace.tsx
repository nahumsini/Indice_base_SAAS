import { useState } from 'react';
import { KioskCenterWorkspace, type CreatableKioskExperience } from './KioskCenterWorkspace';
import { SelfCheckoutCreationFlow } from './SelfCheckoutCreationFlow';
import { StandardKioskCreationFlow } from './StandardKioskCreationFlow';
import { RestaurantKioskCreationFlow } from './RestaurantKioskCreationFlow';

export default function KiosksWorkspace() {
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
