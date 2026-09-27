package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class MpHttpClientTest {
    @Test void malformedCredentialHeaderIsRedactedBeforeAnyNetworkRequest() {
        var client = new MpHttpClient(new MpProperties(), new ObjectMapper());
        var credential = "synthetic-private-value\r\nBad: value";
        var error = assertThrows(MpGatewayException.class,
            () -> client.request("GET", "/users/me", credential, null, null));
        assertTrue(error.uncertain());
        assertEquals(0, error.status());
        assertNull(error.getCause());
        assertFalse(error.getMessage().contains("synthetic-private-value"));
        assertFalse(error.toString().contains("synthetic-private-value"));
    }
    @Test void fixedHostRejectsSchemeRelativeAuthorityBeforeNetworkRequest() {
        var client = new MpHttpClient(new MpProperties(), new ObjectMapper());
        var error = assertThrows(IllegalArgumentException.class,
            () -> client.request("GET", "//example.com/users/me", "synthetic-token", null, null));
        assertEquals("Invalid provider path.", error.getMessage());
    }
}
