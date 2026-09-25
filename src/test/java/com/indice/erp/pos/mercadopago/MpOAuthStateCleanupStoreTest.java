package com.indice.erp.pos.mercadopago;

import java.sql.Timestamp;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpOAuthStateCleanupStoreTest {
    @Test void expiryCleanupIsTimeBoundedAndBatchBounded() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(anyString(), any(Object[].class))).thenReturn(250);
        var deleted = new MpOAuthStateCleanupStore(jdbc).deleteExpired(MpTestFixtures.NOW, 999);
        assertEquals(250, deleted);
        verify(jdbc).update(contains("expires_at<=?"), eq(Timestamp.from(MpTestFixtures.NOW)), eq(500));
    }
}
