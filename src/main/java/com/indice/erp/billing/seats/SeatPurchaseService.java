package com.indice.erp.billing.seats;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.catalog.SubscriptionCatalogPriceResolver;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class SeatPurchaseService {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactions;
    private final StripeSeatGateway stripe;
    private final SubscriptionCatalogPriceResolver contractPrices;
    private final SeatService seats;
    private final PlatformAuditService audit;

    public SeatPurchaseService(JdbcTemplate jdbcTemplate, TransactionTemplate transactions,
                               StripeSeatGateway stripe, SubscriptionCatalogPriceResolver contractPrices,
                               SeatService seats, PlatformAuditService audit) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactions = transactions;
        this.stripe = stripe;
        this.contractPrices = contractPrices;
        this.seats = seats;
        this.audit = audit;
    }

    public Map<String, Object> snapshot(long companyId, long actorUserId) {
        requireOwner(companyId, actorUserId);
        return toMap(seats.snapshot(companyId));
    }

    public Map<String, Object> setExtraSeats(long companyId, long actorUserId, int target,
                                             String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key is required.");
        }
        if (target < 0 || target > 100_000) {
            throw new IllegalArgumentException("extra_seats must be between 0 and 100000.");
        }
        var fingerprint = BillingHashing.sha256(companyId + ":" + target);
        var prepared = transactions.execute(status -> prepare(companyId, actorUserId, target,
            idempotencyKey.trim(), fingerprint));
        if (prepared == null) {
            throw new IllegalStateException("The seat mutation could not be prepared.");
        }
        if (prepared.completed()) {
            return result(prepared.reference(), seats.snapshot(companyId), true, chargeTiming(companyId));
        }
        try {
            var stripeResult = stripe.setExtraSeatQuantity(
                new StripeSeatGateway.Command(prepared.subscriptionId(), prepared.subscriptionItemId(),
                    prepared.priceId(), target),
                "indice-seat-" + prepared.reference()
            );
            transactions.executeWithoutResult(status -> complete(prepared, stripeResult));
            audit.record(actorUserId, "EXTRA_SEATS_CHANGED", "COMPANY", Long.toString(companyId), companyId,
                "SUCCESS", Map.of(
                    "prior", prepared.prior(),
                    "target", target,
                    "reference", prepared.reference(),
                    "charge_timing", chargeTiming(companyId),
                    "proration_behavior", "none"
                ));
            return result(prepared.reference(), seats.snapshot(companyId), false, chargeTiming(companyId));
        } catch (RuntimeException exception) {
            transactions.executeWithoutResult(status -> fail(prepared.reference(), exception));
            audit.record(actorUserId, "EXTRA_SEATS_CHANGE_FAILED", "COMPANY", Long.toString(companyId), companyId,
                "FAILED", Map.of("target", target, "reference", prepared.reference()));
            throw exception;
        }
    }

    private Prepared prepare(long companyId, long actorUserId, int target, String idempotencyKey,
                             String fingerprint) {
        requireOwner(companyId, actorUserId);
        var hash = BillingHashing.sha256(idempotencyKey);
        var existing = jdbcTemplate.query(
            """
                SELECT public_reference, request_fingerprint, prior_extra_seats, target_extra_seats,
                       status, stripe_subscription_id, stripe_subscription_item_id
                FROM company_seat_mutations WHERE idempotency_key_hash = ? FOR UPDATE
                """,
            (rs, rowNum) -> new Prepared(
                rs.getString("public_reference"), rs.getInt("prior_extra_seats"),
                rs.getInt("target_extra_seats"), rs.getString("stripe_subscription_id"),
                rs.getString("stripe_subscription_item_id"), null,
                "COMPLETED".equals(rs.getString("status")), rs.getString("request_fingerprint")
            ), hash
        ).stream().findFirst().orElse(null);
        if (existing != null) {
            if (!fingerprint.equals(existing.fingerprint())) {
                throw new IllegalStateException("Idempotency-Key was already used for another seat quantity.");
            }
            if (existing.completed()) return existing;
        }
        var state = jdbcTemplate.query(
            "SELECT included_seats, purchased_extra_seats FROM company_seat_states WHERE company_id = ? FOR UPDATE",
            (rs, rowNum) -> new int[]{rs.getInt(1), rs.getInt(2)}, companyId
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException(
            "This company has not been enrolled in premium seat management."
        ));
        var snapshot = seats.snapshot(companyId);
        var limitAfter = state[0] + target + snapshot.benefitExtra();
        if (snapshot.usedAndReserved() > limitAfter) {
            throw new SeatCapacityExceededException(
                "The new seat quantity is below current members and pending invitations.", snapshot
            );
        }
        var subscription = jdbcTemplate.query(
            """
                SELECT stripe_subscription_id, stripe_extra_seat_item_id, billing_interval
                FROM company_billing_subscriptions
                WHERE company_id = ? AND LOWER(status) IN ('trialing', 'active', 'past_due')
                ORDER BY id DESC LIMIT 1 FOR UPDATE
                """,
            (rs, rowNum) -> new String[]{rs.getString(1), rs.getString(2), rs.getString(3)}, companyId
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("An active Stripe subscription is required."));
        // Existing Stripe items retain their agreed Price; only a new item needs a catalog lookup.
        var priceId = target > 0 && (subscription[1] == null || subscription[1].isBlank())
            ? contractPrices.resolve(companyId, subscription[0], "extra_seat", subscription[2])
            : null;
        if (existing != null) {
            jdbcTemplate.update(
                "UPDATE company_seat_mutations SET status = 'PROCESSING', failure_code = NULL, failure_message = NULL WHERE public_reference = ?",
                existing.reference()
            );
            return new Prepared(existing.reference(), existing.prior(), target, subscription[0], subscription[1],
                priceId, false, fingerprint);
        }
        var reference = UUID.randomUUID().toString().replace("-", "");
        jdbcTemplate.update(
            """
                INSERT INTO company_seat_mutations (
                    public_reference, company_id, idempotency_key_hash, request_fingerprint,
                    prior_extra_seats, target_extra_seats, status, stripe_subscription_id,
                    stripe_subscription_item_id, actor_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, 'PROCESSING', ?, ?, ?)
                """,
            reference, companyId, hash, fingerprint, state[1], target, subscription[0], subscription[1], actorUserId
        );
        return new Prepared(reference, state[1], target, subscription[0], subscription[1], priceId, false, fingerprint);
    }

    private void complete(Prepared prepared, StripeSeatGateway.Result stripeResult) {
        var mutation = jdbcTemplate.query(
            "SELECT company_id, status FROM company_seat_mutations WHERE public_reference = ? FOR UPDATE",
            (rs, rowNum) -> new Object[]{rs.getLong(1), rs.getString(2)}, prepared.reference()
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException("Seat mutation not found."));
        if ("COMPLETED".equals(mutation[1])) return;
        var companyId = (Long) mutation[0];
        jdbcTemplate.update(
            "UPDATE company_seat_states SET purchased_extra_seats = ?, version = version + 1 WHERE company_id = ?",
            prepared.target(), companyId
        );
        jdbcTemplate.update(
            """
                UPDATE company_billing_subscriptions
                SET extra_seats = ?, stripe_extra_seat_item_id = ?
                WHERE company_id = ? AND stripe_subscription_id = ?
                """,
            prepared.target(), stripeResult.subscriptionItemId(), companyId, prepared.subscriptionId()
        );
        jdbcTemplate.update(
            """
                UPDATE company_seat_mutations
                SET status = 'COMPLETED', stripe_subscription_item_id = ?, completed_at = CURRENT_TIMESTAMP(6)
                WHERE public_reference = ?
                """,
            stripeResult.subscriptionItemId(), prepared.reference()
        );
    }

    private void fail(String reference, RuntimeException exception) {
        jdbcTemplate.update(
            """
                UPDATE company_seat_mutations
                SET status = 'FAILED', failure_code = ?, failure_message = ?
                WHERE public_reference = ? AND status <> 'COMPLETED'
                """,
            exception.getClass().getSimpleName(), truncate(exception.getMessage(), 500), reference
        );
    }

    private void requireOwner(long companyId, long actorUserId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM company_ownerships WHERE company_id = ? AND owner_user_id = ? AND status = 'ACTIVE'",
            Integer.class, companyId, actorUserId
        );
        if (count == null || count == 0) {
            throw new SeatPurchaseForbiddenException("Only the account owner can change purchased seats.");
        }
    }

    private Map<String, Object> result(
        String reference,
        SeatService.SeatSnapshot snapshot,
        boolean replay,
        String chargeTiming
    ) {
        var result = new LinkedHashMap<>(toMap(snapshot));
        result.put("mutation_reference", reference);
        result.put("idempotent_replay", replay);
        result.put("change_timing", chargeTiming);
        result.put("charged_now", false);
        return result;
    }

    private String chargeTiming(long companyId) {
        return jdbcTemplate.query(
            "SELECT status FROM company_billing_subscriptions WHERE company_id = ? ORDER BY id DESC LIMIT 1",
            (rs, rowNum) -> "TRIALING".equalsIgnoreCase(rs.getString(1)) ? "TRIAL_END" : "NEXT_INVOICE",
            companyId
        ).stream().findFirst().orElse("PAYMENT_METHOD_REQUIRED");
    }

    private Map<String, Object> toMap(SeatService.SeatSnapshot snapshot) {
        var result = new LinkedHashMap<String, Object>();
        result.put("company_id", snapshot.companyId());
        result.put("enforced", snapshot.enforced());
        result.put("included", snapshot.included());
        result.put("purchased_extra", snapshot.purchasedExtra());
        result.put("benefit_extra", snapshot.benefitExtra());
        result.put("limit", snapshot.limit());
        result.put("active", snapshot.active());
        result.put("reserved", snapshot.reserved());
        result.put("available", snapshot.available());
        return result;
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max);
    }

    private record Prepared(String reference, int prior, int target, String subscriptionId,
                            String subscriptionItemId, String priceId, boolean completed, String fingerprint) {}
}
