package com.indice.erp.pos.mercadopago;

import java.time.Clock;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public record MpTerminalReconciliationJob(MpProperties properties, MpIntentStore store,
        MpPaymentRecovery recovery, MpRecoveryLease leases, MpPaymentAudit audit, Clock clock) {
    @Scheduled(fixedDelayString = "${app.pos.mercado-pago.reconciliation-delay-ms:30000}")
    public void reconcile() {
        if (!properties.isEnabled()) return;
        for (var intent : store.recoveryBatch(clock.instant().minusSeconds(300), 25)) {
            try {
                var lease = UUID.randomUUID().toString();
                if (!leases.claim(intent, lease, clock.instant().plusSeconds(90))) continue;
                long delay = 30;
                try {
                    if (!recovery.recover(intent, MpAuditActor.scheduled())) delay = 300;
                } catch (RuntimeException exception) {
                    delay = 300;
                    audit.recordAs(intent, MpAuditActor.scheduled(), "RECONCILIATION_FAILED", "UNCERTAIN");
                } finally {
                    leases.release(intent, lease, clock.instant().plusSeconds(delay));
                }
            } catch (RuntimeException exception) {
                org.slf4j.LoggerFactory.getLogger(MpTerminalReconciliationJob.class).warn(
                    "Point reconciliation failed for company {} attempt {}", intent.companyId(), intent.id());
            }
        }
    }
}
