package com.indice.erp.pos.square;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SquareSubmissionLeaseStoreTest {
    @Test void initialClaimAtomicallyPersistsBodyBeforeDelivery() {
        var jdbc=mock(JdbcTemplate.class); when(jdbc.update(anyString(),any(Object[].class))).thenReturn(1);
        assertThat(new SquareIntentGatewayPersistence(jdbc).submitting(91,"{\"idempotency_key\":\"key\"}")).isTrue();
        verify(jdbc).update(argThat(sql -> sql.contains("square_request_json=CAST(? AS JSON)")
                && sql.contains("submission_started_at IS NULL")),
            eq("{\"idempotency_key\":\"key\"}"),eq(91L));
    }
    @Test void staleRetryIsCheckoutFreeAndCasExclusive() {
        var jdbc=mock(JdbcTemplate.class); var before=Instant.parse("2026-09-22T12:00:00Z");
        when(jdbc.update(anyString(),any(Object[].class))).thenReturn(1);
        assertThat(new SquareIntentGatewayPersistence(jdbc).retrying(91,before)).isTrue();
        verify(jdbc).update(argThat(sql -> sql.contains("square_checkout_id IS NULL")
                && sql.contains("submission_started_at<=?")),
            eq(91L),eq(Timestamp.from(before)));
    }
}
