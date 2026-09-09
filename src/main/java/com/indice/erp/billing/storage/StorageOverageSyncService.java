package com.indice.erp.billing.storage;

import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.catalog.SubscriptionCatalogPriceResolver;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class StorageOverageSyncService {

    private static final int BATCH_SIZE = 100;

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final StripeStorageGateway stripe;
    private final StripePhaseTwoProperties stripeProperties;
    private final SubscriptionCatalogPriceResolver contractPrices;
    private final Clock clock;

    public StorageOverageSyncService(
        JdbcTemplate jdbc,
        TransactionTemplate transactions,
        StripeStorageGateway stripe,
        StripePhaseTwoProperties stripeProperties,
        SubscriptionCatalogPriceResolver contractPrices,
        Clock clock
    ) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.stripe = stripe;
        this.stripeProperties = stripeProperties;
        this.contractPrices = contractPrices;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${app.billing.storage.overage-sync-delay-ms:60000}")
    public int synchronizePending() {
        if (!stripeProperties.isEnabled()) return 0;
        var companyIds = jdbc.query(
            """
                SELECT company_id
                FROM company_storage_overage_syncs
                WHERE (
                    (status IN ('PENDING', 'FAILED') AND next_attempt_at <= CURRENT_TIMESTAMP(6))
                    OR (status = 'PROCESSING' AND updated_at <= TIMESTAMPADD(MINUTE, -10, CURRENT_TIMESTAMP(6)))
                )
                ORDER BY next_attempt_at, company_id
                LIMIT ?
                """,
            (rs, rowNum) -> rs.getLong(1),
            BATCH_SIZE
        );
        var completed = 0;
        for (var companyId : companyIds) {
            if (synchronizeCompany(companyId)) completed++;
        }
        return completed;
    }

    boolean synchronizeCompany(long companyId) {
        Prepared prepared;
        try {
            prepared = transactions.execute(status -> prepare(companyId));
        } catch (RuntimeException exception) {
            fail(companyId, exception);
            return false;
        }
        if (prepared == null) return false;
        if (prepared.alreadySynced()) return true;
        try {
            var result = stripe.setBlockQuantity(
                new StripeStorageGateway.Command(
                    prepared.subscriptionId(), prepared.subscriptionItemId(),
                    prepared.priceId(), prepared.targetBlocks()
                ),
                "indice-storage-overage-" + prepared.reference() + "-" + prepared.targetBlocks()
            );
            if (result == null || result.quantity() != prepared.targetBlocks()
                    || result.subscriptionItemId() == null || result.subscriptionItemId().isBlank()) {
                throw new IllegalStateException("Stripe returned an unexpected storage-block quantity.");
            }
            transactions.executeWithoutResult(status -> complete(companyId, prepared, result));
            return true;
        } catch (RuntimeException exception) {
            fail(companyId, exception);
            return false;
        }
    }

    private Prepared prepare(long companyId) {
        var sync = jdbc.query(
            """
                SELECT public_reference, target_blocks, synced_blocks, status
                FROM company_storage_overage_syncs
                WHERE company_id = ? FOR UPDATE
                """,
            (rs, rowNum) -> new SyncRow(
                rs.getString(1), rs.getInt(2), rs.getInt(3), rs.getString(4)
            ),
            companyId
        ).stream().findFirst().orElse(null);
        if (sync == null) return null;
        if (sync.syncedBlocks() >= sync.targetBlocks()) {
            jdbc.update(
                "UPDATE company_storage_overage_syncs SET status = 'SYNCED', completed_at = CURRENT_TIMESTAMP(6) WHERE company_id = ?",
                companyId
            );
            return new Prepared(sync.reference(), null, null, null, sync.targetBlocks(), true);
        }
        var subscription = activeSubscription(companyId);
        // Quantity updates preserve the Price already attached to an existing Stripe item.
        var priceId = subscription.subscriptionItemId() == null || subscription.subscriptionItemId().isBlank()
            ? contractPrices.resolve(companyId, subscription.subscriptionId(), "storage_block", subscription.billingInterval())
            : null;
        jdbc.update(
            """
                UPDATE company_storage_overage_syncs
                SET status = 'PROCESSING', attempt_count = attempt_count + 1,
                    stripe_subscription_id = ?, stripe_subscription_item_id = ?,
                    last_error_code = NULL, last_error_message = NULL
                WHERE company_id = ?
                """,
            subscription.subscriptionId(), subscription.subscriptionItemId(), companyId
        );
        return new Prepared(
            sync.reference(), subscription.subscriptionId(), subscription.subscriptionItemId(),
            priceId, sync.targetBlocks(), false
        );
    }

    private Subscription activeSubscription(long companyId) {
        return jdbc.query(
            """
                SELECT stripe_subscription_id, stripe_storage_item_id, billing_interval
                FROM company_billing_subscriptions
                WHERE company_id = ? AND LOWER(status) IN ('trialing', 'active', 'past_due')
                ORDER BY id DESC LIMIT 1 FOR UPDATE
                """,
            (rs, rowNum) -> new Subscription(rs.getString(1), rs.getString(2), rs.getString(3)),
            companyId
        ).stream().findFirst().orElseThrow(() -> new IllegalStateException(
            "An active Stripe subscription is required to bill storage overage."
        ));
    }

    private void complete(
        long companyId,
        Prepared prepared,
        StripeStorageGateway.Result result
    ) {
        var currentTarget = jdbc.queryForObject(
            "SELECT target_blocks FROM company_storage_overage_syncs WHERE company_id = ? FOR UPDATE",
            Integer.class,
            companyId
        );
        var pendingAgain = currentTarget != null && currentTarget > prepared.targetBlocks();
        jdbc.update(
            """
                UPDATE company_storage_overage_syncs
                SET synced_blocks = GREATEST(synced_blocks, ?),
                    status = ?, stripe_subscription_item_id = ?,
                    next_attempt_at = CURRENT_TIMESTAMP(6),
                    completed_at = CASE WHEN ? THEN NULL ELSE CURRENT_TIMESTAMP(6) END
                WHERE company_id = ?
                """,
            prepared.targetBlocks(), pendingAgain ? "PENDING" : "SYNCED",
            result.subscriptionItemId(), pendingAgain, companyId
        );
        jdbc.update(
            """
                UPDATE company_billing_subscriptions
                SET stripe_storage_item_id = ?
                WHERE company_id = ? AND stripe_subscription_id = ?
                """,
            result.subscriptionItemId(), companyId, prepared.subscriptionId()
        );
    }

    private void fail(long companyId, RuntimeException exception) {
        var message = exception.getMessage() == null ? exception.getClass().getSimpleName() : exception.getMessage();
        jdbc.update(
            """
                UPDATE company_storage_overage_syncs
                SET status = 'FAILED', last_error_code = ?, last_error_message = ?,
                    next_attempt_at = ?
                WHERE company_id = ? AND status <> 'SYNCED'
                """,
            exception.getClass().getSimpleName(), truncate(message, 500),
            Timestamp.from(clock.instant().plus(Duration.ofMinutes(5))), companyId
        );
    }

    private String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private record SyncRow(String reference, int targetBlocks, int syncedBlocks, String status) {}
    private record Subscription(String subscriptionId, String subscriptionItemId, String billingInterval) {}
    private record Prepared(
        String reference,
        String subscriptionId,
        String subscriptionItemId,
        String priceId,
        int targetBlocks,
        boolean alreadySynced
    ) {}
}
