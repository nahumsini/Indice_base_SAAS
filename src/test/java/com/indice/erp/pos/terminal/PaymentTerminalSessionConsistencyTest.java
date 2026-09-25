package com.indice.erp.pos.terminal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.auth.AuthSessionUser;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PaymentTerminalSessionConsistencyTest {
    @ParameterizedTest @CsvSource({"11,99,admin", "99,42,admin", "11,42,cashier"})
    void changedSessionCannotAuthorizeOriginalCompanyContext(long user, long company, String role) {
        var fixture = new TerminalRequestGuardFixtures();
        when(fixture.auth.currentUser(fixture.session)).thenReturn(Optional.of(
            new AuthSessionUser(user, company, "Changed session", role)));
        when(fixture.tabs.canAccess(any(), any())).thenReturn(true);
        assertTrue(fixture.guard.read(fixture.session).denied());
        verifyNoInteractions(fixture.tabs);
    }
    @Test void sessionExpiredBetweenBaseAndTabCheckFailsClosed() {
        var fixture = new TerminalRequestGuardFixtures();
        when(fixture.auth.currentUser(fixture.session)).thenReturn(Optional.empty());
        assertTrue(fixture.guard.setupRead(fixture.session).denied());
        verifyNoInteractions(fixture.tabs);
    }
}
