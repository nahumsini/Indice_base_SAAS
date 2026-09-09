package com.indice.erp.billing.collection;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
public class PaymentRequestReminderRepository {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final PaymentCollectionProtectionService protections;

    public PaymentRequestReminderRepository(JdbcTemplate jdbc, TransactionTemplate transactions,
                                            PaymentCollectionProtectionService protections) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.protections = protections;
    }

    public void enqueueWindow(long companyId, long requestId) {
        transactions.executeWithoutResult(tx -> {
            var request = request(companyId, requestId);
            if (request == null || !"OPEN".equals(request.status())) return;
            jdbc.update("""
                UPDATE company_payment_request_deliveries
                SET status = 'SKIPPED', last_error = 'WINDOW_REPLACED', lease_token = NULL, lease_until = NULL
                WHERE company_id = ? AND request_id = ? AND window_version <> ?
                  AND status IN ('PENDING', 'PROCESSING', 'FAILED')
                """, companyId, requestId, request.windowVersion());
            var owner = owner(companyId);
            for (var slot = 0; slot < 7; slot++) {
                var scheduled = request.startedAt().plus(slot, ChronoUnit.DAYS);
                if (!scheduled.isBefore(request.deadlineAt())) break;
                for (var channel : List.of("EMAIL", "IN_APP")) {
                    jdbc.update("""
                        INSERT IGNORE INTO company_payment_request_deliveries
                            (company_id, request_id, window_version, slot_index, channel,
                             recipient_user_id, recipient_user_company_id, status, scheduled_at, next_attempt_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
                        """, companyId, requestId, request.windowVersion(), slot, channel,
                        owner == null ? null : owner.userId(), owner == null ? null : owner.membershipId(),
                        ts(scheduled), ts(scheduled));
                }
            }
        });
    }

    public List<Candidate> due(Instant now, boolean emailEnabled) {
        return jdbc.query("""
            SELECT id, company_id, request_id
            FROM company_payment_request_deliveries
            WHERE ((status IN ('PENDING', 'FAILED') AND next_attempt_at <= ?)
                OR (status = 'PROCESSING' AND lease_until <= ?))
              AND (channel = 'IN_APP' OR ? = TRUE)
            ORDER BY next_attempt_at, id LIMIT 100
            """, (rs, n) -> new Candidate(rs.getLong(1), rs.getLong(2), rs.getLong(3)),
            ts(now), ts(now), emailEnabled);
    }

    public Claim claim(Candidate candidate, Instant now) {
        return transactions.execute(tx -> {
            var request = request(candidate.companyId(), candidate.requestId());
            var delivery = delivery(candidate);
            if (delivery == null || !claimable(delivery, now)) return null;
            var obsolete = obsolete(request, delivery, now);
            if (obsolete != null) {
                skip(candidate, obsolete);
                return null;
            }
            var token = UUID.randomUUID().toString().replace("-", "");
            jdbc.update("""
                UPDATE company_payment_request_deliveries
                SET status = 'PROCESSING', lease_token = ?, lease_until = ?, attempt_count = attempt_count + 1
                WHERE id = ? AND company_id = ? AND request_id = ?
                """, token, ts(now.plusSeconds(120)), candidate.id(), candidate.companyId(), candidate.requestId());
            return new Claim(candidate, delivery.windowVersion(), delivery.slot(), delivery.channel(), token,
                delivery.attempts() + 1);
        });
    }

    /** Locks the request before the delivery, matching create/extend/settlement lock order. */
    public Dispatch prepareDispatch(Claim claim, Instant now) {
        return transactions.execute(tx -> {
            var candidate = claim.candidate();
            var request = request(candidate.companyId(), candidate.requestId());
            var delivery = delivery(candidate);
            if (!ownsLease(delivery, claim, now)) return null;
            var obsolete = obsolete(request, delivery, now);
            if (obsolete != null) {
                skip(candidate, obsolete);
                return null;
            }
            var protection = protections.collectionProtection(candidate.companyId());
            if (protection.indefiniteBenefit()) {
                skip(candidate, "INDEFINITE_BENEFIT_ACTIVE");
                return null;
            }
            var owner = owner(candidate.companyId());
            if (owner == null) {
                fail(candidate, "OWNER_UNAVAILABLE", now.plusSeconds(300));
                return null;
            }
            jdbc.update("""
                UPDATE company_payment_request_deliveries
                SET recipient_user_id = ?, recipient_user_company_id = ?
                WHERE id = ? AND company_id = ? AND request_id = ? AND lease_token = ?
                """, owner.userId(), owner.membershipId(), candidate.id(), candidate.companyId(),
                candidate.requestId(), claim.leaseToken());
            var deadline = protection.protectedUntil() != null && protection.protectedUntil().isAfter(request.deadlineAt())
                ? protection.protectedUntil() : request.deadlineAt();
            return new Dispatch(claim, request.reference(), owner, deadline,
                request.amountCents(), request.currency());
        });
    }

    public void complete(Claim claim, Instant now, boolean sent, String providerReference, String errorCode) {
        transactions.executeWithoutResult(tx -> {
            var candidate = claim.candidate();
            var request = request(candidate.companyId(), candidate.requestId());
            var delivery = delivery(candidate);
            if (!ownsLease(delivery, claim, now)) return;
            var obsolete = obsolete(request, delivery, now);
            if (obsolete != null) {
                skip(candidate, obsolete);
                return;
            }
            if (sent) {
                jdbc.update("""
                    UPDATE company_payment_request_deliveries
                    SET status = 'SENT', delivered_at = ?, provider_reference = ?, last_error = NULL,
                        lease_token = NULL, lease_until = NULL
                    WHERE id = ? AND company_id = ? AND request_id = ? AND lease_token = ?
                    """, ts(now), safeReference(providerReference), candidate.id(), candidate.companyId(),
                    candidate.requestId(), claim.leaseToken());
            } else {
                // Retries remain bounded by this slot's day and the collection window.
                var delay = Math.min(3600L, 60L << Math.min(claim.attempts() - 1, 6));
                fail(candidate, safeCode(errorCode), now.plusSeconds(delay));
            }
        });
    }

    private Request request(long companyId, long requestId) {
        // Company -> request -> delivery matches administration and settlement, including FK writes.
        jdbc.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, companyId);
        return jdbc.query("""
            SELECT public_reference, status, window_version, started_at, deadline_at, amount_cents, currency
            FROM company_payment_requests WHERE id = ? AND company_id = ? FOR UPDATE
            """, (rs, n) -> new Request(rs.getString(1), rs.getString(2), rs.getInt(3),
            rs.getTimestamp(4).toInstant(), rs.getTimestamp(5).toInstant(), rs.getLong(6), rs.getString(7)),
            requestId, companyId).stream().findFirst().orElse(null);
    }

    private Delivery delivery(Candidate candidate) {
        return jdbc.query("""
            SELECT window_version, slot_index, channel, status, scheduled_at, next_attempt_at,
                   lease_token, lease_until, attempt_count
            FROM company_payment_request_deliveries
            WHERE id = ? AND company_id = ? AND request_id = ? FOR UPDATE
            """, (rs, n) -> new Delivery(rs.getInt(1), rs.getInt(2), rs.getString(3), rs.getString(4),
            rs.getTimestamp(5).toInstant(), rs.getTimestamp(6).toInstant(), rs.getString(7),
            rs.getTimestamp(8) == null ? null : rs.getTimestamp(8).toInstant(), rs.getInt(9)),
            candidate.id(), candidate.companyId(), candidate.requestId()).stream().findFirst().orElse(null);
    }

    private Owner owner(long companyId) {
        return jdbc.query("""
            SELECT ownership.owner_user_id, ownership.owner_user_company_id, users.email,
                   COALESCE(users.full_name, ''), companies.name
            FROM company_ownerships ownership
            JOIN user_companies membership ON membership.id = ownership.owner_user_company_id
              AND membership.company_id = ownership.company_id AND membership.user_id = ownership.owner_user_id
              AND LOWER(COALESCE(membership.status, 'active')) = 'active'
            JOIN users ON users.id = ownership.owner_user_id
            JOIN companies ON companies.id = ownership.company_id
            WHERE ownership.company_id = ? AND ownership.status = 'ACTIVE'
            """, (rs, n) -> new Owner(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getString(5)),
            companyId).stream().findFirst().orElse(null);
    }

    private boolean claimable(Delivery delivery, Instant now) {
        return (List.of("PENDING", "FAILED").contains(delivery.status()) && !delivery.nextAttemptAt().isAfter(now))
            || ("PROCESSING".equals(delivery.status()) && delivery.leaseUntil() != null
                && !delivery.leaseUntil().isAfter(now));
    }

    private boolean ownsLease(Delivery delivery, Claim claim, Instant now) {
        return delivery != null && "PROCESSING".equals(delivery.status())
            && claim.windowVersion() == delivery.windowVersion()
            && claim.leaseToken().equals(delivery.leaseToken())
            && delivery.leaseUntil() != null && delivery.leaseUntil().isAfter(now);
    }

    private String obsolete(Request request, Delivery delivery, Instant now) {
        if (request == null || !"OPEN".equals(request.status())) return "REQUEST_CLOSED";
        if (request.windowVersion() != delivery.windowVersion()) return "WINDOW_REPLACED";
        if (!request.deadlineAt().isAfter(now)) return "WINDOW_EXPIRED";
        // A restarted worker must not send several missed daily reminders together.
        if (!delivery.scheduledAt().plus(1, ChronoUnit.DAYS).isAfter(now)) return "SLOT_EXPIRED";
        return null;
    }

    private void skip(Candidate candidate, String reason) {
        jdbc.update("""
            UPDATE company_payment_request_deliveries
            SET status = 'SKIPPED', last_error = ?, lease_token = NULL, lease_until = NULL
            WHERE id = ? AND company_id = ? AND request_id = ?
            """, reason, candidate.id(), candidate.companyId(), candidate.requestId());
    }

    private void fail(Candidate candidate, String code, Instant retryAt) {
        jdbc.update("""
            UPDATE company_payment_request_deliveries
            SET status = 'FAILED', last_error = ?, next_attempt_at = ?, lease_token = NULL, lease_until = NULL
            WHERE id = ? AND company_id = ? AND request_id = ?
            """, code, ts(retryAt), candidate.id(), candidate.companyId(), candidate.requestId());
    }

    private String safeCode(String code) {
        return code != null && code.matches("[A-Z][A-Z0-9_]{0,79}") ? code : "DELIVERY_FAILED";
    }

    private String safeReference(String reference) {
        return reference != null && reference.matches("[A-Za-z0-9_.:@-]{1,200}") ? reference : null;
    }

    private Timestamp ts(Instant instant) { return Timestamp.from(instant); }

    public record Candidate(long id, long companyId, long requestId) {}
    public record Claim(Candidate candidate, int windowVersion, int slot, String channel, String leaseToken, int attempts) {}
    public record Owner(long userId, long membershipId, String email, String name, String companyName) {}
    public record Dispatch(Claim claim, String reference, Owner owner, Instant deadlineAt, long amountCents, String currency) {
        public String deliveryKey() {
            return "payment-request." + claim.candidate().requestId() + "." + claim.windowVersion() + "." + claim.slot();
        }
    }
    private record Request(String reference, String status, int windowVersion, Instant startedAt,
                           Instant deadlineAt, long amountCents, String currency) {}
    private record Delivery(int windowVersion, int slot, String channel, String status, Instant scheduledAt,
                            Instant nextAttemptAt, String leaseToken, Instant leaseUntil, int attempts) {}
}
