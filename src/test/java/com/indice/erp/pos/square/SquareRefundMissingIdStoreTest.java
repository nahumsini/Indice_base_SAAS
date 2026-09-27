package com.indice.erp.pos.square;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareRefundMissingIdStoreTest {
    @Test void operatorClaimIsVersionedAndIndependentOfExhaustedAutomaticAttempts() {
        var jdbc = mock(JdbcTemplate.class);
        var refund = SquareRefundFixtures.refund("RECONCILIATION_REQUIRED", null, null, 99, 3, 0, 4L);
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        var claimed = new SquareRefundMissingIdStore(jdbc).claim(refund, "lease-1",
            Instant.parse("2026-09-22T12:01:30Z"));
        var sql = ArgumentCaptor.forClass(String.class); var args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(sql.capture(), args.capture());
        assertThat(claimed).isTrue();
        assertThat(sql.getValue()).contains("manual_replay_attempts=manual_replay_attempts+1",
            "version=?", "status IN ('UNCERTAIN','RECONCILIATION_REQUIRED','DEAD_LETTER')")
            .doesNotContain("manual_replay_attempts<","submission_attempts<?");
        assertThat(args.getValue()).endsWith(7L, 71L, 4L);
    }
}
