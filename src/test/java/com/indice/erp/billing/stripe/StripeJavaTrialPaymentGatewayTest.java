package com.indice.erp.billing.stripe;

import static org.assertj.core.api.Assertions.*;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

class StripeJavaTrialPaymentGatewayTest {
    @Test void lateTrialSetupUsesAbsoluteDeadlineNotCheckoutMinimumOrAnotherFifteenDays() {
        var cutoff = Instant.parse("2026-10-23T22:00:00Z");
        var params = StripeJavaTrialPaymentGateway.subscriptionParameters(new StripeTrialPaymentGateway.SubscriptionCommand(
            "cus_verified", "pm_verified", "price_cad", cutoff, true, Map.of("indice_flow", "regional_trial_payment")));
        assertThat(params).containsEntry("trial_end", cutoff.getEpochSecond()).doesNotContainKeys("trial_period_days");
        assertThat(params).containsEntry("collection_method", "charge_automatically").containsEntry("payment_behavior", "default_incomplete");
    }
    @Test void uncertainAfterTrialRequestNeverTurnsIntoImmediateChargeWhenRetriedAfterDeadline() {
        var past = Instant.parse("2020-01-01T00:00:00Z");
        var params = StripeJavaTrialPaymentGateway.subscriptionParameters(new StripeTrialPaymentGateway.SubscriptionCommand(
            "cus_verified", "pm_verified", "price_cad", past, true, Map.of()));
        assertThat(params).containsEntry("trial_end", past.getEpochSecond());
    }
    @Test void separatelyConsentedExpiredAccountPaymentDoesNotStartAnotherTrial() {
        var params = StripeJavaTrialPaymentGateway.subscriptionParameters(new StripeTrialPaymentGateway.SubscriptionCommand(
            "cus_verified", "pm_verified", "price_cad", null, true, Map.of()));
        assertThat(params).doesNotContainKeys("trial_end", "trial_period_days", "trial_settings");
    }
}
