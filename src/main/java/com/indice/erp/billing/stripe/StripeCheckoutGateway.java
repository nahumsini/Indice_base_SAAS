package com.indice.erp.billing.stripe;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public interface StripeCheckoutGateway {

    CustomerResult createCustomer(CustomerCommand command, String idempotencyKey);

    CheckoutResult createCheckout(CheckoutCommand command, String idempotencyKey);

    record CustomerCommand(
        String email,
        String name,
        String phone,
        String countryCode,
        Map<String, String> metadata
    ) {
    }

    record CheckoutCommand(
        String customerId,
        String successUrl,
        String cancelUrl,
        boolean automaticTaxEnabled,
        boolean taxIdCollectionEnabled,
        int trialDays,
        Instant expiresAt,
        List<LineItem> lineItems,
        Map<String, String> metadata
    ) {
    }

    record LineItem(String priceId, long quantity) {
    }

    record CustomerResult(String id) {
    }

    record CheckoutResult(String id, String url, Instant expiresAt) {
    }
}
