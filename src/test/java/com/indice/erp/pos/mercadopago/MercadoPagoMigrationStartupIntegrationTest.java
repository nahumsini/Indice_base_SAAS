package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.dao.DataIntegrityViolationException;

class MercadoPagoMigrationStartupIntegrationTest extends MpIsolatedDatabaseFixture {
    @Test void fullSpringContextStartsWithAppliedMigrationAndTransactionProxies() {
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version='277' AND success=1", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version='278' AND success=1", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version='279' AND success=1", Integer.class));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() "
            + "AND table_name IN ('pos_terminal_refund_adjustments','pos_terminal_refund_adjustment_events')", Integer.class));
        assertNotNull(application.getBean(PaymentTerminalRequestGuard.class));
        assertNotNull(application.getBean(MpWebhookController.class));
        assertNotNull(application.getBean(MpConnectionController.class));
        assertTrue(AopUtils.isAopProxy(application.getBean(MpConnectionWriter.class)));
        assertTrue(AopUtils.isAopProxy(application.getBean(MpOAuthStore.class)));
        assertTrue(AopUtils.isAopProxy(application.getBean(MpTerminalWriter.class)));
        assertTrue(AopUtils.isAopProxy(application.getBean(MpPaymentFinalizer.class)));
    }
    @Test void merchantAccountCannotBeLinkedToASecondCompany() {
        var seller = Long.toString(companyId + 900000000L);
        connection(companyId, seller);
        long otherCompany = company();
        assertThrows(DataIntegrityViolationException.class, () -> connection(otherCompany, seller));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_connections WHERE environment='sandbox' AND seller_id=?",
            Integer.class, seller));
    }
    @Test void databaseRejectsTerminalConnectionOwnedByAnotherCompany() {
        var ownConnection = connection(companyId, Long.toString(companyId + 900000000L));
        var otherCompany = company();
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("""
            INSERT INTO pos_mercado_pago_terminals
            (company_id,connection_id,provider_terminal_id,name,status,operating_mode)
            VALUES (?,?,'NEWLAND_N950__SYNTHETIC','Synthetic terminal','DISCOVERED','STANDALONE')
            """, otherCompany, ownConnection));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_terminals WHERE company_id=?",
            Integer.class, otherCompany));
    }
}
