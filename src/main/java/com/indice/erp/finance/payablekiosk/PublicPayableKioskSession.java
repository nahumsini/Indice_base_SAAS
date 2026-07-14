package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.FinanceApiException;
import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class PublicPayableKioskSession {

    private static final String AUTHORIZED_ACCESS = "finance.payableKiosk.authorizedAccess";
    private static final String FAILED_ATTEMPTS = "finance.payableKiosk.failedAttempts";
    private static final String LOCKED_UNTIL = "finance.payableKiosk.lockedUntil";
    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCK_SECONDS = 15 * 60;

    record Authorization(long accessId, long kioskId, long providerId) {
    }

    Authorization require(HttpSession session, long kioskId) {
        var value = session.getAttribute(AUTHORIZED_ACCESS);
        if (!(value instanceof Authorization authorization) || authorization.kioskId() != kioskId) {
            throw FinanceApiException.unauthorized("Provider PIN authentication is required.");
        }
        return authorization;
    }

    void authorize(HttpSession session, PayableKioskProviderAccessRow access) {
        session.setAttribute(AUTHORIZED_ACCESS, new Authorization(access.id(), access.kioskId(), access.providerId()));
        session.removeAttribute(FAILED_ATTEMPTS);
        session.removeAttribute(LOCKED_UNTIL);
    }

    void requireAttemptAllowed(HttpSession session) {
        var lockedUntil = session.getAttribute(LOCKED_UNTIL);
        if (lockedUntil instanceof Instant instant && instant.isAfter(Instant.now())) {
            throw FinanceApiException.tooManyRequests("Too many invalid PIN attempts. Try again later.");
        }
        if (lockedUntil instanceof Instant) {
            session.removeAttribute(LOCKED_UNTIL);
            session.removeAttribute(FAILED_ATTEMPTS);
        }
    }

    void registerFailure(HttpSession session) {
        var current = session.getAttribute(FAILED_ATTEMPTS);
        var attempts = current instanceof Integer value ? value + 1 : 1;
        session.setAttribute(FAILED_ATTEMPTS, attempts);
        if (attempts >= MAX_ATTEMPTS) {
            session.setAttribute(LOCKED_UNTIL, Instant.now().plusSeconds(LOCK_SECONDS));
        }
    }
}
