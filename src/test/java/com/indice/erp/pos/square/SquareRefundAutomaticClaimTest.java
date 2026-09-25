package com.indice.erp.pos.square;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SquareRefundAutomaticClaimTest {
    @Test void automaticClaimOnlyAllowsWaitingOrExpiredSubmitting() {
        var jdbc=mock(JdbcTemplate.class); var claim=new SquareRefundClaims(jdbc);
        var refund=SquareRefundFixtures.refund("UNCERTAIN",null,null);
        claim.submission(refund,"lease",Instant.parse("2026-09-22T12:01:30Z"),3);
        var sql=ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(sql.capture(),any(Object[].class));
        assertThat(sql.getValue()).contains("status='WAITING'","status='SUBMITTING'",
            "provider_refund_id IS NULL","manual_replay_attempts=0")
            .doesNotContain("status='UNCERTAIN'");
    }
}
