package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MpHttpPointGatewayTest {
    private final MpHttpClient client = mock(MpHttpClient.class);
    private final MpOrderInput input = mock(MpOrderInput.class);
    private final MpHttpPointGateway gateway = new MpHttpPointGateway(client, input);

    @ParameterizedTest @ValueSource(strings={"../ORD123", "ORD123?merchant=other", "https://example.com", "ORD123/cancel"})
    void providerOrderCannotInjectPathsOrQueryAuthority(String id) {
        assertThrows(PosApiException.class, () -> gateway.getOrder("synthetic-token", id));
        verifyNoInteractions(client);
    }
    @ParameterizedTest @ValueSource(strings={"PAY123", "123/refund", "123?other", "-123"})
    void actionRequiredBridgeRequiresNumericPaymentId(String id) {
        assertThrows(PosApiException.class, () -> gateway.getPayment("synthetic-token", id));
        verifyNoInteractions(client);
    }
    @Test void cancellationKeepsBaselineCreatedOnlyAndRetriesUseFrozenKeys() {
        gateway.cancelOrder("synthetic-token", "ORD123", "immutable-retry-key");
        verify(client).request("POST", "/v1/orders/ORD123/cancel", "synthetic-token", null, "immutable-retry-key");
        gateway.refundOrder("synthetic-token", "ORD123", "{}", "refund-key");
        verify(client).request("POST", "/v1/orders/ORD123/refund", "synthetic-token", "{}", "refund-key");
        assertThrows(PosApiException.class, () -> gateway.createOrder("synthetic-token", "{}", "key\r\nInjected: true"));
    }
    @Test void providerFailuresExposeOnlySafeStatusCodes() {
        var failure = new MpGatewayException(401, false);
        assertTrue(failure.unauthorized());
        assertFalse(failure.uncertain());
        assertEquals(401, failure.status());
        assertNull(failure.getCause());
        assertFalse(failure.toString().contains("synthetic-token"));
    }
}
