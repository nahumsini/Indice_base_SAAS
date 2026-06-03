import type {
  AnnouncementDisplayStatus,
  AnnouncementDisplayType,
} from '../announcementTypes';

export const audienceFilterValues = ['all', 'operations', 'leaders', 'everyone'] as const;
export const typeFilterValues = ['all', 'general', 'urgent', 'reminder', 'celebration'] as const;
export const statusFilterValues = ['all', 'published', 'scheduled', 'draft'] as const;
export const defaultVisibleColumnIds = ['type', 'audience', 'publication', 'reads', 'status', 'author'] as const;

export type AnnouncementAudienceFilter = (typeof audienceFilterValues)[number];
export type AnnouncementTypeFilter = (typeof typeFilterValues)[number];
export type AnnouncementStatusFilter = (typeof statusFilterValues)[number];

export const typeFilterMap: Partial<Record<AnnouncementTypeFilter, AnnouncementDisplayType>> = {
  celebration: 'Celebracion',
  general: 'General',
  reminder: 'Recordatorio',
  urgent: 'Urgente',
};

export const statusFilterMap: Partial<Record<AnnouncementStatusFilter, AnnouncementDisplayStatus>> = {
  draft: 'Borrador',
  published: 'Publicado',
  scheduled: 'Programado',
};

export const emptyAnnouncementSummary = {
  can_manage: false,
  draft_count: 0,
  published_count: 0,
  scheduled_count: 0,
  total_count: 0,
};
