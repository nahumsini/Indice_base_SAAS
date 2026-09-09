package com.indice.erp.billing.collection;

import static com.indice.erp.billing.collection.PaymentCollectionContracts.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PaymentCollectionRepository {
    private final JdbcTemplate jdbc;
    public PaymentCollectionRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Company company(long companyId, boolean lock) {
        return jdbc.query("SELECT name, platform_status, public_demo_enabled FROM companies WHERE id = ?" + (lock ? " FOR UPDATE" : ""),
            (rs, n) -> new Company(rs.getString(1), rs.getString(2), rs.getBoolean(3)), companyId)
            .stream().findFirst().orElseThrow(() -> new NoSuchElementException("Company not found."));
    }

    public OwnerRow owner(long companyId) {
        return jdbc.query("""
            SELECT u.id, COALESCE(u.full_name, ''), u.email
            FROM company_ownerships o
            JOIN user_companies m ON m.id = o.owner_user_company_id AND m.user_id = o.owner_user_id
              AND m.company_id = o.company_id AND LOWER(COALESCE(m.status, 'active')) = 'active'
            JOIN users u ON u.id = o.owner_user_id
            WHERE o.company_id = ? AND o.status = 'ACTIVE'
            """, (rs, n) -> new OwnerRow(rs.getLong(1), rs.getString(2), rs.getString(3)), companyId)
            .stream().findFirst().orElse(null);
    }

    public void requireMember(long companyId, long userId) {
        var count = jdbc.queryForObject("""
            SELECT COUNT(*) FROM user_companies WHERE company_id = ? AND user_id = ?
              AND LOWER(COALESCE(status, 'active')) = 'active'
            """, Integer.class, companyId, userId);
        if (count == null || count == 0) throw new SecurityException("An active company membership is required.");
    }

    public Row latest(long companyId, boolean lock) {
        return jdbc.query("SELECT * FROM company_payment_requests WHERE company_id = ? ORDER BY id DESC LIMIT 1"
            + (lock ? " FOR UPDATE" : ""), this::row, companyId).stream().findFirst().orElse(null);
    }
    public Row find(long companyId, long id, boolean lock) {
        return jdbc.query("SELECT * FROM company_payment_requests WHERE company_id = ? AND id = ?"
            + (lock ? " FOR UPDATE" : ""), this::row, companyId, id).stream().findFirst().orElse(null);
    }
    public Long replay(long companyId, String eventKey, String fingerprint) {
        return jdbc.query("""
            SELECT request_id, request_fingerprint FROM company_payment_request_events WHERE company_id = ? AND event_key = ?
            """, (rs, n) -> {
                if (!fingerprint.equals(rs.getString(2))) throw new PaymentCollectionException("IDEMPOTENCY_CONFLICT", "This action key was already used for a different request.");
                return rs.getLong(1);
            }, companyId, eventKey).stream().findFirst().orElse(null);
    }
    public long insert(long companyId, long actorId, String reference, String reason, OwnerRow owner,
                       PaymentCollectionPaymentService.Quote quote, Instant now, Instant deadline) {
        jdbc.update("""
            INSERT INTO company_payment_requests
              (public_reference, company_id, kind, started_at, deadline_at, reason, payer_name, payer_email,
               amount_cents, currency, billing_interval, catalog_version_id, stripe_mode,
               source_customer_id, source_subscription_id, quote_token, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, reference, companyId, quote.kind(), ts(now), ts(deadline), reason, owner.name(), owner.email(),
            quote.amountCents(), quote.currency(), quote.billingInterval(), quote.catalogVersionId(), quote.stripeMode(),
            quote.sourceCustomerId(), quote.sourceSubscriptionId(), quote.fingerprint(), actorId);
        return jdbc.queryForObject("SELECT id FROM company_payment_requests WHERE company_id = ? AND public_reference = ?", Long.class, companyId, reference);
    }
    public void extend(Row row, String reason, Instant now, Instant deadline) {
        jdbc.update("""
            UPDATE company_payment_requests SET window_version = window_version + 1, started_at = ?, deadline_at = ?, reason = ?
            WHERE company_id = ? AND id = ? AND status = 'OPEN' AND window_version = ?
            """, ts(now), ts(deadline), reason, row.companyId(), row.id(), row.version());
    }
    public void event(Row row, String action, Long actorId, String reason, String key, String fingerprint, Instant now) {
        jdbc.update("""
            INSERT IGNORE INTO company_payment_request_events
              (request_id, company_id, action, window_version, actor_user_id, reason, deadline_at, event_key, request_fingerprint, occurred_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, row.id(), row.companyId(), action, row.version(), actorId, reason, ts(row.deadline()), key, fingerprint, ts(now));
    }
    public void markPaid(Row row, Instant now) {
        jdbc.update("UPDATE company_payment_requests SET status = 'PAID', paid_at = ? WHERE company_id = ? AND id = ? AND status = 'OPEN'",
            ts(now), row.companyId(), row.id());
        jdbc.update("""
            UPDATE company_payment_request_deliveries SET status = 'SKIPPED', last_error = 'REQUEST_CLOSED', lease_token = NULL, lease_until = NULL
            WHERE company_id = ? AND request_id = ? AND status IN ('PENDING', 'PROCESSING', 'FAILED')
            """, row.companyId(), row.id());
    }
    public List<Delivery> deliveries(long companyId, long id) {
        return jdbc.query("""
            SELECT scheduled_at, status, delivered_at, channel, attempt_count FROM company_payment_request_deliveries
            WHERE company_id = ? AND request_id = ? ORDER BY scheduled_at DESC, id DESC LIMIT 100
            """, (rs, n) -> new Delivery(instant(rs, 1), rs.getString(2), instant(rs, 3), rs.getString(4), rs.getInt(5)), companyId, id);
    }
    public List<History> history(long companyId, long id) {
        return jdbc.query("""
            SELECT e.action, u.full_name, e.reason, e.occurred_at, e.deadline_at FROM company_payment_request_events e
            LEFT JOIN users u ON u.id = e.actor_user_id
            WHERE e.company_id = ? AND e.request_id = ? ORDER BY e.id DESC LIMIT 100
            """, (rs, n) -> new History(rs.getString(1), rs.getString(2), rs.getString(3), instant(rs, 4), instant(rs, 5)), companyId, id);
    }
    public List<Row> openRequests(Instant now) {
        return jdbc.query("SELECT * FROM company_payment_requests WHERE status = 'OPEN' AND next_check_at <= ? ORDER BY next_check_at, id LIMIT 100", this::row, ts(now));
    }
    public boolean claimReconciliation(Row row, Instant now) {
        return jdbc.update("""
            UPDATE company_payment_requests SET next_check_at = ?
            WHERE company_id = ? AND id = ? AND status = 'OPEN' AND next_check_at <= ?
            """, ts(now.plusSeconds(300)), row.companyId(), row.id(), ts(now)) == 1;
    }
    public boolean independentHold(long companyId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM company_commercial_states WHERE company_id = ?
              AND (state IN ('SUSPENDED', 'RETENTION', 'PURGE_PENDING') OR reason_code IN ('SUBSCRIPTION_CANCELED', 'PAYMENT_DISPUTED')))
            """, Boolean.class, companyId));
    }
    private Row row(ResultSet rs, int n) throws SQLException {
        return new Row(rs.getLong("id"), rs.getLong("company_id"), rs.getString("public_reference"), rs.getString("kind"),
            rs.getString("status"), rs.getInt("window_version"), rs.getTimestamp("started_at").toInstant(),
            rs.getTimestamp("deadline_at").toInstant(), rs.getString("reason"), rs.getLong("amount_cents"),
            rs.getString("currency"), rs.getString("billing_interval"),
            rs.getTimestamp("paid_at") == null ? null : rs.getTimestamp("paid_at").toInstant());
    }
    private static Instant instant(ResultSet rs, int col) throws SQLException { var value = rs.getTimestamp(col); return value == null ? null : value.toInstant(); }
    static Timestamp ts(Instant value) { return value == null ? null : Timestamp.from(value); }
    public record Company(String name, String status, boolean publicDemo) { }
    public record OwnerRow(long userId, String name, String email) { }
    public record Row(long id, long companyId, String reference, String kind, String status, int version,
                      Instant startedAt, Instant deadline, String reason, long amountCents, String currency,
                      String billingInterval, Instant paidAt) {
        public boolean open() { return "OPEN".equals(status); }
        public Request dto() { return new Request(reference, kind, status, version, startedAt, deadline, reason, amountCents, currency, billingInterval, paidAt, false); }
    }
}
