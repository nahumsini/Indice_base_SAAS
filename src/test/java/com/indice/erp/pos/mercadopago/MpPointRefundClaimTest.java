package com.indice.erp.pos.mercadopago;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointRefundClaimTest {
    @Test void onlyOneRefundWorkerCanClaimWaitingRequestWithinItsTenant() {
        var jdbc = mock(JdbcTemplate.class);
        var refund = MpRefundTestFixtures.record("WAITING");
        when(jdbc.update(contains("status='SUBMITTING'"), any(Object[].class))).thenReturn(1, 0);
        var claims = new MpRefundWorkClaims(jdbc);
        assertTrue(claims.submission(refund, "lease", Instant.now().plusSeconds(90), 3));
        assertFalse(claims.submission(refund, "lease", Instant.now().plusSeconds(90), 3));
        verify(jdbc, times(2)).update(contains("submission_attempts=submission_attempts+1"), any(Object[].class));
    }
    @Test void dispatchCompletionCannotOverwriteAlreadyConfirmedRefund() {
        var jdbc = mock(JdbcTemplate.class);
        var refund = MpRefundTestFixtures.record("WAITING");
        new MpRefundWorkStatus(jdbc).complete(refund, "lease", "UNCERTAIN", "LOST", Instant.now());
        verify(jdbc).update(contains("AND status<>'CONFIRMED'"), any(Object[].class));
    }
}
