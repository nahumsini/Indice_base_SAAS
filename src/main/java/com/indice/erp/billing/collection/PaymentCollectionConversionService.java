package com.indice.erp.billing.collection;

import com.indice.erp.entitlement.CompanyEntitlementProjectionService;
import com.indice.erp.platformadmin.PlatformAdminService;
import java.sql.Timestamp;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Completes the local subscription replacement only after the bound payment was verified. */
@Service
public class PaymentCollectionConversionService {
    private final JdbcTemplate jdbc;
    private final CompanyEntitlementProjectionService entitlements;
    private final PlatformAdminService productAccess;

    public PaymentCollectionConversionService(JdbcTemplate jdbc, CompanyEntitlementProjectionService entitlements,
                                             PlatformAdminService productAccess) {
        this.jdbc = jdbc;
        this.entitlements = entitlements;
        this.productAccess = productAccess;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void completeVerifiedActivation(long companyId, long requestId) {
        var sources = jdbc.query("""
            SELECT source_subscription_id, paid_at
            FROM company_payment_requests
            WHERE company_id = ? AND id = ? AND kind = 'ACTIVATION' AND status = 'PAID' AND paid_at IS NOT NULL
            FOR UPDATE
            """, (rs, n) -> new Source(rs.getString(1), rs.getTimestamp(2)), companyId, requestId);
        if (sources.isEmpty()) return;
        var source = sources.getFirst();
        if (source.subscriptionId() != null
            && (source.subscriptionId().startsWith("internal_") || source.subscriptionId().startsWith("legacy_"))) {
            var products = jdbc.query("""
                SELECT selected.catalog_product_id
                FROM company_billing_subscriptions subscription
                JOIN company_billing_subscription_products selected ON selected.subscription_id = subscription.id
                WHERE subscription.company_id = ? AND subscription.stripe_subscription_id = ?
                """, (rs, n) -> rs.getLong(1), companyId, source.subscriptionId());
            jdbc.update("""
                UPDATE company_billing_subscriptions
                SET status = 'canceled', canceled_at = COALESCE(canceled_at, ?), cancel_at_period_end = 0,
                    projection_version = projection_version + 1
                WHERE company_id = ? AND stripe_subscription_id = ?
                  AND LOWER(status) NOT IN ('canceled', 'incomplete_expired')
                """, source.paidAt(), companyId, source.subscriptionId());
            // This existing contract preserves shared/new module sources and revokes only obsolete access.
            products.forEach(productId -> productAccess.synchronizeProductModuleAccess(companyId, productId));
        }
        // Keep the old products and all provider/event history. Only the effective projection is rebuilt.
        entitlements.refreshIfEnrolled(companyId);
    }

    private record Source(String subscriptionId, Timestamp paidAt) {}
}
