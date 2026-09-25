package com.indice.erp.pos.square;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class SquareOAuthStateStoreTest {
    private final PosContext context = new PosContext(11L, 7L, "Synthetic", "admin", true, PosScope.corporateOffice());
    private final Instant now = Instant.parse("2026-09-18T12:00:00Z");
    @Test void rejectedStateCannotReadCredentialsAndQueryBindsAllAuthority() {
        var jdbc = mock(JdbcTemplate.class);
        assertThrows(PosApiException.class, () -> new SquareOAuthStateStore(jdbc).consume(context, "hash", "sandbox", now));
        verify(jdbc).update(contains("WHERE company_id=? AND user_id=? AND environment=? AND state_hash=?"),
            eq(Timestamp.from(now)), eq(7L), eq(11L), eq("sandbox"), eq("hash"), eq(Timestamp.from(now)));
        verify(jdbc, never()).query(anyString(), any(RowMapper.class), any(Object[].class));
    }
    @Test void successfulReadRemainsScopedAfterSingleUseConsumption() {
        var jdbc = mock(JdbcTemplate.class);
        var stored = new SquareConnectionRepository.OAuthState(3, 7, 11, "sandbox");
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of(stored));
        assertEquals(stored, new SquareOAuthStateStore(jdbc).consume(context, "hash", "sandbox", now));
        verify(jdbc).query(contains("WHERE company_id=? AND user_id=? AND environment=? AND state_hash=?"),
            any(RowMapper.class), eq(7L), eq(11L), eq("sandbox"), eq("hash"));
    }
}
