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

    record Authorization(
            Long accessId,
            long kioskId,
            String identityType,
            long identityId,
            Long providerId,
            String kioskSessionToken) {
    }

    Authorization require(HttpSession session, long kioskId) {
        var value = session.getAttribute(AUTHORIZED_ACCESS);
        if (!(value instanceof Authorization authorization) || authorization.kioskId() != kioskId) {
            throw FinanceApiException.unauthorized("Personal PIN authentication is required.");
        }
        return authorization;
    }

    void authorizeProvider(HttpSession session, PayableKioskProviderAccessRow access, String kioskSessionToken) {
        session.setAttribute(AUTHORIZED_ACCESS, new Authorization(
            access.id(), access.kioskId(), "PROVIDER", access.providerId(),
            access.providerId(), kioskSessionToken));
        clearFailures(session);
    }

    void authorize(HttpSession session, PayableKioskProviderAccessRow access, String kioskSessionToken) {
        authorizeProvider(session, access, kioskSessionToken);
    }

    void authorizeEmployee(
            HttpSession session, long kioskId, long employeeId, String kioskSessionToken) {
        session.setAttribute(AUTHORIZED_ACCESS, new Authorization(
            null, kioskId, "EMPLOYEE", employeeId, null, kioskSessionToken));
        clearFailures(session);
    }

    private void clearFailures(HttpSession session) {
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
