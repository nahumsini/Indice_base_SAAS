import { useCallback, useState } from 'react';
import type { OperationalActivity } from '../components/OperationalActivityFeed';
import { MAX_OPERATIONAL_ACTIVITIES } from '../constants/sale.constants';
import { buildInitialActivities } from '../data/initialActivities';

export function useSaleActivityFeed() {
  const [recentActivities, setRecentActivities] = useState<OperationalActivity[]>(buildInitialActivities);

  const pushActivity = useCallback((activity: Omit<OperationalActivity, 'id' | 'timestamp'>) => {
    setRecentActivities((currentActivities) => [
      {
        ...activity,
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
      },
      ...currentActivities,
    ].slice(0, MAX_OPERATIONAL_ACTIVITIES));
  }, []);

  return {
    recentActivities,
    pushActivity,
  };
}

