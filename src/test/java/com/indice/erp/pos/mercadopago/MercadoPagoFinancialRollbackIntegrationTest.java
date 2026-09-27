package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

class MercadoPagoFinancialRollbackIntegrationTest extends MpFinancialDatabaseFixture {
    @Test void failureAfterAuditInsertRollsBackStatusRefundAndAuditTogether() {
        var failingAudit = new MpPaymentAudit(jdbc) {
            @Override public void recordAs(MpIntent intent, MpAuditActor actor, String event, String status) {
                super.recordAs(intent, actor, event, status);
                throw new IllegalStateException("Synthetic audit completion failure");
            }
        };
        var evidence = new MpEvidenceApplication(application.getBean(MpFinancialEvidenceLock.class),
            application.getBean(MpIntentStore.class), application.getBean(MpIntentWriter.class),
            application.getBean(MpRefundEvidence.class), failingAudit);
        var transaction = new TransactionTemplate(application.getBean(PlatformTransactionManager.class));
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        assertThrows(IllegalStateException.class, () -> transaction.execute(status -> evidence.apply(observed, partialRefund())));
        var current = application.getBean(MpIntentStore.class).find(companyId, observed.id()).orElseThrow();
        assertEquals("WAITING", current.status());
        assertFalse(current.refundPending());
        assertEquals(observed.version(), current.version());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_terminal_payment_reversals WHERE company_id=? AND intent_id=?",
            Integer.class, companyId, observed.id()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_audit_events WHERE company_id=? AND intent_id=?",
            Integer.class, companyId, observed.id()));
    }
}
