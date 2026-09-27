package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpCredentialRefreshTest {
    private final MpConnectionLease leases = mock(MpConnectionLease.class);
    private final MpMerchantGateway gateway = mock(MpMerchantGateway.class);
    private final MpTokenCodec codec = mock(MpTokenCodec.class);
    private final MpCredentialRefresh service = new MpCredentialRefresh(leases, gateway, codec, MpTestFixtures.CLOCK);
    @BeforeEach void prepare() {
        when(leases.claim(any(), anyString(), any())).thenReturn(true);
        when(codec.reveal(anyLong(), anyString(), anyString())).thenReturn("synthetic-refresh");
        when(gateway.refresh(anyString())).thenReturn(MpTestFixtures.tokens());
        when(gateway.profile(anyString())).thenReturn(new MpProviderDtos.Profile("12345", "MX", "MLM"));
        when(codec.protect(anyLong(), anyString(), anyString())).thenReturn("encrypted-next");
    }
    @Test void rotatesBothCredentialsUsingLeaseAndVersion() {
        when(leases.rotated(any(), anyString(), anyString(), anyString(), any(), anyString())).thenReturn(true);
        assertDoesNotThrow(() -> service.refresh(MpTestFixtures.connection()));
        verify(leases).rotated(eq(MpTestFixtures.connection()), anyString(), eq("encrypted-next"), eq("encrypted-next"),
            eq(MpTestFixtures.NOW.plusSeconds(15552000)), eq("read write offline_access"));
        verify(leases, never()).reconnect(any(), anyString());
    }
    @Test void lostRefreshResponseRequiresReconnectWithoutReplay() {
        when(gateway.refresh(anyString())).thenThrow(new MpGatewayException(0, true));
        assertThrows(PosApiException.class, () -> service.refresh(MpTestFixtures.connection()));
        verify(gateway, times(1)).refresh("synthetic-refresh");
        verify(leases).reconnect(eq(MpTestFixtures.connection()), anyString());
        verify(leases, never()).rotated(any(), anyString(), anyString(), anyString(), any(), anyString());
    }
    @Test void refusedLeaseNeverCallsProvider() {
        when(leases.claim(any(), anyString(), any())).thenReturn(false);
        assertThrows(PosApiException.class, () -> service.refresh(MpTestFixtures.connection()));
        verifyNoInteractions(gateway);
    }
    @Test void staleRotationCannotOverwriteNewAuthorization() {
        assertThrows(PosApiException.class, () -> service.refresh(MpTestFixtures.connection()));
        verify(leases).reconnect(eq(MpTestFixtures.connection()), anyString());
    }
}
