package com.indice.erp.billing.subscription;

import java.time.Instant;

record BillingSubscriptionRecord(
    long companyId,
    String stripeCustomerId,
    String stripeSubscriptionId,
    String status,
    String planId,
    int moduleCount,
    int includedCollaborators,
    int extraCollaborators,
    int recurringAmountCents,
    int extraSeatUnitAmountCents,
    String billingInterval,
    String currency,
    Instant trialStartAt,
    Instant trialEndAt,
    Instant currentPeriodStartAt,
    Instant currentPeriodEndAt,
    boolean cancelAtPeriodEnd,
    Instant canceledAt,
    Instant cancellationEffectiveAt,
    Instant paymentFailedAt,
    Instant paymentGraceUntil,
    String paymentFailureReason,
    String latestInvoiceId,
    String source,
    Instant accessLockedAt,
    String lockReason,
    boolean pricesExcludeTaxes,
    Instant updatedAt
) {
}
