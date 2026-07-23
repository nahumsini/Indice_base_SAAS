package com.indice.erp.billing.stripe;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.billing.legacy-stripe-jobs.enabled", havingValue = "true")
class SignupCheckoutCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(SignupCheckoutCleanupJob.class);

    private final StripeSignupCheckoutService checkoutService;

    SignupCheckoutCleanupJob(StripeSignupCheckoutService checkoutService) {
        this.checkoutService = checkoutService;
    }

    @Scheduled(fixedDelayString = "${app.billing.signup.checkout-cleanup-delay-ms:60000}")
    void cleanupExpiredCheckoutAttempts() {
        var removed = checkoutService.cleanupExpiredCheckoutAttempts();
        if (removed > 0) {
            log.info("Removed {} expired signup checkout attempts", removed);
        }
    }
}
