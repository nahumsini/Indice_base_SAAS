package com.indice.erp.billing.portal;

public interface StripeCustomerPortalGateway {
    PortalResult create(String customerId, String returnUrl, String idempotencyKey);
    record PortalResult(String url) {}
}
