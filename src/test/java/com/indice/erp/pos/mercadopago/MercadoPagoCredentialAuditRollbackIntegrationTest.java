package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

class MercadoPagoCredentialAuditRollbackIntegrationTest extends MpFinancialDatabaseFixture {
    @MockitoBean MpPaymentAudit audit;
    @ParameterizedTest @ValueSource(booleans={false,true})
    void auditFailureRollsBackCredentialRotationOrReconnect(boolean rotating) {
        var connections = application.getBean(MpConnectionStore.class);
        var original = connections.find(companyId, "sandbox").orElseThrow();
        var leases = application.getBean(MpConnectionLease.class);
        String lease = UUID.randomUUID().toString();
        assertTrue(leases.claim(original, lease, Instant.now().plusSeconds(90)));
        doThrow(new IllegalStateException("Synthetic audit failure")).when(audit)
            .record(anyLong(), nullable(Long.class), nullable(Long.class), anyString(), anyString());
        var transaction = new TransactionTemplate(application.getBean(PlatformTransactionManager.class));
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_NESTED);
        assertThrows(IllegalStateException.class, () -> transaction.execute(status -> {
            if (rotating) leases.rotated(original, lease, "synthetic-next-access", "synthetic-next-refresh",
                Instant.now().plusSeconds(3600), "read write offline_access");
            else leases.reconnect(original, lease);
            return null;
        }));
        var current = connections.find(companyId, "sandbox").orElseThrow();
        assertEquals(original.version(), current.version());
        assertEquals("CONNECTED", current.state());
        assertEquals(original.accessTokenCiphertext(), current.accessTokenCiphertext());
        assertEquals(original.refreshTokenCiphertext(), current.refreshTokenCiphertext());
        assertEquals(lease, current.refreshLeaseId());
    }
}
