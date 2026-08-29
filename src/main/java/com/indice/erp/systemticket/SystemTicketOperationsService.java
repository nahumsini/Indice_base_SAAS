package com.indice.erp.systemticket;

import static com.indice.erp.systemticket.SystemTicketOperationsContracts.AssignRequest;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Assignee;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Detail;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.FilterOption;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Filters;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.MessageRequest;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Summary;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Ticket;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.UpdateRequest;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Workspace;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.notifications.AppNotificationService;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Predicate;
import java.util.function.ToLongFunction;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemTicketOperationsService {

    private static final Set<String> TYPES = Set.of("FAILURE", "IMPROVEMENT");
    private static final Set<String> PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private static final Set<String> STATUSES = Set.of(
        "OPEN", "IN_REVIEW", "WAITING_ON_REPORTER", "PLANNED", "RESOLVED", "CLOSED"
    );
    private static final Set<String> ACTIVE_STATUSES = Set.of(
        "OPEN", "IN_REVIEW", "WAITING_ON_REPORTER", "PLANNED"
    );
    private static final Set<String> VISIBILITIES = Set.of("PUBLIC", "INTERNAL");

    private final SystemTicketOperationsRepository repository;
    private final SystemTicketAttachmentService attachments;
    private final DistributorPortfolioAccessPolicy distributorAccess;
    private final PlatformAdminAccessService platformAccess;
    private final AppNotificationService notifications;
    private final Clock clock;

    public SystemTicketOperationsService(
        SystemTicketOperationsRepository repository,
        SystemTicketAttachmentService attachments,
        DistributorPortfolioAccessPolicy distributorAccess,
        PlatformAdminAccessService platformAccess,
        AppNotificationService notifications,
        Clock clock
    ) {
        this.repository = repository;
        this.attachments = attachments;
        this.distributorAccess = distributorAccess;
        this.platformAccess = platformAccess;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Workspace listForPlatform(long actorUserId, Filters filters) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        return workspace(null, filters, true);
    }

    @Transactional(readOnly = true)
    public Workspace listForDistributor(AuthSessionUser actor, Filters filters) {
        var distributor = distributorAccess.requireDistributor(actor);
        return workspace(distributor.companyId(), filters, false);
    }

    @Transactional(readOnly = true)
    public Detail detailForPlatform(long actorUserId, long ticketId) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        return detail(repository.findTicket(ticketId, null), false);
    }

    @Transactional(readOnly = true)
    public Detail detailForDistributor(AuthSessionUser actor, long ticketId) {
        var distributor = distributorAccess.requireDistributor(actor);
        return detail(repository.findTicket(ticketId, distributor.companyId()), true);
    }

    @Transactional
    public Ticket updateFromPlatform(long actorUserId, long ticketId, UpdateRequest request) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        if (request == null) throw new IllegalArgumentException("Ticket update is required.");
        var current = repository.findTicket(ticketId, null);
        var status = requireAllowed(request.status(), STATUSES, "status");
        var priority = requireAllowed(request.priority(), PRIORITIES, "priority");
        requireTransition(current.status(), status);
        var rootResponse = optionalText(request.root_response(), 10_000);
        var now = clock.instant();
        var target = request.target_resolution_at() != null
            ? request.target_resolution_at()
            : priority.equals(current.priority())
                ? current.target_resolution_at()
                : targetFor(current.created_at(), priority);
        var reopening = completed(current.status()) && ACTIVE_STATUSES.contains(status);
        var resolvedAt = completed(status)
            ? current.resolved_at() == null ? now : current.resolved_at()
            : null;
        var firstResponse = current.first_responded_at() == null && rootResponse != null
            ? now
            : current.first_responded_at();

        repository.updateWorkflow(
            ticketId, actorUserId, status, priority, rootResponse, firstResponse, target,
            resolvedAt, reopening
        );
        repository.addEvent(
            ticketId, actorUserId, reopening ? "REOPENED" : "ROOT_UPDATED", "PUBLIC",
            current.status(), status, rootResponse
        );
        var updated = repository.findTicket(ticketId, null);
        notifyReporter(updated, "Actualización de ticket " + updated.folio(), statusCopy(updated), "update");
        return updated;
    }

    @Transactional
    public Ticket assignFromPlatform(long actorUserId, long ticketId, AssignRequest request) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        if (request == null) throw new IllegalArgumentException("Assignment is required.");
        var current = repository.findTicket(ticketId, null);
        var assigneeId = request.assigned_to_user_id();
        Assignee assignee = null;
        if (assigneeId != null) assignee = requireAssignableUser(assigneeId);
        var nextStatus = assignee != null && "OPEN".equals(current.status()) ? "IN_REVIEW" : current.status();
        repository.assign(ticketId, actorUserId, assigneeId, nextStatus);
        repository.addEvent(
            ticketId, actorUserId, "ASSIGNED", "PUBLIC", current.status(), nextStatus,
            assignee == null ? "Ticket sin responsable." : "Responsable: " + assignee.name()
        );
        var updated = repository.findTicket(ticketId, null);
        notifyReporter(updated, "Responsable actualizado", statusCopy(updated), "assignment");
        return updated;
    }

    @Transactional
    public Ticket takeFromPlatform(long actorUserId, long ticketId) {
        return assignFromPlatform(actorUserId, ticketId, new AssignRequest(actorUserId));
    }

    @Transactional
    public Detail addMessageFromPlatform(long actorUserId, long ticketId, MessageRequest request) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        if (request == null) throw new IllegalArgumentException("Message is required.");
        var current = repository.findTicket(ticketId, null);
        var message = requireText(request.message(), 10_000, "Message");
        var visibility = requireAllowed(request.visibility(), VISIBILITIES, "visibility");
        if ("PUBLIC".equals(visibility)) {
            repository.addRootMessage(ticketId, actorUserId, message, clock.instant());
        }
        repository.addEvent(
            ticketId, actorUserId,
            "PUBLIC".equals(visibility) ? "PUBLIC_MESSAGE" : "INTERNAL_NOTE",
            visibility, current.status(), current.status(), message
        );
        var updated = repository.findTicket(ticketId, null);
        if ("PUBLIC".equals(visibility)) {
            notifyReporter(updated, "Nueva respuesta en " + updated.folio(), message, "message");
        }
        return detail(updated, false);
    }

    @Transactional
    public Detail addMessageFromDistributor(AuthSessionUser actor, long ticketId, MessageRequest request) {
        var distributor = distributorAccess.requireDistributor(actor);
        var actorUserId = requireActorUserId(actor);
        if (request == null) throw new IllegalArgumentException("Message is required.");
        var current = repository.findTicket(ticketId, distributor.companyId());
        var message = requireText(request.message(), 10_000, "Message");
        var nextStatus = current.status();
        var reopening = false;
        if ("WAITING_ON_REPORTER".equals(current.status())) {
            nextStatus = "IN_REVIEW";
        } else if (completed(current.status())) {
            nextStatus = "OPEN";
            reopening = true;
        }
        repository.acknowledgeReporterMessage(
            ticketId, distributor.companyId(), actorUserId, nextStatus, reopening
        );
        repository.addEvent(
            ticketId, actorUserId, reopening ? "REOPENED" : "PUBLIC_MESSAGE", "PUBLIC",
            current.status(), nextStatus, message
        );
        return detail(repository.findTicket(ticketId, distributor.companyId()), true);
    }

    private Workspace workspace(Long distributorCompanyId, Filters rawFilters, boolean includeAssignees) {
        var allTickets = repository.listTickets(distributorCompanyId);
        var filters = normalizeFilters(rawFilters);
        var filtered = allTickets.stream().filter(ticket -> matches(ticket, filters)).toList();
        var modules = allTickets.stream().map(Ticket::module)
            .filter(value -> value != null && !value.isBlank()).distinct().sorted().toList();
        var distributors = allTickets.stream()
            .map(ticket -> new FilterOption(String.valueOf(ticket.distributor_company_id()), ticket.distributor_name()))
            .distinct().sorted((left, right) -> left.label().compareToIgnoreCase(right.label())).toList();
        return new Workspace(
            summarize(allTickets), filtered, filtered.size(),
            includeAssignees ? repository.listAssignees() : List.of(), modules, distributors
        );
    }

    private Detail detail(Ticket ticket, boolean publicOnly) {
        return new Detail(ticket, repository.listEvents(ticket.id(), publicOnly), attachments.list(ticket));
    }

    private boolean matches(Ticket ticket, Filters filters) {
        return (filters.query().isBlank()
                || normalize(ticket.folio()).contains(filters.query())
                || normalize(ticket.title()).contains(filters.query())
                || normalize(ticket.module()).contains(filters.query())
                || normalize(ticket.distributor_name()).contains(filters.query())
                || normalize(ticket.assignee_name()).contains(filters.query()))
            && ("ALL".equals(filters.status())
                || ("ACTIVE".equals(filters.status()) && ACTIVE_STATUSES.contains(ticket.status()))
                || filters.status().equals(ticket.status()))
            && ("ALL".equals(filters.type()) || filters.type().equals(ticket.type()))
            && ("ALL".equals(filters.priority()) || filters.priority().equals(ticket.priority()))
            && ("ALL".equals(filters.assignee())
                || ("UNASSIGNED".equals(filters.assignee()) && ticket.assigned_to_user_id() == null)
                || filters.assignee().equals(String.valueOf(ticket.assigned_to_user_id())))
            && (filters.module().isBlank() || normalize(ticket.module()).equals(filters.module()))
            && (filters.distributor().isBlank()
                || filters.distributor().equals(String.valueOf(ticket.distributor_company_id())))
            && (!filters.overdue() || ticket.overdue())
            && (filters.from() == null || !ticket.created_at().isBefore(filters.from()))
            && (filters.to() == null || ticket.created_at().isBefore(filters.to()));
    }

    private Summary summarize(List<Ticket> tickets) {
        var now = clock.instant();
        var resolved = tickets.stream().filter(ticket -> ticket.resolved_at() != null).toList();
        var responded = tickets.stream().filter(ticket -> ticket.first_responded_at() != null).toList();
        var measuredSla = resolved.stream().filter(ticket -> ticket.target_resolution_at() != null).toList();
        var compliant = measuredSla.stream()
            .filter(ticket -> !ticket.resolved_at().isAfter(ticket.target_resolution_at())).count();
        return new Summary(
            tickets.size(), count(tickets, ticket -> ACTIVE_STATUSES.contains(ticket.status())),
            count(tickets, ticket -> "IN_REVIEW".equals(ticket.status())),
            count(tickets, ticket -> "PLANNED".equals(ticket.status())),
            count(tickets, ticket -> completed(ticket.status())),
            count(tickets, ticket -> ACTIVE_STATUSES.contains(ticket.status()) && ticket.assigned_to_user_id() == null),
            count(tickets, ticket -> ACTIVE_STATUSES.contains(ticket.status()) && "CRITICAL".equals(ticket.priority())),
            count(tickets, Ticket::overdue),
            count(tickets, ticket -> "WAITING_ON_REPORTER".equals(ticket.status())),
            count(tickets, ticket -> ticket.resolved_at() != null
                && !ticket.resolved_at().isBefore(now.minus(Duration.ofHours(24)))),
            averageMinutes(responded, ticket -> Duration.between(ticket.created_at(), ticket.first_responded_at()).toMinutes()),
            averageMinutes(resolved, ticket -> Duration.between(ticket.created_at(), ticket.resolved_at()).toMinutes()),
            measuredSla.isEmpty() ? null : Math.round((compliant * 1000.0) / measuredSla.size()) / 10.0,
            tickets.stream().mapToInt(Ticket::reopened_count).sum()
        );
    }

    private int count(List<Ticket> tickets, Predicate<Ticket> predicate) {
        return (int) tickets.stream().filter(predicate).count();
    }

    private Long averageMinutes(List<Ticket> tickets, ToLongFunction<Ticket> value) {
        return tickets.isEmpty() ? null : Math.round(tickets.stream().mapToLong(value).average().orElse(0));
    }

    private Filters normalizeFilters(Filters filters) {
        var source = filters == null
            ? new Filters("", "ALL", "ALL", "ALL", "ALL", "", "", false, null, null)
            : filters;
        return new Filters(
            normalize(source.query()), normalizeFilter(source.status(), STATUSES, true),
            normalizeFilter(source.type(), TYPES, false),
            normalizeFilter(source.priority(), PRIORITIES, false), normalizeAssignee(source.assignee()),
            normalize(source.module()), normalize(source.distributor()), source.overdue(),
            source.from(), source.to()
        );
    }

    private String normalizeAssignee(String value) {
        var normalized = value == null || value.isBlank() ? "ALL" : value.trim().toUpperCase(Locale.ROOT);
        if (Set.of("ALL", "UNASSIGNED").contains(normalized)) return normalized;
        try {
            return String.valueOf(Long.parseLong(normalized));
        } catch (NumberFormatException ignored) {
            return "ALL";
        }
    }

    private Assignee requireAssignableUser(long userId) {
        return repository.listAssignees().stream().filter(option -> option.user_id() == userId).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Assignee is not an active platform support user."));
    }

    private void notifyReporter(Ticket ticket, String title, String description, String eventType) {
        var recipient = notifications.userCompanyIdForUser(
            ticket.distributor_company_id(), ticket.reported_by_user_id()
        );
        if (recipient == null) return;
        notifications.publish(new AppNotificationEvent(
            ticket.distributor_company_id(), recipient, "system_tickets", "system_ticket", ticket.id(),
            eventType, "system-ticket-" + ticket.id() + "-" + eventType + "-" + clock.instant().toEpochMilli(),
            title, description, "/distributor-portal?tab=tickets&ticket=" + ticket.folio()
        ));
    }

    private String statusCopy(Ticket ticket) {
        var owner = ticket.assignee_name() == null ? "Sin responsable" : ticket.assignee_name();
        return ticket.status() + " · " + owner;
    }

    private void requireTransition(String current, String next) {
        if (current.equals(next)) return;
        if ("RESOLVED".equals(current) && !Set.of("CLOSED", "IN_REVIEW", "OPEN").contains(next)) {
            throw new IllegalArgumentException("Resolved tickets can only be closed or reopened.");
        }
        if ("CLOSED".equals(current) && !Set.of("IN_REVIEW", "OPEN").contains(next)) {
            throw new IllegalArgumentException("Closed tickets must be reopened before changing workflow.");
        }
    }

    private boolean completed(String status) {
        return Set.of("RESOLVED", "CLOSED").contains(status);
    }

    private Instant targetFor(Instant origin, String priority) {
        var hours = switch (priority) {
            case "CRITICAL" -> 4;
            case "HIGH" -> 24;
            case "MEDIUM" -> 72;
            default -> 120;
        };
        return origin.plus(Duration.ofHours(hours));
    }

    private long requireActorUserId(AuthSessionUser actor) {
        if (actor == null || actor.userId() == null) throw new IllegalArgumentException("Authenticated user is required.");
        return actor.userId();
    }

    private String requireAllowed(String value, Set<String> allowed, String field) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw new IllegalArgumentException("Invalid " + field + ".");
        return normalized;
    }

    private String requireText(String value, int maxLength, String field) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) throw new IllegalArgumentException(field + " is required.");
        if (normalized.length() > maxLength) throw new IllegalArgumentException(field + " is too long.");
        return normalized;
    }

    private String optionalText(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        var normalized = value.trim();
        if (normalized.length() > maxLength) throw new IllegalArgumentException("Value is too long.");
        return normalized;
    }

    private String normalizeFilter(String value, Set<String> allowed, boolean allowActive) {
        var normalized = value == null || value.isBlank() ? "ALL" : value.trim().toUpperCase(Locale.ROOT);
        if ("ALL".equals(normalized) || (allowActive && "ACTIVE".equals(normalized)) || allowed.contains(normalized)) {
            return normalized;
        }
        return "ALL";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
