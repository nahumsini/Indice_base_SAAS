package com.indice.erp.pos.terminal;

import static org.mockito.Mockito.*;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.pos.*;
import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpSession;

final class TerminalRequestGuardFixtures {
    final PosRequestGuard base = mock(PosRequestGuard.class);
    final SessionAuthService auth = mock(SessionAuthService.class);
    final TabPermissionAccessService tabs = mock(TabPermissionAccessService.class);
    final MockHttpSession session = new MockHttpSession();
    final AuthSessionUser user = new AuthSessionUser(11L, 42L, "Synthetic", "admin");
    final PosRequestGuard.Result allowed = new PosRequestGuard.Result(
        new PosContext(11L, 42L, "Synthetic", "admin", true, PosScope.corporateOffice()), null);
    final PaymentTerminalRequestGuard guard = new PaymentTerminalRequestGuard(base, auth, tabs);
    TerminalRequestGuardFixtures() {
        allowBase(allowed);
        when(auth.currentUser(session)).thenReturn(Optional.of(user));
    }
    void allowBase(PosRequestGuard.Result result) {
        when(base.requireReadAccess(session)).thenReturn(result);
        when(base.requireWriteAccess(session, "csrf")).thenReturn(result);
        when(base.requireAdminReadAccess(session)).thenReturn(result);
        when(base.requireAdminWriteAccess(session, "csrf")).thenReturn(result);
    }
    void denyBase() {
        allowBase(new PosRequestGuard.Result(null, ResponseEntity.status(403).build()));
        clearInvocations(auth, tabs);
    }
    PosRequestGuard.Result invoke(String operation) {
        return switch (operation) {
            case "read" -> guard.read(session);
            case "write" -> guard.write(session, "csrf");
            case "adminRead" -> guard.adminRead(session);
            case "adminWrite" -> guard.adminWrite(session, "csrf");
            case "setupRead" -> guard.setupRead(session);
            case "adminSetupRead" -> guard.adminSetupRead(session);
            default -> throw new IllegalArgumentException(operation);
        };
    }
}
