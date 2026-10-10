import { createContext, useContext, useMemo } from 'react';
import { messagingApi } from './api';
import type { MessagingPortal } from './types';

// The owner UI can use an approved alternate identity without reading the ERP session.
export const MessagingTransportContext = createContext<ReturnType<typeof messagingApi> | null>(null);
export const MessagingVisibleContext = createContext(true);
export function useMessagingApi(portal: MessagingPortal) {
  const transport = useContext(MessagingTransportContext);
  return useMemo(() => transport ?? messagingApi(portal), [portal, transport]);
}
