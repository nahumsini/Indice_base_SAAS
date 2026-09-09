import { getInternalDevelopmentMessages } from './translations';
import type {
  InternalDevelopmentArea,
  InternalDevelopmentEntryType,
  InternalDevelopmentStatus,
} from './internalDevelopment.types';

export function getInternalDevelopmentCopy(locale: string | boolean = "en-CA") {
  const messages = getInternalDevelopmentMessages(locale);
  return {
    types: {
      WEEKLY_REPORT: messages.weeklyReport, CONTRIBUTION: messages.contribution, BOARD_MEETING: messages.boardMeeting,
      WORKING_MEETING: messages.workingMeeting, MINUTES: messages.minutes, DECISION: messages.decision,
    } satisfies Record<InternalDevelopmentEntryType, string>,
    areas: {
      DEVELOPMENT: messages.development, PRODUCT: messages.product, OPERATIONS: messages.operations,
      COMMERCIAL: messages.commercial, FINANCE: messages.finance, GOVERNANCE: messages.governance, GENERAL: messages.general,
    } satisfies Record<InternalDevelopmentArea, string>,
    statuses: {
      DRAFT: messages.draft, PLANNED: messages.planned, RECORDED: messages.recorded, CLOSED: messages.closed, CANCELLED: messages.cancelled,
    } satisfies Record<InternalDevelopmentStatus, string>,
    title: messages.internalDevelopmentLog,
    subtitle: messages.preserveWeeklyContributionsMeetingsMinutesAndDecisionsIn,
    eyebrow: messages.rootCorporateTraceability,
    newEntry: messages.newRecord,
    refresh: messages.refresh,
    filters: messages.registryFilters,
    filtersSubtitle: messages.findAnEventByContentResponsibilityOrDate,
    search: messages.search,
    searchPlaceholder: messages.folioTitleSummaryOrDetail,
    allTypes: messages.allTypes,
    allAreas: messages.allAreas,
    allStatuses: messages.allStatuses,
    allOwners: messages.allResponsiblePeople,
    type: messages.type,
    area: messages.area,
    status: messages.status,
    owner: messages.responsible,
    from: messages.from,
    to: messages.to,
    clear: messages.clearFilters,
    records: messages.records,
    submitted: messages.weeklyReportsSubmitted,
    pending: messages.weeklyReportsPending,
    upcoming: messages.upcomingMeetings,
    thisMonth: messages.recordsThisMonth,
    pendingNames: messages.pendingThisWeek,
    tableTitle: messages.corporateEventHistory,
    dateFolio: messages.dateAndFolio,
    record: messages.record,
    participants: messages.participants,
    actions: messages.actions,
    view: messages.view,
    noRecords: messages.noRecordsMatchTheseFilters,
    loading: messages.loadingCorporateHistory,
    retry: messages.tryAgain,
    edit: messages.edit,
  };
}
