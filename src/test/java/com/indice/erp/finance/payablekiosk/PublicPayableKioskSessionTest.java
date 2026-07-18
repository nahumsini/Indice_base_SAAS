package com.indice.erp.finance.payablekiosk;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.indice.erp.finance.FinanceApiException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class PublicPayableKioskSessionTest {

    private final PublicPayableKioskSession kioskSession = new PublicPayableKioskSession();

    @Test
    void authorizesTheProviderBoundToTheKiosk() {
        var session = new MockHttpSession();
        var access = new PayableKioskProviderAccessRow(
                7L, 2L, 11L, 19L, "Proveedor", "Kiosko", "token", "hash", "ACTIVE", null);

        kioskSession.authorize(session, access, "canonical-session-token");

        var authorization = kioskSession.require(session, 11L);
        assertEquals(7L, authorization.accessId());
        assertEquals(19L, authorization.providerId());
        assertEquals("canonical-session-token", authorization.kioskSessionToken());
    }

    @Test
    void rejectsAnAuthorizationForAnotherKiosk() {
        var session = new MockHttpSession();
        var access = new PayableKioskProviderAccessRow(
                7L, 2L, 11L, 19L, "Proveedor", "Kiosko", "token", "hash", "ACTIVE", null);
        kioskSession.authorize(session, access, "canonical-session-token");

        assertThrows(FinanceApiException.class, () -> kioskSession.require(session, 12L));
    }

    @Test
    void locksTheSessionAfterFiveInvalidAttempts() {
        var session = new MockHttpSession();
        for (var attempt = 0; attempt < 5; attempt++) {
            kioskSession.registerFailure(session);
        }

        var error = assertThrows(FinanceApiException.class, () -> kioskSession.requireAttemptAllowed(session));
        assertEquals(429, error.status().value());
    }
}
