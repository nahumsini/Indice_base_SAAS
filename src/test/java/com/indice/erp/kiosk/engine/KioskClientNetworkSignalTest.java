package com.indice.erp.kiosk.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

class KioskClientNetworkSignalTest {

    @Test
    void ignoresCallerControlledForwardingAndUserAgentHeaders() {
        var request = mock(HttpServletRequest.class);
        when(request.getRemoteAddr()).thenReturn(" 203.0.113.7 ");
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.9");
        when(request.getHeader("User-Agent")).thenReturn("PIN=123456");

        assertThat(KioskClientNetworkSignal.from(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void usesAnExplicitUnknownBoundaryWhenRemoteAddressIsUnavailable() {
        var request = mock(HttpServletRequest.class);

        assertThat(KioskClientNetworkSignal.from(request)).isEqualTo("unknown");
        assertThat(KioskClientNetworkSignal.from(null)).isEqualTo("unknown");
    }
}
