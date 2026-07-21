package com.indice.erp.entitlement;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CompanyEntitlementProjectionJob {

    private static final Logger log = LoggerFactory.getLogger(CompanyEntitlementProjectionJob.class);

    private final AtomicBoolean running = new AtomicBoolean();
    private final AtomicLong cursor = new AtomicLong();
    private final CompanyEntitlementProjectionService projection;
    private final boolean enabled;
    private final int batchSize;

    public CompanyEntitlementProjectionJob(
        CompanyEntitlementProjectionService projection,
        @Value("${app.entitlements.projection-enabled:true}") boolean enabled,
        @Value("${app.entitlements.projection-batch-size:100}") int batchSize
    ) {
        this.projection = projection;
        this.enabled = enabled;
        this.batchSize = Math.max(1, batchSize);
    }

    @Scheduled(fixedDelayString = "${app.entitlements.projection-delay-ms:60000}")
    public void refresh() {
        if (!enabled || !running.compareAndSet(false, true)) {
            return;
        }
        try {
            var batch = projection.refreshCohort(cursor.get(), batchSize);
            if (batch.refreshed() == 0) {
                cursor.set(0L);
                return;
            }
            cursor.set(batch.lastCompanyId());
            log.info(
                "company_entitlement_projection refreshed={} lastCompanyId={}",
                batch.refreshed(),
                batch.lastCompanyId()
            );
        } catch (RuntimeException exception) {
            log.error("company_entitlement_projection_failed afterCompanyId={}", cursor.get(), exception);
        } finally {
            running.set(false);
        }
    }
}
