package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.platformadmin.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class MpCompanyActivationAuthorizationTest {
    private final PlatformAdminAccessService access = mock(PlatformAdminAccessService.class);
    private final PlatformAuditService audit = mock(PlatformAuditService.class);
    private final MpConnectionStore connections = mock(MpConnectionStore.class);
    private final MpCompanyActivationStore store = mock(MpCompanyActivationStore.class);
    private MpCompanyActivationService service() { return new MpCompanyActivationService(access, audit,
        connections, store, new MpActivationChangePolicy(new MpActivationEligibility()),
        new MpLiveActivationPolicy(true), MpTestFixtures.CLOCK); }
    @Test void companyOrPlatformOperatorCannotActivatePayments() {
        when(access.require(9, "PLATFORM_ACCOUNTS_WRITE")).thenReturn(
            new PlatformAdminAccessService.Access(2, "PLATFORM_OPERATOR", List.of("PLATFORM_ACCOUNTS_WRITE")));
        assertThrows(PlatformAdminForbiddenException.class, () -> service().change(9, 42,
            new MpActivationDtos.Change("ACTIVE", "pilot rollout", 2L)));
        verifyNoInteractions(connections, store, audit);
    }
    @Test void rootCanActivateOnlyTheRequestedCompanyConnection() {
        when(access.require(9, "PLATFORM_ACCOUNTS_WRITE")).thenReturn(
            new PlatformAdminAccessService.Access(1, "PLATFORM_ROOT", List.of()));
        var connection = MpActivationTestFixtures.connection("DISABLED", "CONNECTED", "12345");
        when(connections.find(42, "production", true)).thenReturn(java.util.Optional.of(connection));
        when(store.change(eq(connection), eq(MpActivationState.ACTIVE), eq(9L), eq("pilot rollout"), eq(2L), any()))
            .thenReturn(connection.activation().transition(MpActivationState.ACTIVE, 9, "pilot rollout", MpTestFixtures.NOW));
        var status = service().change(9, 42, new MpActivationDtos.Change("active", " pilot rollout ", 2L));
        assertEquals("ACTIVE", status.activationState()); assertTrue(status.liveChargeAllowed());
        verify(connections).find(42, "production", true); verify(audit).record(eq(9L), any(), any(), any(), eq(42L), eq("SUCCESS"), any());
    }
    @Test void staleVersionAndShortReasonFailBeforeMutation() {
        when(access.require(9, "PLATFORM_ACCOUNTS_WRITE")).thenReturn(
            new PlatformAdminAccessService.Access(1, "PLATFORM_ROOT", List.of()));
        when(connections.find(42, "production", true)).thenReturn(
            java.util.Optional.of(MpActivationTestFixtures.connection("DISABLED", "CONNECTED", "12345")));
        assertThrows(IllegalStateException.class, () -> service().change(9, 42,
            new MpActivationDtos.Change("ACTIVE", "pilot rollout", 1L)));
        assertThrows(IllegalArgumentException.class, () -> service().change(9, 42,
            new MpActivationDtos.Change("ACTIVE", "short", 2L)));
        verifyNoInteractions(store);
    }
}
