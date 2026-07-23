package com.indice.erp.kiosk.engine;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import static org.assertj.core.api.Assertions.assertThat;

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
}
