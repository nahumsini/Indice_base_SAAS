import type {
  AnnouncementDisplayStatus,
  AnnouncementDisplayType,
  AnnouncementView,
} from '../announcementTypes';
import {
  type AnnouncementAudienceFilter,
  type AnnouncementStatusFilter,
  type AnnouncementTypeFilter,
  statusFilterMap,
  typeFilterMap,
} from '../constants/announcements.constants';

export const getAnnouncementAudienceGroup = (announcement: AnnouncementView): AnnouncementAudienceFilter => {
  if (announcement.audienceType === 'all') {
    return 'everyone';
  }
  if (
    announcement.audienceType === 'units'
    || announcement.audienceType === 'departments'
    || announcement.audienceType === 'employees'
  ) {
    return announcement.audienceType;
  }
  return 'all';
};

export const getAnnouncementTypeClasses = (type: AnnouncementDisplayType) => {
  const styles: Record<AnnouncementDisplayType, string> = {
    Celebracion: 'border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300',
    General: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
    Recordatorio: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    Urgente: 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300',
  };

  return styles[type];
};

export const getAnnouncementStatusClasses = (status: AnnouncementDisplayStatus) => {
  const styles: Record<AnnouncementDisplayStatus, string> = {
    Borrador: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    Programado: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    Publicado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  };

  return styles[status];
};

export function filterAnnouncements({
  announcements,
  searchQuery,
  selectedAudience,
  selectedStatus,
  selectedType,
}: {
  announcements: AnnouncementView[];
  searchQuery: string;
  selectedAudience: AnnouncementAudienceFilter;
  selectedStatus: AnnouncementStatusFilter;
  selectedType: AnnouncementTypeFilter;
}) {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  return announcements.filter((announcement) => {
    const matchesSearch = `${announcement.title} ${announcement.audienceSummary} ${announcement.authorName} ${announcement.content}`
      .toLowerCase()
      .includes(normalizedSearchQuery);
    const matchesType = selectedType === 'all' || announcement.type === typeFilterMap[selectedType];
    const matchesStatus = selectedStatus === 'all' || announcement.status === statusFilterMap[selectedStatus];
    const matchesAudience = selectedAudience === 'all' || getAnnouncementAudienceGroup(announcement) === selectedAudience;
    return matchesSearch && matchesType && matchesStatus && matchesAudience;
  });
}
