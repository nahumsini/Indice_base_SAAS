package com.indice.erp.auth;

import java.time.Instant;

public record SignupBillingInfo(
    SignupPlanSelection plan,
    String stripeCustomerId,
    String stripeSubscriptionId,
    String stripeSubscriptionStatus,
    Instant trialStart,
    Instant trialEnd,
    Instant currentPeriodStart,
    Instant currentPeriodEnd,
    boolean cancelAtPeriodEnd,
    Instant canceledAt,
    String source
) {
}
