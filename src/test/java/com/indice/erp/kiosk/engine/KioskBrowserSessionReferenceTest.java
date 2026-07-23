package com.indice.erp.kiosk.engine;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KioskBrowserSessionReferenceTest {

    private final KioskBrowserSessionReference reference = new KioskBrowserSessionReference();

    @Test
    void keepsTheSameReferenceWhenAuthenticationRotatesTheServletSessionId() {
        var session = new MockHttpSession();
        var initialSessionId = session.getId();
        var initialReference = reference.resolve(session);

        session.changeSessionId();

        assertThat(session.getId()).isNotEqualTo(initialSessionId);
        assertThat(reference.resolve(session)).isEqualTo(initialReference);
    }

    @Test
    void assignsDifferentReferencesToDifferentBrowserSessions() {
        var first = new MockHttpSession();
        var second = new MockHttpSession();

        assertThat(reference.resolve(first)).isNotEqualTo(reference.resolve(second));
    }

    @Test
    void prefersTheExplicitPerTabReferenceAcrossDifferentServletSessions() {
        var firstRequest = new MockHttpServletRequest();
        firstRequest.addHeader(KioskBrowserSessionReference.HEADER,
            "attendance-tab-1234567890-1234567890");
        var secondRequest = new MockHttpServletRequest();
        secondRequest.addHeader(KioskBrowserSessionReference.HEADER,
            "attendance-tab-1234567890-1234567890");

        assertThat(reference.resolve(firstRequest, new MockHttpSession()))
            .isEqualTo(reference.resolve(secondRequest, new MockHttpSession()));
    }

    @Test
    void rejectsMalformedExplicitReferences() {
        var request = new MockHttpServletRequest();
        request.addHeader(KioskBrowserSessionReference.HEADER, "short reference with spaces");

        assertThatThrownBy(() -> reference.resolve(request, new MockHttpSession()))
            .isInstanceOf(SecurityException.class)
            .hasMessage("Kiosk browser validation failed.");
    }
}
