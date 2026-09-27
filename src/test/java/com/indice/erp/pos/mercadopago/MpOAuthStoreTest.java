package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.sql.Timestamp;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpOAuthStoreTest {
    @Test void rejectedStateCannotReadOrExchangeCredentials() {
        var jdbc = mock(JdbcTemplate.class);
        var store = new MpOAuthStore(jdbc, mock(MpPaymentAudit.class));
        assertThrows(PosApiException.class, () -> store.consume(MpTestFixtures.context(), "hash", MpTestFixtures.NOW));
        verify(jdbc).query(contains("expires_at>? FOR UPDATE"), any(RowMapper.class),
            eq(42L), eq(11L), eq("hash"), eq(Timestamp.from(MpTestFixtures.NOW)));
        verify(jdbc, never()).update(startsWith("DELETE"), any(Object[].class));
    }
    @Test void successfulConsumptionIsBoundToCompanyAndInitiatingActor() {
        var jdbc = mock(JdbcTemplate.class);
        var state = new MpOAuthState(42, 11, "sandbox", "encrypted-verifier");
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of(state));
        var store = new MpOAuthStore(jdbc, mock(MpPaymentAudit.class));
        assertEquals(state, store.consume(MpTestFixtures.context(), "hash", MpTestFixtures.NOW));
        verify(jdbc).query(contains("FOR UPDATE"), any(RowMapper.class),
            eq(42L), eq(11L), eq("hash"), eq(Timestamp.from(MpTestFixtures.NOW)));
        verify(jdbc).update(startsWith("DELETE"), eq(42L), eq(11L), eq("hash"));
    }
}
