package com.indice.erp.pos.square;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties={
    "spring.datasource.url=jdbc:mysql://127.0.0.1:${indice.test.mysql-port:3307}/indice_test_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
    "spring.datasource.username=indice_test_user", "spring.datasource.password=indice_test_pass",
    "app.pos.mercado-pago.enabled=false", "app.pos.square.enabled=false"})
class SquareRefundMigrationIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ApplicationContext application;
    @Test void squareRefundSchemaIsAvailableAfterFlywayStartup() {
        assertEquals("indice_test_db", jdbc.queryForObject("SELECT DATABASE()", String.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history "
            + "WHERE version='281' AND success=1", Integer.class));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns "
            + "WHERE table_schema=DATABASE() AND column_name='square_intent_id' "
            + "AND table_name IN ('pos_terminal_payment_reversals','pos_terminal_refund_adjustments')",
            Integer.class));
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(
            application.getBean(SquareRefundConfirmation.class)));
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(
            application.getBean(SquareRefundRecoveryTransition.class)));
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(
            application.getBean(SquareRefundSubmissionTransition.class)));
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(
            application.getBean(SquareRefundMissingIdReview.class)));
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(
            application.getBean(com.indice.erp.pos.mercadopago.MpRefundTransition.class)));
    }
}
