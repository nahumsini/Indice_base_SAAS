package com.indice.erp.billing.subscription;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class BillingInvoiceHistoryRepository {

    private final JdbcTemplate jdbcTemplate;

    BillingInvoiceHistoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<BillingInvoiceResponse> findByCompanyId(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT stripe_invoice_id, status, currency, amount_due_cents, amount_paid_cents,
                       hosted_invoice_url, invoice_pdf_url, period_starts_at, period_ends_at, updated_at
                FROM billing_invoice_snapshots
                WHERE company_id = ?
                ORDER BY updated_at DESC, id DESC
                LIMIT 50
                """,
            (rs, rowNum) -> new BillingInvoiceResponse(
                rs.getString("stripe_invoice_id"),
                rs.getString("status"),
                rs.getString("currency"),
                rs.getObject("amount_due_cents", Long.class),
                rs.getObject("amount_paid_cents", Long.class),
                rs.getString("hosted_invoice_url"),
                rs.getString("invoice_pdf_url"),
                instant(rs.getTimestamp("period_starts_at")),
                instant(rs.getTimestamp("period_ends_at")),
                instant(rs.getTimestamp("updated_at"))
            ),
            companyId
        );
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
