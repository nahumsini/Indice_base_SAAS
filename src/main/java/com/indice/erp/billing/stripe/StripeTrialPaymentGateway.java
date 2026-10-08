package com.indice.erp.billing.stripe;

import java.time.Instant;
import java.util.Map;

/** Hosted method capture followed by an idempotent subscription; no card material enters Indice. */
public interface StripeTrialPaymentGateway {
    StripeCheckoutGateway.CheckoutResult createSetup(String customerId, String currency, String returnUrl,
        Instant expiresAt, Map<String, String> metadata, String key);
    VerifiedSetup verifySetup(String sessionId);
    String createSubscription(SubscriptionCommand command, String key);

    record VerifiedSetup(String customerId, String paymentMethodId, String countryCode,
                         String accountId, boolean liveMode, Map<String, String> metadata) { }
    record SubscriptionCommand(String customerId, String paymentMethodId, String priceId,
        Instant absoluteTrialEnd, boolean automaticTax, Map<String, String> metadata) { }
}
