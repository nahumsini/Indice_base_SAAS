package com.indice.erp.pos.square;

import com.indice.erp.pos.PosRequestGuard;
import com.indice.erp.pos.terminal.PaymentTerminalRequestGuard;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SquareRefundControllerTest {
    @Test void deniedAdminCsrfGuardPreventsRefundSubmission() {
        var base = mock(PosRequestGuard.class); var guard = new PaymentTerminalRequestGuard(base, null, null);
        var refunds = mock(SquareRefundService.class);
        var reviews = mock(SquareRefundReviewService.class); var session = mock(HttpSession.class);
        when(base.requireAdminWriteAccess(session, "csrf")).thenReturn(new PosRequestGuard.Result(null,
            ResponseEntity.status(403).body(java.util.Map.of("message", "Forbidden"))));
        var response = new SquareRefundController(guard, refunds, reviews).refund(91L, session,
            "csrf", new SquareRefundRequest("key", new BigDecimal("2.50"), "Return"));
        assertThat(response.getStatusCode().value()).isEqualTo(403);
        verifyNoInteractions(refunds, reviews);
    }
}
