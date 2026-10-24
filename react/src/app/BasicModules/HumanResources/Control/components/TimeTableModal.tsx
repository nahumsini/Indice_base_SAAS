import { useSyncExternalStore } from 'react';
import { getAuthorizationRevision, subscribeToAuthorizationChanged } from '../../../../api/authSessionStore';
import type { TimeTableModalProps } from '../types/timeTableTypes';
import { IncidentReportModal } from './modals/incidents/IncidentReportModal';

export function TimeTableModal(props: TimeTableModalProps) {
  const authorization = useSyncExternalStore(subscribeToAuthorizationChanged, getAuthorizationRevision);
  return props.isOpen ? <IncidentReportModal key={authorization} {...props} /> : null;
}
