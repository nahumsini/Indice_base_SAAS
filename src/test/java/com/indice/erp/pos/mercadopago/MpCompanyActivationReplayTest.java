package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.platformadmin.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class MpCompanyActivationReplayTest {
    @Test void repeatedDecisionIsIdempotentAndAudited() {
        var access = mock(PlatformAdminAccessService.class); var audit = mock(PlatformAuditService.class);
        var connections = mock(MpConnectionStore.class); var store = mock(MpCompanyActivationStore.class);
        when(access.require(9, "PLATFORM_ACCOUNTS_WRITE")).thenReturn(
            new PlatformAdminAccessService.Access(1, "PLATFORM_ROOT", List.of()));
        var connection = MpActivationTestFixtures.connection("ACTIVE", "CONNECTED", "12345");
        when(connections.find(42, "production", true)).thenReturn(java.util.Optional.of(connection));
        var service = new MpCompanyActivationService(access, audit, connections, store,
            new MpActivationChangePolicy(new MpActivationEligibility()),
            new MpLiveActivationPolicy(true), MpTestFixtures.CLOCK);
        var status = service.change(9, 42, new MpActivationDtos.Change("ACTIVE", "pilot rollout", 2L));
        assertEquals(2, status.version()); verifyNoInteractions(store);
        verify(audit).record(eq(9L), any(), any(), any(), eq(42L), eq("SUCCESS"),
            argThat(detail -> Boolean.TRUE.equals(detail.get("replay"))));
    }
}
