package com.indice.erp.internaldevelopment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Detail;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.EntryRequest;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Filters;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Summary;
import com.indice.erp.internaldevelopment.InternalDevelopmentContracts.Workspace;
import com.indice.erp.internaldevelopment.InternalDevelopmentRepository.ValidatedEntry;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.net.URI;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InternalDevelopmentService {

    private static final ZoneId CORPORATE_ZONE = ZoneId.of("America/Toronto");
    private static final Set<String> ENTRY_TYPES = Set.of(
        "WEEKLY_REPORT", "CONTRIBUTION", "BOARD_MEETING", "WORKING_MEETING", "MINUTES", "DECISION"
    );
    private static final Set<String> AREAS = Set.of(
        "DEVELOPMENT", "PRODUCT", "OPERATIONS", "COMMERCIAL", "FINANCE", "GOVERNANCE", "GENERAL"
    );
    private static final Set<String> STATUSES = Set.of("DRAFT", "PLANNED", "RECORDED", "CLOSED", "CANCELLED");
    private static final Set<String> MEETING_TYPES = Set.of("BOARD_MEETING", "WORKING_MEETING");

    private final InternalDevelopmentAccessService access;
    private final InternalDevelopmentRepository repository;
    private final PlatformAuditService audit;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public InternalDevelopmentService(
        InternalDevelopmentAccessService access,
        InternalDevelopmentRepository repository,
        PlatformAuditService audit,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.access = access;
        this.repository = repository;
        this.audit = audit;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public Workspace workspace(long actorUserId, Filters filters) {
        access.requireRoot(actorUserId);
        var members = repository.listRootMembers();
        var entries = repository.list(filters, 500);
        var now = clock.instant();
        var today = LocalDate.ofInstant(now, CORPORATE_ZONE);
        var weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        var weekEnd = weekStart.plusDays(6);
        var reportedOwnerIds = Set.copyOf(repository.weeklyReportOwnerIds(weekStart, weekEnd));
        var pendingNames = members.stream()
            .filter(member -> !reportedOwnerIds.contains(member.id()))
            .map(InternalDevelopmentContracts.Member::name)
            .toList();
        var monthStart = today.withDayOfMonth(1).atStartOfDay(CORPORATE_ZONE).toInstant();
        var nextMonth = today.withDayOfMonth(1).plusMonths(1).atStartOfDay(CORPORATE_ZONE).toInstant();
        var summary = new Summary(
            members.size(),
            members.size() - pendingNames.size(),
            pendingNames.size(),
            pendingNames,
            repository.upcomingMeetingCount(now),
            repository.recordsCreatedBetween(monthStart, nextMonth)
        );
        return new Workspace(summary, actorUserId, members, entries, repository.count(filters));
    }

    public Detail detail(long actorUserId, long entryId) {
        access.requireRoot(actorUserId);
        var entry = repository.find(entryId);
        return new Detail(entry, repository.history(entryId));
    }

    @Transactional
    public Detail create(long actorUserId, EntryRequest request) {
        access.requireRoot(actorUserId);
        var members = repository.listRootMembers();
        var value = validate(actorUserId, null, request, members);
        var temporaryFolio = "RDI-TMP-" + UUID.randomUUID().toString().replace("-", "");
        var entryId = repository.insert(actorUserId, value, temporaryFolio);
        var year = LocalDate.ofInstant(value.eventAt(), CORPORATE_ZONE).getYear();
        repository.assignFolio(entryId, "RDI-" + year + "-" + String.format(Locale.ROOT, "%06d", entryId));
        repository.replaceParticipants(entryId, value.participantUserIds());
        var entry = repository.find(entryId);
        repository.appendHistory(entryId, entry.version(), "CREATED", actorUserId, json(entry));
        audit.record(
            actorUserId,
            "INTERNAL_DEVELOPMENT_ENTRY_CREATED",
            "INTERNAL_DEVELOPMENT_ENTRY",
            String.valueOf(entryId),
            null,
            "SUCCESS",
            Map.of("folio", entry.folio(), "entry_type", entry.entryType(), "status", entry.status())
        );
        return new Detail(entry, repository.history(entryId));
    }

    @Transactional
    public Detail update(long actorUserId, long entryId, EntryRequest request) {
        access.requireRoot(actorUserId);
        var current = repository.find(entryId);
        if (request == null || request.version() == null || request.version() < 1) {
            throw new IllegalArgumentException("The current entry version is required.");
        }
        if (request.version() != current.version()) {
            throw new InternalDevelopmentConflictException(
                "This entry changed while you were editing it. Refresh it before saving again."
            );
        }
        var value = validate(actorUserId, entryId, request, repository.listRootMembers());
        if (!repository.update(entryId, actorUserId, request.version(), value)) {
            throw new InternalDevelopmentConflictException(
                "This entry changed while you were editing it. Refresh it before saving again."
            );
        }
        repository.replaceParticipants(entryId, value.participantUserIds());
        var entry = repository.find(entryId);
        repository.appendHistory(entryId, entry.version(), "UPDATED", actorUserId, json(entry));
        audit.record(
            actorUserId,
            "INTERNAL_DEVELOPMENT_ENTRY_UPDATED",
            "INTERNAL_DEVELOPMENT_ENTRY",
            String.valueOf(entryId),
            null,
            "SUCCESS",
            Map.of(
                "folio", entry.folio(), "entry_type", entry.entryType(),
                "status", entry.status(), "version", entry.version()
            )
        );
        return new Detail(entry, repository.history(entryId));
    }

    private ValidatedEntry validate(
        long actorUserId,
        Long entryId,
        EntryRequest request,
        List<InternalDevelopmentContracts.Member> members
    ) {
        if (request == null) throw new IllegalArgumentException("Entry data is required.");
        var entryType = allowed(request.entryType(), ENTRY_TYPES, "Select a valid registry type.");
        var area = allowed(request.area(), AREAS, "Select a valid business area.");
        var status = allowed(request.status(), STATUSES, "Select a valid registry status.");
        var title = required(request.title(), 180, "Title is required.");
        var summary = required(request.summary(), 700, "A concise summary is required.");
        var eventAt = request.eventAt();
        if (eventAt == null) throw new IllegalArgumentException("Event date and time are required.");
        var ownerUserId = request.ownerUserId() == null ? actorUserId : request.ownerUserId();
        var rootMemberIds = members.stream().map(InternalDevelopmentContracts.Member::id).collect(java.util.stream.Collectors.toSet());
        if (!rootMemberIds.contains(ownerUserId)) {
            throw new IllegalArgumentException("The responsible person must be an active Root user.");
        }
        if (request.relatedEntryId() != null) {
            if (request.relatedEntryId().equals(entryId)) {
                throw new IllegalArgumentException("An entry cannot be related to itself.");
            }
            if (!repository.exists(request.relatedEntryId())) {
                throw new NoSuchElementException("The related registry entry was not found.");
            }
        }
        if ("WEEKLY_REPORT".equals(entryType)) {
            if (request.periodStart() == null || request.periodEnd() == null) {
                throw new IllegalArgumentException("Weekly reports require a start and end date.");
            }
            if (request.periodStart().isAfter(request.periodEnd())) {
                throw new IllegalArgumentException("The report start date cannot be after its end date.");
            }
            if (request.periodStart().plusDays(13).isBefore(request.periodEnd())) {
                throw new IllegalArgumentException("A weekly report cannot cover more than fourteen days.");
            }
        }
        if (MEETING_TYPES.contains(entryType) && "DRAFT".equals(status)) {
            // Draft is valid; the UI defaults meetings to PLANNED but does not force premature publication.
        }
        var referenceUrl = optional(request.referenceUrl(), 700);
        if (referenceUrl != null) {
            try {
                var uri = URI.create(referenceUrl);
                if (!"https".equalsIgnoreCase(uri.getScheme()) && !"http".equalsIgnoreCase(uri.getScheme())) {
                    throw new IllegalArgumentException("The evidence link must use http or https.");
                }
            } catch (IllegalArgumentException exception) {
                throw new IllegalArgumentException("Enter a valid evidence link using http or https.");
            }
        }
        var participantIds = new LinkedHashSet<Long>();
        if (request.participantUserIds() != null) participantIds.addAll(request.participantUserIds());
        participantIds.add(ownerUserId);
        if (participantIds.size() > 50 || !rootMemberIds.containsAll(participantIds)) {
            throw new IllegalArgumentException("Participants must be active Root users.");
        }
        return new ValidatedEntry(
            entryType,
            area,
            status,
            title,
            summary,
            optional(request.details(), 20_000),
            optional(request.decisions(), 20_000),
            optional(request.nextSteps(), 20_000),
            eventAt,
            request.periodStart(),
            request.periodEnd(),
            optional(request.location(), 180),
            referenceUrl,
            ownerUserId,
            request.relatedEntryId(),
            List.copyOf(participantIds)
        );
    }

    private String allowed(String value, Set<String> allowed, String message) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw new IllegalArgumentException(message);
        return normalized;
    }

    private String required(String value, int max, String message) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) throw new IllegalArgumentException(message);
        if (normalized.length() > max) throw new IllegalArgumentException(message + " Maximum length: " + max + ".");
        return normalized;
    }

    private String optional(String value, int max) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        if (normalized.length() > max) throw new IllegalArgumentException("A text field exceeds its allowed length.");
        return normalized;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("The registry revision could not be preserved.", exception);
        }
    }
}
