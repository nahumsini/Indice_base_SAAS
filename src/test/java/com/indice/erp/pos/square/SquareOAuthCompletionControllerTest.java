package com.indice.erp.pos.square;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpSession;

class SquareOAuthCompletionControllerTest {
    @ParameterizedTest @ValueSource(ints={401,403})
    void deniedAuthenticationOrCsrfCannotConsumeOAuthState(int status) {
        var base = mock(PosRequestGuard.class);
        var session = new MockHttpSession();
        when(base.requireAdminWriteAccess(session, "csrf"))
            .thenReturn(new PosRequestGuard.Result(null, ResponseEntity.status(status).build()));
        var oauth = mock(SquareOAuthCompletion.class);
        var controller = new SquareOAuthCompletionController(new PaymentTerminalRequestGuard(base, null, null), oauth);
        var result = controller.complete(session, "csrf", new SquareOAuthComplete("synthetic-code", "a".repeat(64)));
        assertEquals(status, result.getStatusCode().value());
        verify(base).requireAdminWriteAccess(session, "csrf");
        verifyNoInteractions(oauth);
        assertFalse(new SquareOAuthComplete("synthetic-code", "a".repeat(64)).toString().contains("synthetic-code"));
    }
}
