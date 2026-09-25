package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MercadoPagoFinancialEvidenceIntegrationTest extends MpFinancialDatabaseFixture {
    @ParameterizedTest @ValueSource(booleans={false,true})
    void authoritativeRefundUpdatesStatusLedgerAndAuditUnderOriginalFinancialLocks(boolean closed) {
        if (closed) jdbc.update("UPDATE pos_shifts SET status='CLOSED',closed_at=UTC_TIMESTAMP() WHERE company_id=? AND id=?",
            companyId, shiftId);
        assertTrue(application.getBean(MpEvidenceApplication.class).apply(observed, partialRefund()));
        var current = application.getBean(MpIntentStore.class).find(companyId, observed.id()).orElseThrow();
        assertEquals("PARTIALLY_REFUNDED", current.status());
        assertTrue(current.refundPending());
        assertEquals(0, jdbc.queryForObject("""
            SELECT amount FROM pos_terminal_payment_reversals
            WHERE company_id=? AND provider_code='MERCADO_PAGO' AND intent_id=? AND shift_id=?
            """, BigDecimal.class, companyId, observed.id(), shiftId).compareTo(new BigDecimal("10.00")));
        assertEquals(closed ? "RECONCILIATION_REQUIRED" : "PRE_CUT", jdbc.queryForObject("""
            SELECT accounting_state FROM pos_terminal_payment_reversals
            WHERE company_id=? AND provider_code='MERCADO_PAGO' AND intent_id=?
            """, String.class, companyId, observed.id()));
        assertEquals(1, jdbc.queryForObject("""
            SELECT COUNT(*) FROM pos_mercado_pago_audit_events
            WHERE company_id=? AND intent_id=? AND event_type='ORDER_VERIFIED' AND status='PARTIALLY_REFUNDED'
            """, Integer.class, companyId, observed.id()));
    }
    @Test void staleVersionCannotWritePaidStatusReversalsOrAudit() {
        jdbc.update("UPDATE pos_mercado_pago_payment_intents SET version=version+1 WHERE company_id=? AND id=?",
            companyId, observed.id());
        assertFalse(application.getBean(MpEvidenceApplication.class).apply(observed, partialRefund()));
        assertEquals("WAITING", application.getBean(MpIntentStore.class).find(companyId, observed.id()).orElseThrow().status());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_terminal_payment_reversals WHERE company_id=? AND intent_id=?",
            Integer.class, companyId, observed.id()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_audit_events WHERE company_id=? AND intent_id=?",
            Integer.class, companyId, observed.id()));
    }
}
