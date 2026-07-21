package com.indice.erp.billing.storage;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.platformadmin.PlatformAuditService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class StorageBlockPurchaseService {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactions;
    private final StripeStorageGateway stripe;
    private final StripePhaseTwoProperties stripeProperties;
    private final StorageQuotaService storage;
    private final PlatformAuditService audit;

    public StorageBlockPurchaseService(
        JdbcTemplate jdbcTemplate,
        TransactionTemplate transactions,
        StripeStorageGateway stripe,
        StripePhaseTwoProperties stripeProperties,
        StorageQuotaService storage,
        PlatformAuditService audit
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactions = transactions;
        this.stripe = stripe;
        this.stripeProperties = stripeProperties;
        this.storage = storage;
        this.audit = audit;
    }

    public Map<String, Object> snapshot(long companyId, long actorUserId) {
        requireOwner(companyId, actorUserId);
        return toMap(storage.snapshot(companyId));
    }

    public Map<String, Object> setPurchasedBlocks(
        long companyId, long actorUserId, int target, String idempotencyKey
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("Idempotency-Key is required.");
        }
        if (target < 0 || target > 100_000) {
            throw new IllegalArgumentException("purchased_blocks must be between 0 and 100000.");
        }
        var fingerprint = BillingHashing.sha256(companyId + ":storage:" + target);
        var prepared = transactions.execute(status -> prepare(
            companyId, actorUserId, target, idempotencyKey.trim(), fingerprint));
        if (prepared == null) throw new IllegalStateException("The storage mutation could not be prepared.");
        if (prepared.completed()) return result(prepared.reference(), storage.snapshot(companyId), true);
        try {
            var stripeResult = stripe.setBlockQuantity(
                new StripeStorageGateway.Command(prepared.subscriptionId(), prepared.subscriptionItemId(),
                    prepared.priceId(), target),
                "indice-storage-" + prepared.reference());
            validateStripeResult(prepared, stripeResult);
            transactions.executeWithoutResult(status -> complete(prepared, stripeResult));
            audit.record(actorUserId, "STORAGE_BLOCKS_CHANGED", "COMPANY", Long.toString(companyId), companyId,
                "SUCCESS", Map.of("prior", prepared.prior(), "target", target,
                    "reference", prepared.reference()));
            return result(prepared.reference(), storage.snapshot(companyId), false);
        } catch (RuntimeException exception) {
            transactions.executeWithoutResult(status -> fail(prepared.reference(), exception));
            audit.record(actorUserId, "STORAGE_BLOCKS_CHANGE_FAILED", "COMPANY", Long.toString(companyId),
                companyId, "FAILED", Map.of("target", target, "reference", prepared.reference()));
            throw exception;
        }
    }

    private Prepared prepare(long companyId, long actorUserId, int target,
                             String idempotencyKey, String fingerprint) {
        requireOwner(companyId, actorUserId);
        var hash = BillingHashing.sha256(idempotencyKey);
        var existing = jdbcTemplate.query(
            """
                SELECT public_reference, request_fingerprint, prior_blocks, target_blocks,
                       status, stripe_subscription_id, stripe_subscription_item_id
                FROM company_storage_mutations WHERE idempotency_key_hash = ? FOR UPDATE
                """,
            (rs, rowNum) -> new Prepared(rs.getString("public_reference"), rs.getInt("prior_blocks"),
                rs.getInt("target_blocks"), rs.getString("stripe_subscription_id"),
                rs.getString("stripe_subscription_item_id"), null,
                "COMPLETED".equals(rs.getString("status")), rs.getString("request_fingerprint")),
            hash).stream().findFirst().orElse(null);
        if (existing != null) {
            if (!fingerprint.equals(existing.fingerprint())) {
                throw new IllegalStateException("Idempotency-Key was already used for another storage quantity.");
            }
            if (existing.completed()) return existing;
        }
        var state = jdbcTemplate.query(
            "SELECT purchased_blocks FROM company_storage_states WHERE company_id = ? FOR UPDATE",
            (rs, rowNum) -> rs.getInt(1), companyId).stream().findFirst()
            .orElseThrow(() -> new IllegalStateException(
                "This company has not been enrolled in premium storage management."));
        var snapshot = storage.snapshot(companyId);
        var proposedLimit = limitAfter(snapshot, target);
        if (snapshot.usedAndReservedBytes() > proposedLimit) {
            throw new StorageQuotaExceededException(
                "The new storage quantity is below the company's current usage.", snapshot);
        }
        var subscription = jdbcTemplate.query(
            """
                SELECT stripe_subscription_id, stripe_storage_item_id, billing_interval
                FROM company_billing_subscriptions
                WHERE company_id = ? AND LOWER(status) IN ('trialing', 'active', 'past_due')
                ORDER BY id DESC LIMIT 1 FOR UPDATE
                """,
            (rs, rowNum) -> new String[]{rs.getString(1), rs.getString(2), rs.getString(3)},
            companyId).stream().findFirst()
            .orElseThrow(() -> new IllegalStateException("An active Stripe subscription is required."));
        var priceId = stripeProperties.priceId("storage_block", subscription[2]);
        if (target > 0 && (priceId == null || priceId.isBlank())) {
            throw new IllegalStateException(
                "The Stripe storage-block price is not configured for this billing interval.");
        }
        if (existing != null) {
            jdbcTemplate.update(
                "UPDATE company_storage_mutations SET status = 'PROCESSING', failure_code = NULL, failure_message = NULL WHERE public_reference = ?",
                existing.reference());
            return new Prepared(existing.reference(), existing.prior(), target, subscription[0], subscription[1],
                priceId, false, fingerprint);
        }
        var reference = UUID.randomUUID().toString().replace("-", "");
        jdbcTemplate.update(
            """
                INSERT INTO company_storage_mutations (
                    public_reference, company_id, idempotency_key_hash, request_fingerprint,
                    prior_blocks, target_blocks, status, stripe_subscription_id,
                    stripe_subscription_item_id, actor_user_id
                ) VALUES (?, ?, ?, ?, ?, ?, 'PROCESSING', ?, ?, ?)
                """,
            reference, companyId, hash, fingerprint, state, target,
            subscription[0], subscription[1], actorUserId);
        return new Prepared(reference, state, target, subscription[0], subscription[1], priceId, false, fingerprint);
    }

    private void complete(Prepared prepared, StripeStorageGateway.Result stripeResult) {
        var mutation = jdbcTemplate.query(
            "SELECT company_id, status FROM company_storage_mutations WHERE public_reference = ? FOR UPDATE",
            (rs, rowNum) -> new Object[]{rs.getLong(1), rs.getString(2)}, prepared.reference())
            .stream().findFirst().orElseThrow(() -> new IllegalStateException("Storage mutation not found."));
        if ("COMPLETED".equals(mutation[1])) return;
        var companyId = (Long) mutation[0];
        jdbcTemplate.update(
            "UPDATE company_storage_states SET purchased_blocks = ?, version = version + 1 WHERE company_id = ?",
            prepared.target(), companyId);
        jdbcTemplate.update(
            "UPDATE company_billing_subscriptions SET stripe_storage_item_id = ? WHERE company_id = ? AND stripe_subscription_id = ?",
            stripeResult.subscriptionItemId(), companyId, prepared.subscriptionId());
        jdbcTemplate.update(
            "UPDATE company_storage_mutations SET status = 'COMPLETED', stripe_subscription_item_id = ?, completed_at = CURRENT_TIMESTAMP(6) WHERE public_reference = ?",
            stripeResult.subscriptionItemId(), prepared.reference());
    }

    private void fail(String reference, RuntimeException exception) {
        jdbcTemplate.update(
            "UPDATE company_storage_mutations SET status = 'FAILED', failure_code = ?, failure_message = ? WHERE public_reference = ? AND status <> 'COMPLETED'",
            exception.getClass().getSimpleName(), truncate(exception.getMessage(), 500), reference);
    }

    private void validateStripeResult(Prepared prepared, StripeStorageGateway.Result stripeResult) {
        if (stripeResult == null || stripeResult.quantity() != prepared.target()) {
            throw new IllegalStateException("Stripe returned a storage quantity different from the requested value.");
        }
        if (prepared.target() > 0
                && (stripeResult.subscriptionItemId() == null || stripeResult.subscriptionItemId().isBlank())) {
            throw new IllegalStateException("Stripe did not return the storage subscription item.");
        }
    }

    private long limitAfter(StorageQuotaService.StorageSnapshot snapshot, int target) {
        try {
            return Math.addExact(snapshot.includedBytes(), Math.multiplyExact(snapshot.blockBytes(),
                (long) target + snapshot.benefitBlocks()));
        } catch (ArithmeticException ignored) {
            return Long.MAX_VALUE;
        }
    }

    private void requireOwner(long companyId, long actorUserId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM company_ownerships WHERE company_id = ? AND owner_user_id = ? AND status = 'ACTIVE'",
            Integer.class, companyId, actorUserId);
        if (count == null || count == 0) {
            throw new StoragePurchaseForbiddenException(
                "Only the account owner can change purchased storage blocks.");
        }
    }

    private Map<String, Object> result(String reference, StorageQuotaService.StorageSnapshot snapshot,
                                       boolean replay) {
        var result = new LinkedHashMap<>(toMap(snapshot));
        result.put("mutation_reference", reference);
        result.put("idempotent_replay", replay);
        return result;
    }

    private Map<String, Object> toMap(StorageQuotaService.StorageSnapshot snapshot) {
        var result = new LinkedHashMap<String, Object>();
        result.put("company_id", snapshot.companyId());
        result.put("enforced", snapshot.enforced());
        result.put("metered", snapshot.metered());
        result.put("included_bytes", snapshot.includedBytes());
        result.put("block_bytes", snapshot.blockBytes());
        result.put("purchased_blocks", snapshot.purchasedBlocks());
        result.put("benefit_blocks", snapshot.benefitBlocks());
        result.put("limit_bytes", snapshot.limitBytes());
        result.put("used_bytes", snapshot.usedBytes());
        result.put("reserved_bytes", snapshot.reservedBytes());
        result.put("available_bytes", snapshot.availableBytes());
        result.put("alert_level", alertLevel(snapshot));
        return result;
    }

    private String alertLevel(StorageQuotaService.StorageSnapshot snapshot) {
        if (!snapshot.metered() || snapshot.limitBytes() <= 0) return "NONE";
        var percent = (snapshot.usedAndReservedBytes() * 100.0d) / snapshot.limitBytes();
        if (percent >= 100) return "LIMIT";
        if (percent >= 90) return "CRITICAL";
        if (percent >= 80) return "WARNING";
        return "NONE";
    }

    private String truncate(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max);
    }

    private record Prepared(String reference, int prior, int target, String subscriptionId,
                            String subscriptionItemId, String priceId, boolean completed,
                            String fingerprint) {}
}
