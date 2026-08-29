package com.indice.erp.billing.portal;

import com.indice.erp.billing.BillingHashing;
import com.indice.erp.billing.lifecycle.CommercialLifecycleService;
import com.indice.erp.billing.stripe.StripePhaseTwoProperties;
import com.indice.erp.billing.stripe.StripePhaseTwoUnavailableException;
import com.indice.erp.billing.stripe.StripeSecretProvider;
import com.indice.erp.billing.subscription.BillingAccountAuthorityService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class BillingRecoveryService {

    private final JdbcTemplate jdbc;
    private final CommercialLifecycleService lifecycle;
    private final StripePhaseTwoProperties stripe;
    private final StripeSecretProvider stripeSecrets;
    private final StripeCustomerPortalGateway portal;
    private final BillingAccountAuthorityService billingAuthority;

    public BillingRecoveryService(JdbcTemplate jdbc, CommercialLifecycleService lifecycle,
                                  StripePhaseTwoProperties stripe, StripeSecretProvider stripeSecrets,
                                  StripeCustomerPortalGateway portal,
                                  BillingAccountAuthorityService billingAuthority) {
        this.jdbc = jdbc;
        this.lifecycle = lifecycle;
        this.stripe = stripe;
        this.stripeSecrets = stripeSecrets;
        this.portal = portal;
        this.billingAuthority = billingAuthority;
    }

    public Map<String, Object> snapshot(long companyId, long userId) {
        requireMembership(companyId, userId);
        var body = new LinkedHashMap<String, Object>();
        body.put("enrolled", lifecycle.snapshot(companyId).isPresent());
        body.put("lifecycle", lifecycle.snapshot(companyId).orElse(null));
        body.put("can_manage_billing", billingAuthority.isOwner(companyId, userId));
        body.put("portal_available", stripeSecrets.isApiConfigured() && !stripe.getPortalReturnUrl().isBlank()
            && customerId(companyId) != null);
        return body;
    }

    public Map<String, Object> createPortal(long companyId, long userId, String idempotencyKey) {
        requireOwner(companyId, userId);
        if (!stripeSecrets.isApiConfigured() || stripe.getPortalReturnUrl().isBlank()) {
            throw new StripePhaseTwoUnavailableException("Billing recovery portal is not configured.");
        }
        var customerId = customerId(companyId);
        if (customerId == null) throw new NoSuchElementException("No Stripe customer is associated with this company.");
        var effectiveKey = idempotencyKey == null || idempotencyKey.isBlank()
            ? "portal-" + BillingHashing.randomReference()
            : "portal-" + companyId + "-" + BillingHashing.sha256(idempotencyKey.trim());
        var result = portal.create(customerId, stripe.getPortalReturnUrl(), effectiveKey);
        return Map.of("url", result.url());
    }

    private String customerId(long companyId) {
        var rows = jdbc.query(
            """
                SELECT stripe_customer_id FROM company_billing_customers
                WHERE company_id = ? AND status = 'ACTIVE'
                ORDER BY id DESC LIMIT 1
                """,
            (rs, rowNum) -> rs.getString(1), companyId);
        if (!rows.isEmpty()) return rows.getFirst();
        var subscriptions = jdbc.query(
            """
                SELECT stripe_customer_id FROM company_billing_subscriptions
                WHERE company_id = ? AND stripe_customer_id IS NOT NULL
                ORDER BY id DESC LIMIT 1
                """,
            (rs, rowNum) -> rs.getString(1), companyId);
        return subscriptions.isEmpty() ? null : subscriptions.getFirst();
    }

    private void requireMembership(long companyId, long userId) {
        var count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM user_companies WHERE company_id = ? AND user_id = ? AND LOWER(COALESCE(status,'active')) = 'active'",
            Integer.class, companyId, userId);
        if (count == null || count == 0) throw new SecurityException("Company access is not allowed.");
    }

    private void requireOwner(long companyId, long userId) {
        billingAuthority.requireOwner(companyId, userId);
    }
}
