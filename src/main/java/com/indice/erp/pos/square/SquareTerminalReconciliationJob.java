package com.indice.erp.pos.square;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class SquareTerminalReconciliationJob {

    private static final Logger log = LoggerFactory.getLogger(SquareTerminalReconciliationJob.class);

    private final SquareTerminalPaymentService payments;

    SquareTerminalReconciliationJob(SquareTerminalPaymentService payments) {
        this.payments = payments;
    }

    @Scheduled(fixedDelayString = "${app.pos.square.reconciliation-delay-ms:30000}")
    public void reconcile() {
        try {
            payments.reconcilePendingBatch(50);
        } catch (RuntimeException ex) {
            log.warn("Square Terminal reconciliation failed: {}", ex.getMessage());
        }
    }
}
