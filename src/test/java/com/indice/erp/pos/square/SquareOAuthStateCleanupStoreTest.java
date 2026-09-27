package com.indice.erp.pos.square;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class SquareOAuthStateCleanupStoreTest {
    @Test void expiryCleanupIsTimeBoundedAndBatchBounded() {
        var jdbc=mock(JdbcTemplate.class); var now=Instant.parse("2026-09-22T12:00:00Z");
        when(jdbc.update(anyString(),any(Object[].class))).thenReturn(250);
        var deleted=new SquareOAuthStateCleanupStore(jdbc).deleteExpired(now,999);
        assertEquals(250,deleted);
        verify(jdbc).update(contains("expires_at<=?"),eq(Timestamp.from(now)),eq(500));
    }
}
