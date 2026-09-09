package com.indice.erp.billing.collection;

import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class PaymentCollectionScheduler {
    private static final Logger LOG = LoggerFactory.getLogger(PaymentCollectionScheduler.class);
    private final PaymentCollectionRepository repository;
    private final PaymentCollectionService service;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final PaymentCollectionAccessService access;
    private final boolean enabled;
    public PaymentCollectionScheduler(PaymentCollectionRepository repository, PaymentCollectionService service,
                                      TransactionTemplate transactions, Clock clock, PaymentCollectionAccessService access,
                                      @Value("${app.billing.collection.reconciliation-enabled:false}") boolean enabled) {
        this.repository = repository; this.service = service; this.transactions = transactions; this.clock = clock; this.access = access; this.enabled = enabled;
    }
    @Scheduled(fixedDelayString = "${app.billing.collection.reconciliation-delay-ms:60000}")
    public void processDue() {
        if (!enabled) return;
        for (var candidate : repository.openRequests(clock.instant())) {
            if (!repository.claimReconciliation(candidate, clock.instant())) continue;
            try {
                service.reconcile(candidate.companyId(), candidate.id());
            } catch (RuntimeException failure) {
                LOG.warn("payment_request_reconciliation_failed companyId={} requestId={}", candidate.companyId(), candidate.id());
            }
            // Auditing the deadline does not enforce it: access checks already enforce it synchronously.
            transactions.executeWithoutResult(tx -> {
                repository.company(candidate.companyId(), true);
                var row = repository.find(candidate.companyId(), candidate.id(), true);
                if (row == null || !row.open() || clock.instant().isBefore(row.deadline())) return;
                if (access.access(row.companyId()) != PaymentCollectionAccessService.Access.PAYMENT_ONLY) return;
                repository.event(row, "RESTRICTED", null, "The payment deadline expired without verified settlement.",
                    PaymentCollectionService.hash("RESTRICTED:" + row.companyId() + ":" + row.id() + ":" + row.version()), null, clock.instant());
            });
        }
    }
}
