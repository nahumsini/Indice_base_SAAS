package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class MpMerchantTokensTest {
    private final MpSecrets secrets = mock(MpSecrets.class);
    private final MpProperties properties = new MpProperties();
    private final MpConnectionStore store = mock(MpConnectionStore.class);
    private final MpCredentialRefresh refresh = mock(MpCredentialRefresh.class);
    private final MpTokenCodec codec = mock(MpTokenCodec.class);
    private final MpMerchantGateway gateway = mock(MpMerchantGateway.class);
    private final MpMerchantTokens tokens = new MpMerchantTokens(secrets, properties, store,
        refresh, codec, gateway, MpTestFixtures.CLOCK);

    @Test void verifiesAuthenticatedSellerAndCountryBeforeAnyPaymentAction() {
        when(store.find(42, "sandbox")).thenReturn(Optional.of(MpTestFixtures.connection()));
        when(codec.reveal(42, "sandbox:12345:access", "encrypted-access")).thenReturn("synthetic-token");
        when(gateway.profile("synthetic-token")).thenReturn(new MpProviderDtos.Profile("12345", "BR", "MLB"));
        var called = new AtomicBoolean();
        assertThrows(PosApiException.class, () -> tokens.withCompanyToken(42, token -> { called.set(true); return true; }));
        assertFalse(called.get());
        verify(refresh).refresh(MpTestFixtures.connection());
        when(gateway.profile("synthetic-token")).thenReturn(new MpProviderDtos.Profile("12345", "MX", "MLM"));
        boolean verified = tokens.withToken(MpTestFixtures.context(), token -> token.equals("synthetic-token"));
        assertTrue(verified);
    }
    @Test void disabledConfigurationAndForeignTenantCannotReachProvider() {
        doThrow(PosApiException.serviceUnavailable("disabled")).when(secrets).requireConfigured();
        assertThrows(PosApiException.class, () -> tokens.withCompanyToken(42, token -> true));
        verifyNoInteractions(store, gateway);
        reset(secrets);
        when(store.find(99, "sandbox")).thenReturn(Optional.empty());
        assertThrows(PosApiException.class, () -> tokens.withCompanyToken(99, token -> true));
        verifyNoInteractions(gateway, refresh, codec);
    }
}
