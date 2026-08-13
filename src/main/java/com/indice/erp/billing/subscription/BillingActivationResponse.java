package com.indice.erp.billing.subscription;

import java.time.Instant;

public record BillingActivationResponse(
    String status,
    String checkout_url,
    Instant checkout_expires_at,
    int remaining_trial_days,
    boolean replayed
) {
}

