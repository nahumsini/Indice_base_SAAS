package com.indice.erp.platformadmin.leads;

import java.time.Instant;
import java.util.List;

public final class PlatformLeadContracts {
    private PlatformLeadContracts() {
    }

    public record Submission(
        String fullName,
        String companyName,
        String email,
        String phone,
        String country,
        String challenge,
        String landingPath,
        String sourceChannel,
        String utmSource,
        String utmMedium,
        String utmCampaign,
        String planInterest,
        boolean contactConsent
    ) {
    }

    public record Update(
        String status,
        Long assignedAdminId,
        Instant nextActionAt,
        boolean clearNextAction,
        String note,
        int version
    ) {
    }

    public record Summary(
        long id,
        String fullName,
        String companyName,
        String email,
        String phone,
        String country,
        String challenge,
        String landingPath,
        String sourceChannel,
        String utmSource,
        String utmMedium,
        String utmCampaign,
        String planInterest,
        String status,
        Long assignedAdminId,
        String assignedName,
        Instant nextActionAt,
        Instant diagnosisCompletedAt,
        Instant trialStartedAt,
        Instant trialEndsAt,
        Instant createdAt,
        Instant updatedAt,
        int version
    ) {
    }

    public record Event(
        long id,
        String eventType,
        String fromStatus,
        String toStatus,
        String note,
        String actorName,
        Instant occurredAt
    ) {
    }

    public record Detail(Summary lead, List<Event> events) {
    }

    public record Assignee(long id, String name, String email) {
    }

    public record Page(List<Summary> items, long total) {
    }
}
