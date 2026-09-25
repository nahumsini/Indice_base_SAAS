package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class MpConnectionLeaseTest {
    @Test void onlyWinningRotationRecordsSafeAudit() {
        var jdbc = mock(JdbcTemplate.class);
        var audit = mock(MpPaymentAudit.class);
        var leases = new MpConnectionLease(jdbc, audit);
        assertFalse(leases.rotated(MpTestFixtures.connection(), "lease", "protected-a", "protected-r",
            MpTestFixtures.NOW.plusSeconds(3600), "read write offline_access"));
        verifyNoInteractions(audit);
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        assertTrue(leases.rotated(MpTestFixtures.connection(), "lease", "protected-a", "protected-r",
            MpTestFixtures.NOW.plusSeconds(3600), "read write offline_access"));
        verify(audit).record(42L, null, null, "CREDENTIALS_REFRESHED", "CONNECTED");
    }
    @Test void losingReconnectCannotCreateMisleadingAudit() {
        var jdbc = mock(JdbcTemplate.class);
        var audit = mock(MpPaymentAudit.class);
        var leases = new MpConnectionLease(jdbc, audit);
        leases.reconnect(MpTestFixtures.connection(), "lease");
        verifyNoInteractions(audit);
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        leases.reconnect(MpTestFixtures.connection(), "lease");
        verify(audit).record(42L, null, null, "CREDENTIALS_REFRESH_FAILED", "RECONNECT_REQUIRED");
    }
}
