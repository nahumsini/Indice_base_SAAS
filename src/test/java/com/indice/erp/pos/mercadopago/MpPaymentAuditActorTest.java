package com.indice.erp.pos.mercadopago;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
class MpPaymentAuditActorTest {
    @Test void scheduledRecoveryIsNotAttributedToOriginalCashier() {
        var jdbc = mock(JdbcTemplate.class);
        new MpPaymentAudit(jdbc).recordAs(MpPaymentTestFixtures.intent(), MpAuditActor.scheduled(),
            "RECONCILIATION_FAILED", "UNCERTAIN");
        verify(jdbc).update(contains("actor_type"), eq(42L), eq(17L), isNull(),
            eq("SCHEDULED"), eq("RECONCILIATION_FAILED"), eq("UNCERTAIN"));
    }
}
