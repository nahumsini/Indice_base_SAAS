package com.indice.erp.billing.subscription;

import java.time.Instant;

public record CompanySubscriptionStatus(
    String status,
    String planId,
    Instant trialEndAt,
    boolean accessAllowed,
    String lockReason
) {
    public static CompanySubscriptionStatus activeLegacy() {
        return new CompanySubscriptionStatus("active", "legacy", null, true, "");
    }

    public static CompanySubscriptionStatus blocked(String reason) {
        return new CompanySubscriptionStatus("missing_subscription", "", null, false, reason);
    }
}
