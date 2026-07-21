package com.indice.erp.billing.lifecycle;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CommercialLifecycleJob {

    private final CommercialLifecycleProperties properties;
    private final CommercialLifecycleService lifecycle;

    public CommercialLifecycleJob(CommercialLifecycleProperties properties, CommercialLifecycleService lifecycle) {
        this.properties = properties;
        this.lifecycle = lifecycle;
    }

    @Scheduled(fixedDelayString = "${app.billing.lifecycle.scheduler-delay-ms:60000}")
    public void advance() {
        if (properties.isEnabled() && properties.isSchedulerEnabled()) lifecycle.advanceDueStates();
    }
}
