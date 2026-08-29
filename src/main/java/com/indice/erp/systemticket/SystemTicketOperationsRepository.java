package com.indice.erp.systemticket;

import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Assignee;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Event;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Ticket;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SystemTicketOperationsRepository {

    private static final Set<String> ACTIVE_STATUSES = Set.of(
        "OPEN", "IN_REVIEW", "WAITING_ON_REPORTER", "PLANNED"
    );

    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    SystemTicketOperationsRepository(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    List<Ticket> listTickets(Long distributorCompanyId) {
        var scopeSql = distributorCompanyId == null ? "" : "WHERE ticket.distributor_company_id = ?\n";
        var sql = ticketSelect() + scopeSql + """
            ORDER BY
                CASE WHEN ticket.target_resolution_at < CURRENT_TIMESTAMP(6)
                          AND ticket.status IN ('OPEN', 'IN_REVIEW', 'WAITING_ON_REPORTER', 'PLANNED') THEN 0 ELSE 1 END,
                CASE ticket.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                ticket.updated_at DESC,
                ticket.id DESC
            LIMIT 1000
            """;
        return distributorCompanyId == null
            ? jdbcTemplate.query(sql, this::mapTicket)
            : jdbcTemplate.query(sql, this::mapTicket, distributorCompanyId);
    }

    Ticket findTicket(long ticketId, Long distributorCompanyId) {
        var scoped = distributorCompanyId == null
            ? " WHERE ticket.id = ? LIMIT 1"
            : " WHERE ticket.id = ? AND ticket.distributor_company_id = ? LIMIT 1";
        var rows = distributorCompanyId == null
            ? jdbcTemplate.query(ticketSelect() + scoped, this::mapTicket, ticketId)
            : jdbcTemplate.query(ticketSelect() + scoped, this::mapTicket, ticketId, distributorCompanyId);
        return rows.stream().findFirst()
            .orElseThrow(() -> new NoSuchElementException("System ticket was not found."));
    }

    List<Event> listEvents(long ticketId, boolean publicOnly) {
        var visibilitySql = publicOnly ? " AND event.visibility = 'PUBLIC'" : "";
        return jdbcTemplate.query(
            """
                SELECT event.id, event.event_type, event.visibility, event.previous_status,
                       event.new_status, event.note, event.created_at,
                       COALESCE(NULLIF(actor.full_name, ''), actor.email) AS actor_name,
                       actor.email AS actor_email
                FROM system_support_ticket_events event
                JOIN users actor ON actor.id = event.actor_user_id
                WHERE event.ticket_id = ?
                """ + visibilitySql + " ORDER BY event.created_at ASC, event.id ASC",
            (rs, rowNum) -> new Event(
                rs.getLong("id"), rs.getString("event_type"), rs.getString("visibility"),
                rs.getString("actor_name"), rs.getString("actor_email"),
                rs.getString("previous_status"), rs.getString("new_status"), rs.getString("note"),
                instant(rs.getTimestamp("created_at"))
            ),
            ticketId
        );
    }

    List<Assignee> listAssignees() {
        return jdbcTemplate.query(
            """
                SELECT DISTINCT administrator.user_id,
                       COALESCE(NULLIF(account_user.full_name, ''), account_user.email) AS name,
                       account_user.email
                FROM platform_administrators administrator
                JOIN users account_user ON account_user.id = administrator.user_id
                LEFT JOIN platform_administrator_permissions permission
                  ON permission.platform_administrator_id = administrator.id
                 AND permission.permission_code = 'SYSTEM_TICKETS_MANAGE'
                WHERE administrator.status = 'ACTIVE'
                  AND (administrator.platform_role = 'PLATFORM_ROOT' OR permission.permission_code IS NOT NULL)
                ORDER BY name, account_user.email
                """,
            (rs, rowNum) -> new Assignee(rs.getLong("user_id"), rs.getString("name"), rs.getString("email"))
        );
    }

    void updateWorkflow(
        long ticketId,
        long actorUserId,
        String status,
        String priority,
        String rootResponse,
        Instant firstRespondedAt,
        Instant targetResolutionAt,
        Instant resolvedAt,
        boolean reopening
    ) {
        jdbcTemplate.update(
            """
                UPDATE system_support_tickets
                SET status = ?, priority = ?, root_response = ?, last_updated_by_user_id = ?,
                    first_responded_at = ?, target_resolution_at = ?, resolved_at = ?,
                    reopened_count = reopened_count + ?
                WHERE id = ?
                """,
            status, priority, rootResponse, actorUserId, timestamp(firstRespondedAt),
            timestamp(targetResolutionAt), timestamp(resolvedAt), reopening ? 1 : 0, ticketId
        );
    }

    void assign(long ticketId, long actorUserId, Long assigneeUserId, String status) {
        jdbcTemplate.update(
            """
                UPDATE system_support_tickets
                SET assigned_to_user_id = ?, status = ?, last_updated_by_user_id = ?
                WHERE id = ?
                """,
            assigneeUserId, status, actorUserId, ticketId
        );
    }

    void addRootMessage(long ticketId, long actorUserId, String message, Instant firstResponseAt) {
        jdbcTemplate.update(
            """
                UPDATE system_support_tickets
                SET root_response = ?, first_responded_at = COALESCE(first_responded_at, ?),
                    last_updated_by_user_id = ?
                WHERE id = ?
                """,
            message, Timestamp.from(firstResponseAt), actorUserId, ticketId
        );
    }

    void acknowledgeReporterMessage(
        long ticketId,
        long distributorCompanyId,
        long actorUserId,
        String nextStatus,
        boolean reopening
    ) {
        jdbcTemplate.update(
            """
                UPDATE system_support_tickets
                SET status = ?, resolved_at = NULL, reopened_count = reopened_count + ?,
                    last_updated_by_user_id = ?
                WHERE id = ? AND distributor_company_id = ?
                """,
            nextStatus, reopening ? 1 : 0, actorUserId, ticketId, distributorCompanyId
        );
    }

    void addEvent(
        long ticketId,
        long actorUserId,
        String eventType,
        String visibility,
        String previousStatus,
        String newStatus,
        String note
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO system_support_ticket_events (
                    ticket_id, actor_user_id, event_type, visibility, previous_status, new_status, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
            ticketId, actorUserId, eventType, visibility, previousStatus, newStatus, note
        );
    }

    List<AttachmentRow> listAttachments(long ticketId) {
        return jdbcTemplate.query(
            """
                SELECT attachment.id, attachment.original_filename, attachment.mime_type,
                       attachment.size_bytes, attachment.object_key, attachment.created_at,
                       COALESCE(NULLIF(uploader.full_name, ''), uploader.email) AS uploaded_by
                FROM system_support_ticket_attachments attachment
                JOIN users uploader ON uploader.id = attachment.uploaded_by_user_id
                WHERE attachment.ticket_id = ?
                ORDER BY attachment.created_at ASC, attachment.id ASC
                """,
            (rs, rowNum) -> new AttachmentRow(
                rs.getLong("id"), rs.getString("original_filename"), rs.getString("mime_type"),
                rs.getLong("size_bytes"), rs.getString("object_key"), rs.getString("uploaded_by"),
                instant(rs.getTimestamp("created_at"))
            ),
            ticketId
        );
    }

    AttachmentRow insertAttachment(
        long ticketId,
        long distributorCompanyId,
        long actorUserId,
        String fileName,
        String mimeType,
        long sizeBytes,
        String objectKey
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO system_support_ticket_attachments (
                    ticket_id, distributor_company_id, uploaded_by_user_id,
                    original_filename, mime_type, size_bytes, object_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
            ticketId, distributorCompanyId, actorUserId, fileName, mimeType, sizeBytes, objectKey
        );
        return listAttachments(ticketId).stream()
            .filter(row -> row.objectKey().equals(objectKey))
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Ticket attachment was not found."));
    }

    private String ticketSelect() {
        return """
            SELECT ticket.id, ticket.folio, ticket.distributor_company_id,
                   distributor.name AS distributor_name, ticket.reported_by_user_id,
                   COALESCE(NULLIF(reporter.full_name, ''), reporter.email) AS reporter_name,
                   reporter.email AS reporter_email, ticket.assigned_to_user_id,
                   COALESCE(NULLIF(assignee.full_name, ''), assignee.email) AS assignee_name,
                   assignee.email AS assignee_email, ticket.ticket_type, ticket.priority,
                   ticket.module_name, ticket.title, ticket.description, ticket.status,
                   ticket.root_response, ticket.first_responded_at, ticket.target_resolution_at,
                   ticket.reopened_count, ticket.resolved_at, ticket.created_at, ticket.updated_at
            FROM system_support_tickets ticket
            JOIN companies distributor ON distributor.id = ticket.distributor_company_id
            JOIN users reporter ON reporter.id = ticket.reported_by_user_id
            LEFT JOIN users assignee ON assignee.id = ticket.assigned_to_user_id
            """;
    }

    private Ticket mapTicket(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        var target = instant(rs.getTimestamp("target_resolution_at"));
        var status = rs.getString("status");
        var now = clock.instant();
        var overdue = target != null && target.isBefore(now) && ACTIVE_STATUSES.contains(status);
        return new Ticket(
            rs.getLong("id"), rs.getString("folio"), rs.getLong("distributor_company_id"),
            rs.getString("distributor_name"), rs.getLong("reported_by_user_id"),
            rs.getString("reporter_name"), rs.getString("reporter_email"),
            rs.getObject("assigned_to_user_id", Long.class), rs.getString("assignee_name"),
            rs.getString("assignee_email"), rs.getString("ticket_type"), rs.getString("priority"),
            rs.getString("module_name"), rs.getString("title"), rs.getString("description"), status,
            rs.getString("root_response"), instant(rs.getTimestamp("first_responded_at")), target,
            rs.getInt("reopened_count"), overdue,
            target == null ? null : Duration.between(now, target).toMinutes(),
            instant(rs.getTimestamp("resolved_at")), instant(rs.getTimestamp("created_at")),
            instant(rs.getTimestamp("updated_at"))
        );
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    record AttachmentRow(
        long id,
        String fileName,
        String mimeType,
        long sizeBytes,
        String objectKey,
        String uploadedBy,
        Instant createdAt
    ) {
    }
}
