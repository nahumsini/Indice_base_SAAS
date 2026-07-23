package com.indice.erp.billing.stripe;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class StripeIdempotencyKeysTest {

    @Test
    void signupKeysUseIntentId() {
        assertEquals("indice.signup_intent.42.customer.create", StripeIdempotencyKeys.signupCustomer(42L));
        assertEquals("indice.signup_intent.42.checkout_session.create", StripeIdempotencyKeys.signupCheckoutSession(42L));
    }

    @Test
    void subscriptionActionKeyUsesStableLocalState() {
        var key = StripeIdempotencyKeys.subscriptionAction(
            7L,
            "sub_test:123",
            "cancel",
            Instant.parse("2026-07-08T12:30:45Z")
        );

        assertEquals("indice.company.7.subscription.sub_test_123.cancel.1783513845000", key);
    }
}
