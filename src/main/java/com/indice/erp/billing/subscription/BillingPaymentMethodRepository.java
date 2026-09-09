package com.indice.erp.billing.subscription;

import java.util.Objects;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Resolves only the authenticated company's billing identities; ambiguous identities fail closed. */
@Repository
class BillingPaymentMethodRepository {
    private final JdbcTemplate jdbc;

    BillingPaymentMethodRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    Identity find(long companyId) {
        var customers = jdbc.queryForList("""
            SELECT stripe_customer_id FROM company_billing_customers
            WHERE company_id = ? AND status = 'ACTIVE'
            """, String.class, companyId);
        var subscriptions = jdbc.query("""
            SELECT stripe_subscription_id, stripe_customer_id
            FROM company_billing_subscriptions
            WHERE company_id = ? AND LEFT(stripe_subscription_id, 4) = 'sub_'
              AND UPPER(status) NOT IN ('CANCELED', 'INCOMPLETE_EXPIRED')
            ORDER BY last_event_created_at DESC, id DESC
            LIMIT 2
            """, (rs, row) -> new Identity(rs.getString("stripe_customer_id"),
                rs.getString("stripe_subscription_id"), false), companyId);
        if (customers.size() > 1 || subscriptions.size() > 1) return new Identity(null, null, true);
        var subscription = subscriptions.isEmpty() ? null : subscriptions.getFirst();
        var customerId = customers.isEmpty() ? (subscription == null ? null : subscription.customerId()) : customers.getFirst();
        if (subscription != null && !Objects.equals(customerId, subscription.customerId())) {
            return new Identity(null, null, true);
        }
        return new Identity(customerId, subscription == null ? null : subscription.subscriptionId(), false);
    }

    record Identity(String customerId, String subscriptionId, boolean ambiguous) {}
}
