package com.indice.erp.internaldevelopment;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class InternalDevelopmentContracts {

    private InternalDevelopmentContracts() {
    }

    public record Member(long id, String name, String email) {
    }

    public record Participant(long id, String name, String email) {
    }

    public record Entry(
        long id,
        String folio,
        String entryType,
        String area,
        String status,
        String title,
        String summary,
        String details,
        String decisions,
        String nextSteps,
        Instant eventAt,
        LocalDate periodStart,
        LocalDate periodEnd,
        String location,
        String referenceUrl,
        long ownerUserId,
        String ownerName,
        String ownerEmail,
        Long relatedEntryId,
        String relatedEntryTitle,
        long createdByUserId,
        String createdByName,
        long updatedByUserId,
        String updatedByName,
        int version,
        Instant createdAt,
        Instant updatedAt,
        List<Participant> participants
    ) {
        Entry withParticipants(List<Participant> value) {
            return new Entry(
                id, folio, entryType, area, status, title, summary, details, decisions, nextSteps,
                eventAt, periodStart, periodEnd, location, referenceUrl, ownerUserId, ownerName,
                ownerEmail, relatedEntryId, relatedEntryTitle, createdByUserId, createdByName,
                updatedByUserId, updatedByName, version, createdAt, updatedAt, value
            );
        }
    }

    public record History(
        long id,
        int entryVersion,
        String actionCode,
        long changedByUserId,
        String changedByName,
        String changedByEmail,
        String snapshotJson,
        Instant changedAt
    ) {
    }

    public record Summary(
        int activeRootMembers,
        int weeklyReportsSubmitted,
        int weeklyReportsPending,
        List<String> pendingWeeklyMemberNames,
        int upcomingMeetings,
        int recordsThisMonth
    ) {
    }

    public record Workspace(
        Summary summary,
        long currentUserId,
        List<Member> members,
        List<Entry> entries,
        long matchingEntries
    ) {
    }

    public record Detail(Entry entry, List<History> history) {
    }

    public record Filters(
        String query,
        String entryType,
        String area,
        String status,
        Long ownerUserId,
        LocalDate from,
        LocalDate to
    ) {
    }

    public record EntryRequest(
        String entryType,
        String area,
        String status,
        String title,
        String summary,
        String details,
        String decisions,
        String nextSteps,
        Instant eventAt,
        LocalDate periodStart,
        LocalDate periodEnd,
        String location,
        String referenceUrl,
        Long ownerUserId,
        Long relatedEntryId,
        List<Long> participantUserIds,
        Integer version
    ) {
    }
}
