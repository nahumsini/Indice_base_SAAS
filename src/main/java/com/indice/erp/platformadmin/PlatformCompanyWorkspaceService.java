package com.indice.erp.platformadmin;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Company-scoped read models for the platform support workspace. */
@Service
public class PlatformCompanyWorkspaceService {
    private final JdbcTemplate jdbc;
    private final PlatformAdminAccessService access;

    public PlatformCompanyWorkspaceService(JdbcTemplate jdbc, PlatformAdminAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public InvoicePage invoices(long actorUserId, long companyId, int requestedPage, int requestedSize) {
        authorize(actorUserId, companyId);
        var total = count("SELECT COUNT(*) FROM billing_invoice_snapshots WHERE company_id = ?", companyId);
        var pagination = pagination(total, requestedPage, requestedSize);
        var invoices = jdbc.query("""
            SELECT stripe_invoice_id, status, currency, amount_due_cents, amount_paid_cents,
                   hosted_invoice_url, invoice_pdf_url, period_starts_at, period_ends_at, updated_at
            FROM billing_invoice_snapshots
            WHERE company_id = ?
            ORDER BY updated_at DESC, id DESC
            LIMIT ? OFFSET ?
            """, (rs, index) -> new Invoice(
                rs.getString("stripe_invoice_id"), rs.getString("status"), rs.getString("currency"),
                rs.getObject("amount_due_cents", Long.class), rs.getObject("amount_paid_cents", Long.class),
                rs.getString("hosted_invoice_url"), rs.getString("invoice_pdf_url"),
                instant(rs, "period_starts_at"), instant(rs, "period_ends_at"), instant(rs, "updated_at")
            ), companyId, pagination.page_size(), offset(pagination));
        return new InvoicePage(companyId, invoices, pagination);
    }

    @Transactional(readOnly = true)
    public HistoryPage history(long actorUserId, long companyId, int requestedPage, int requestedSize) {
        authorize(actorUserId, companyId);
        long total = count("SELECT COUNT(*) FROM platform_audit_events WHERE company_id = ?", companyId)
            + count("SELECT COUNT(*) FROM billing_audit_events WHERE company_id = ?", companyId)
            + count("SELECT COUNT(*) FROM user_login_audit WHERE company_id = ?", companyId);
        var pagination = pagination(total, requestedPage, requestedSize);
        // Scope every branch before combining events. Never expose raw audit payloads,
        // login metadata, tokens or payment material in this support presentation.
        var events = jdbc.query("""
            SELECT event.*, actor.full_name AS actor_name
            FROM (
                SELECT id, 'PLATFORM' AS source, actor_user_id,
                       CONVERT(action_code USING utf8mb4) COLLATE utf8mb4_unicode_ci AS action,
                       CONVERT(outcome USING utf8mb4) COLLATE utf8mb4_unicode_ci AS outcome,
                       CONVERT(JSON_UNQUOTE(JSON_EXTRACT(detail_json, '$.reason')) USING utf8mb4)
                           COLLATE utf8mb4_unicode_ci AS reason,
                       occurred_at
                FROM platform_audit_events WHERE company_id = ?
                UNION ALL
                SELECT id, 'BILLING', actor_user_id,
                       CONVERT(action_code USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                       CONVERT(outcome USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                       CONVERT(JSON_UNQUOTE(JSON_EXTRACT(detail_json, '$.reason')) USING utf8mb4)
                           COLLATE utf8mb4_unicode_ci,
                       occurred_at
                FROM billing_audit_events WHERE company_id = ?
                UNION ALL
                SELECT id, 'AUTH', user_id,
                       CONVERT(CONCAT(event_type, ':', stage) USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                       CONVERT(outcome USING utf8mb4) COLLATE utf8mb4_unicode_ci,
                       NULL, created_at
                FROM user_login_audit WHERE company_id = ?
            ) event
            LEFT JOIN users actor ON actor.id = event.actor_user_id
            ORDER BY event.occurred_at DESC, event.source, event.id DESC
            LIMIT ? OFFSET ?
            """, (rs, index) -> new HistoryEvent(
                rs.getString("source") + ":" + rs.getLong("id"), rs.getString("source"),
                rs.getString("action"), rs.getString("outcome"), rs.getString("actor_name"),
                rs.getString("reason"), instant(rs, "occurred_at")
            ), companyId, companyId, companyId, pagination.page_size(), offset(pagination));
        return new HistoryPage(companyId, events, pagination);
    }

    private void authorize(long actorUserId, long companyId) {
        access.require(actorUserId, "PLATFORM_VIEW");
        if (companyId <= 0 || count("SELECT COUNT(*) FROM companies WHERE id = ?", companyId) == 0) {
            throw new NoSuchElementException("Company not found.");
        }
    }

    private long count(String sql, long companyId) {
        var count = jdbc.queryForObject(sql, Long.class, companyId);
        return count == null ? 0 : count;
    }

    static Pagination pagination(long total, int requestedPage, int requestedSize) {
        int size = Math.max(1, Math.min(requestedSize, 100));
        long pages = Math.max(1L, (total + size - 1) / size);
        int page = (int) Math.min(Math.max(1, requestedPage), pages);
        return new Pagination(page, size, total, pages);
    }

    private static long offset(Pagination pagination) {
        return (long) (pagination.page() - 1) * pagination.page_size();
    }

    private static Instant instant(ResultSet rs, String field) throws SQLException {
        var timestamp = rs.getTimestamp(field);
        return timestamp == null ? null : timestamp.toInstant();
    }

    public record Pagination(int page, int page_size, long total_items, long total_pages) {}
    public record Invoice(String invoice_id, String status, String currency, Long amount_due_cents,
        Long amount_paid_cents, String hosted_invoice_url, String invoice_pdf_url,
        Instant period_starts_at, Instant period_ends_at, Instant updated_at) {}
    public record InvoicePage(long company_id, List<Invoice> invoices, Pagination pagination) {}
    public record HistoryEvent(String id, String source, String action, String outcome,
        String actor_name, String reason, Instant occurred_at) {}
    public record HistoryPage(long company_id, List<HistoryEvent> events, Pagination pagination) {}
}
