package com.indice.erp.finance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import jakarta.servlet.http.HttpSession;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinanceRequestGuardTest {

    @Mock
    private SessionAuthService sessionAuthService;

    @Mock
    private SessionCsrfService sessionCsrfService;

    @Mock
    private FinanceAccessService accessService;

    @Mock
    private HttpSession session;

    @Test
    void requireReadAccessReturnsUnauthorizedWhenSessionIsMissing() {
        var guard = new FinanceRequestGuard(sessionAuthService, sessionCsrfService, accessService);
        when(sessionAuthService.currentUser(session)).thenReturn(Optional.empty());

        var result = guard.requireReadAccess(session);

        assertTrue(result.denied());
        assertEquals(HttpStatus.UNAUTHORIZED, result.error().getStatusCode());
        verifyNoInteractions(sessionCsrfService, accessService);
    }

    @Test
    void requireReadAccessReturnsForbiddenWhenFinanceAccessIsMissing() {
        var guard = new FinanceRequestGuard(sessionAuthService, sessionCsrfService, accessService);
        var user = user();

        when(sessionAuthService.currentUser(session)).thenReturn(Optional.of(user));
        when(accessService.resolveContext(user)).thenReturn(Optional.empty());

        var result = guard.requireReadAccess(session);

        assertTrue(result.denied());
        assertEquals(HttpStatus.FORBIDDEN, result.error().getStatusCode());
        verifyNoInteractions(sessionCsrfService);
    }

    @Test
    void requireWriteAccessRequiresCsrfAfterFinanceAccess() {
        var guard = new FinanceRequestGuard(sessionAuthService, sessionCsrfService, accessService);
        var user = user();

        when(sessionAuthService.currentUser(session)).thenReturn(Optional.of(user));
        when(accessService.resolveContext(user)).thenReturn(Optional.of(context()));
        doThrow(new IllegalArgumentException("Invalid CSRF token."))
            .when(sessionCsrfService)
            .requireCsrf(session, "bad-token");

        var result = guard.requireWriteAccess(session, "bad-token");

        assertTrue(result.denied());
        assertEquals(HttpStatus.FORBIDDEN, result.error().getStatusCode());
    }

    @Test
    void requireWriteAccessReturnsContextWhenCsrfIsValid() {
        var guard = new FinanceRequestGuard(sessionAuthService, sessionCsrfService, accessService);
        var user = user();
        var context = context();

        when(sessionAuthService.currentUser(session)).thenReturn(Optional.of(user));
        when(accessService.resolveContext(user)).thenReturn(Optional.of(context));

        var result = guard.requireWriteAccess(session, "valid-token");

        assertFalse(result.denied());
        assertEquals(context, result.context());
        verify(sessionCsrfService).requireCsrf(session, "valid-token");
    }

    private AuthSessionUser user() {
        return new AuthSessionUser(1L, 7L, "Finance User", "user");
    }

    private FinanceContext context() {
        return new FinanceContext(1L, 7L, "Finance User", "user", true, FinanceScope.corporateOffice());
    }
}
