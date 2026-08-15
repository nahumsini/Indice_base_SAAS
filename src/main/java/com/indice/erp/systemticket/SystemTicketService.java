package com.indice.erp.systemticket;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemTicketService {

    private static final Set<String> TYPES = Set.of("FAILURE", "IMPROVEMENT");
    private static final Set<String> PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private static final Set<String> STATUSES = Set.of("OPEN", "IN_REVIEW", "PLANNED", "RESOLVED", "CLOSED");
    private static final Set<String> ACTIVE_STATUSES = Set.of("OPEN", "IN_REVIEW", "PLANNED");
    private static final DateTimeFormatter FOLIO_DATE = DateTimeFormatter.ofPattern("yyyyMMdd")
        .withZone(ZoneOffset.UTC);

    private final JdbcTemplate jdbcTemplate;
    private final DistributorPortfolioAccessPolicy distributorAccess;
    private final PlatformAdminAccessService platformAccess;
    private final Clock clock;

    public SystemTicketService(
        JdbcTemplate jdbcTemplate,
        DistributorPortfolioAccessPolicy distributorAccess,
        PlatformAdminAccessService platformAccess,
        Clock clock
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.distributorAccess = distributorAccess;
        this.platformAccess = platformAccess;
        this.clock = clock;
    }

    public TicketWorkspace listForDistributor(AuthSessionUser actor, String query, String status, String type) {
        var distributor = distributorAccess.requireDistributor(actor);
        return workspace(distributor.companyId(), query, status, type);
    }

    public TicketWorkspace listForPlatform(long actorUserId, String query, String status, String type) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        return workspace(null, query, status, type);
    }

    @Transactional
    public Ticket create(AuthSessionUser actor, CreateRequest request) {
        var distributor = distributorAccess.requireDistributor(actor);
        var actorUserId = requireActorUserId(actor);
        return create(actorUserId, distributor.companyId(), request);
    }

    @Transactional
    public Ticket createFromPlatform(AuthSessionUser actor, CreateRequest request) {
        var actorUserId = requireActorUserId(actor);
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        if (actor.companyId() == null) {
            throw new IllegalArgumentException("An active company is required to report a system ticket.");
        }
        return create(actorUserId, actor.companyId(), request);
    }

    private Ticket create(long actorUserId, long companyId, CreateRequest request) {
        if (request == null) throw new IllegalArgumentException("System ticket is required.");
        var type = requireAllowed(request.type(), TYPES, "ticket type");
        var priority = requireAllowed(request.priority(), PRIORITIES, "priority");
        var title = requireText(request.title(), 180, "Title");
        var description = requireText(request.description(), 10_000, "Description");
        var moduleName = optionalText(request.module(), 120);
        var folio = createFolio();

        jdbcTemplate.update(
            """
                INSERT INTO system_support_tickets (
                    folio, distributor_company_id, reported_by_user_id, ticket_type,
                    priority, module_name, title, description, status, last_updated_by_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
                """,
            folio,
            companyId,
            actorUserId,
            type,
            priority,
            moduleName,
            title,
            description,
            actorUserId
        );
        var ticket = findVisible(folio, companyId);
        addEvent(ticket.id(), actorUserId, "CREATED", null, "OPEN", null);
        return ticket;
    }

    @Transactional
    public Ticket updateFromPlatform(long actorUserId, long ticketId, UpdateRequest request) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        if (request == null) throw new IllegalArgumentException("Ticket update is required.");
        var current = findById(ticketId);
        var status = requireAllowed(request.status(), STATUSES, "status");
        var priority = requireAllowed(request.priority(), PRIORITIES, "priority");
        var rootResponse = optionalText(request.root_response(), 10_000);
        var resolvedAt = Set.of("RESOLVED", "CLOSED").contains(status)
            ? Timestamp.from(clock.instant())
            : null;

        jdbcTemplate.update(
            """
                UPDATE system_support_tickets
                SET status = ?, priority = ?, root_response = ?, last_updated_by_user_id = ?, resolved_at = ?
                WHERE id = ?
                """,
            status,
            priority,
            rootResponse,
            actorUserId,
            resolvedAt,
            ticketId
        );
        addEvent(ticketId, actorUserId, "ROOT_UPDATED", current.status(), status, rootResponse);
        return findById(ticketId);
    }

    private TicketWorkspace workspace(Long distributorCompanyId, String rawQuery, String rawStatus, String rawType) {
        var allTickets = loadTickets(distributorCompanyId);
        var query = normalize(rawQuery);
        var status = normalizeFilter(rawStatus, STATUSES, true);
        var type = normalizeFilter(rawType, TYPES, false);
        var filtered = allTickets.stream()
            .filter(ticket -> query.isBlank()
                || normalize(ticket.folio()).contains(query)
                || normalize(ticket.title()).contains(query)
                || normalize(ticket.module()).contains(query)
                || normalize(ticket.distributor_name()).contains(query))
            .filter(ticket -> "ALL".equals(status)
                || ("ACTIVE".equals(status) && ACTIVE_STATUSES.contains(ticket.status()))
                || status.equals(ticket.status()))
            .filter(ticket -> "ALL".equals(type) || type.equals(ticket.type()))
            .toList();
        var summary = new Summary(
            allTickets.size(),
            (int) allTickets.stream().filter(ticket -> ACTIVE_STATUSES.contains(ticket.status())).count(),
            (int) allTickets.stream().filter(ticket -> "IN_REVIEW".equals(ticket.status())).count(),
            (int) allTickets.stream().filter(ticket -> "PLANNED".equals(ticket.status())).count(),
            (int) allTickets.stream().filter(ticket -> Set.of("RESOLVED", "CLOSED").contains(ticket.status())).count()
        );
        return new TicketWorkspace(summary, filtered, filtered.size());
    }

    private List<Ticket> loadTickets(Long distributorCompanyId) {
        var scopeSql = distributorCompanyId == null ? "" : "WHERE ticket.distributor_company_id = ?";
        var sql = """
            SELECT ticket.id, ticket.folio, ticket.distributor_company_id,
                   distributor.name AS distributor_name, ticket.reported_by_user_id,
                   COALESCE(NULLIF(reporter.full_name, ''), reporter.email) AS reporter_name,
                   reporter.email AS reporter_email, ticket.ticket_type, ticket.priority,
                   ticket.module_name, ticket.title, ticket.description, ticket.status,
                   ticket.root_response, ticket.resolved_at, ticket.created_at, ticket.updated_at
            FROM system_support_tickets ticket
            JOIN companies distributor ON distributor.id = ticket.distributor_company_id
            JOIN users reporter ON reporter.id = ticket.reported_by_user_id
            """ + scopeSql + """
            ORDER BY
                CASE ticket.status
                    WHEN 'OPEN' THEN 1 WHEN 'IN_REVIEW' THEN 2 WHEN 'PLANNED' THEN 3
                    WHEN 'RESOLVED' THEN 4 ELSE 5
                END,
                CASE ticket.priority
                    WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4
                END,
                ticket.updated_at DESC,
                ticket.id DESC
            LIMIT 1000
            """;
        return distributorCompanyId == null
            ? jdbcTemplate.query(sql, this::mapTicket)
            : jdbcTemplate.query(sql, this::mapTicket, distributorCompanyId);
    }

    private Ticket findVisible(String folio, long distributorCompanyId) {
        return jdbcTemplate.query(
            ticketSelect() + " WHERE ticket.folio = ? AND ticket.distributor_company_id = ? LIMIT 1",
            this::mapTicket,
            folio,
            distributorCompanyId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("System ticket was not found."));
    }

    private Ticket findById(long ticketId) {
        return jdbcTemplate.query(
            ticketSelect() + " WHERE ticket.id = ? LIMIT 1",
            this::mapTicket,
            ticketId
        ).stream().findFirst().orElseThrow(() -> new NoSuchElementException("System ticket was not found."));
    }

    private String ticketSelect() {
        return """
            SELECT ticket.id, ticket.folio, ticket.distributor_company_id,
                   distributor.name AS distributor_name, ticket.reported_by_user_id,
                   COALESCE(NULLIF(reporter.full_name, ''), reporter.email) AS reporter_name,
                   reporter.email AS reporter_email, ticket.ticket_type, ticket.priority,
                   ticket.module_name, ticket.title, ticket.description, ticket.status,
                   ticket.root_response, ticket.resolved_at, ticket.created_at, ticket.updated_at
            FROM system_support_tickets ticket
            JOIN companies distributor ON distributor.id = ticket.distributor_company_id
            JOIN users reporter ON reporter.id = ticket.reported_by_user_id
            """;
    }

    private Ticket mapTicket(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new Ticket(
            rs.getLong("id"),
            rs.getString("folio"),
            rs.getLong("distributor_company_id"),
            rs.getString("distributor_name"),
            rs.getLong("reported_by_user_id"),
            rs.getString("reporter_name"),
            rs.getString("reporter_email"),
            rs.getString("ticket_type"),
            rs.getString("priority"),
            rs.getString("module_name"),
            rs.getString("title"),
            rs.getString("description"),
            rs.getString("status"),
            rs.getString("root_response"),
            instant(rs.getTimestamp("resolved_at")),
            instant(rs.getTimestamp("created_at")),
            instant(rs.getTimestamp("updated_at"))
        );
    }

    private void addEvent(long ticketId, long actorUserId, String eventType, String previousStatus, String newStatus, String note) {
        jdbcTemplate.update(
            """
                INSERT INTO system_support_ticket_events (
                    ticket_id, actor_user_id, event_type, previous_status, new_status, note
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
            ticketId,
            actorUserId,
            eventType,
            previousStatus,
            newStatus,
            note
        );
    }

    private String createFolio() {
        var suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        return "SYS-" + FOLIO_DATE.format(clock.instant()) + "-" + suffix;
    }

    private long requireActorUserId(AuthSessionUser actor) {
        if (actor == null || actor.userId() == null) {
            throw new IllegalArgumentException("Authenticated user is required.");
        }
        return actor.userId();
    }

    private String requireAllowed(String value, Set<String> allowed, String field) {
        var normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) {
            throw new IllegalArgumentException("Invalid " + field + ".");
        }
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

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    public record CreateRequest(String type, String priority, String module, String title, String description) {
    }

    public record UpdateRequest(String status, String priority, String root_response) {
    }

    public record TicketWorkspace(Summary summary, List<Ticket> tickets, int matching_tickets) {
    }

    public record Summary(int total, int active, int in_review, int planned, int completed) {
    }

    public record Ticket(
        long id,
        String folio,
        long distributor_company_id,
        String distributor_name,
        long reported_by_user_id,
        String reporter_name,
        String reporter_email,
        String type,
        String priority,
        String module,
        String title,
        String description,
        String status,
        String root_response,
        Instant resolved_at,
        Instant created_at,
        Instant updated_at
    ) {
    }
}
