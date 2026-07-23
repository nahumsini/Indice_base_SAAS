package com.indice.erp.billing.subscription;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class TrialExpiryJob {

    private static final Logger log = LoggerFactory.getLogger(TrialExpiryJob.class);

    private final CompanySubscriptionService subscriptionService;

    TrialExpiryJob(CompanySubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @Scheduled(fixedDelayString = "${app.billing.subscription.trial-expiry-delay-ms:3600000}")
    void expireTrials() {
        var expired = subscriptionService.expireTrials();
        if (expired > 0) {
            log.info("Expired {} company subscription trials", expired);
        }
    }
}
