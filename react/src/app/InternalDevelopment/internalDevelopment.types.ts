export type InternalDevelopmentEntryType =
  | 'WEEKLY_REPORT'
  | 'CONTRIBUTION'
  | 'BOARD_MEETING'
  | 'WORKING_MEETING'
  | 'MINUTES'
  | 'DECISION';

export type InternalDevelopmentArea =
  | 'DEVELOPMENT'
  | 'PRODUCT'
  | 'OPERATIONS'
  | 'COMMERCIAL'
  | 'FINANCE'
  | 'GOVERNANCE'
  | 'GENERAL';

export type InternalDevelopmentStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'RECORDED'
  | 'CLOSED'
  | 'CANCELLED';

export interface InternalDevelopmentMember {
  id: number;
  name: string;
  email: string;
}

export interface InternalDevelopmentParticipant extends InternalDevelopmentMember {}

export interface InternalDevelopmentEntry {
  id: number;
  folio: string;
  entryType: InternalDevelopmentEntryType;
  area: InternalDevelopmentArea;
  status: InternalDevelopmentStatus;
  title: string;
  summary: string;
  details: string | null;
  decisions: string | null;
  nextSteps: string | null;
  eventAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  location: string | null;
  referenceUrl: string | null;
  ownerUserId: number;
  ownerName: string;
  ownerEmail: string;
  relatedEntryId: number | null;
  relatedEntryTitle: string | null;
  createdByUserId: number;
  createdByName: string;
  updatedByUserId: number;
  updatedByName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  participants: InternalDevelopmentParticipant[];
}

export interface InternalDevelopmentHistory {
  id: number;
  entryVersion: number;
  actionCode: 'CREATED' | 'UPDATED';
  changedByUserId: number;
  changedByName: string;
  changedByEmail: string;
  snapshotJson: string;
  changedAt: string;
}

export interface InternalDevelopmentSummary {
  activeRootMembers: number;
  weeklyReportsSubmitted: number;
  weeklyReportsPending: number;
  pendingWeeklyMemberNames: string[];
  upcomingMeetings: number;
  recordsThisMonth: number;
}

export interface InternalDevelopmentWorkspaceData {
  summary: InternalDevelopmentSummary;
  currentUserId: number;
  members: InternalDevelopmentMember[];
  entries: InternalDevelopmentEntry[];
  matchingEntries: number;
}

export interface InternalDevelopmentDetail {
  entry: InternalDevelopmentEntry;
  history: InternalDevelopmentHistory[];
}

export interface InternalDevelopmentFilters {
  query: string;
  entryType: 'ALL' | InternalDevelopmentEntryType;
  area: 'ALL' | InternalDevelopmentArea;
  status: 'ALL' | InternalDevelopmentStatus;
  ownerUserId: string;
  from: string;
  to: string;
}

export interface InternalDevelopmentEntryPayload {
  entryType: InternalDevelopmentEntryType;
  area: InternalDevelopmentArea;
  status: InternalDevelopmentStatus;
  title: string;
  summary: string;
  details?: string | null;
  decisions?: string | null;
  nextSteps?: string | null;
  eventAt: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  location?: string | null;
  referenceUrl?: string | null;
  ownerUserId: number;
  relatedEntryId?: number | null;
  participantUserIds: number[];
  version?: number;
}
