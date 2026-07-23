package com.indice.erp.billing.stripe;

import com.indice.erp.auth.SignupPlanSelection;
import com.indice.erp.auth.SignupProfile;
import java.time.Instant;

record SignupIntentRecord(
    long id,
    String intentToken,
    String status,
    SignupProfile profile,
    SignupPlanSelection plan,
    String stripeCheckoutSessionId,
    String stripeCustomerId,
    String stripeSubscriptionId,
    Long companyId,
    String failureMessage,
    Instant expiresAt
) {
    SignupIntentRecord withPlan(SignupPlanSelection plan) {
        return new SignupIntentRecord(
            id,
            intentToken,
            status,
            profile,
            plan,
            stripeCheckoutSessionId,
            stripeCustomerId,
            stripeSubscriptionId,
            companyId,
            failureMessage,
            expiresAt
        );
    }
}
