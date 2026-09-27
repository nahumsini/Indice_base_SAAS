package com.indice.erp.pos.mercadopago;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class MpDispatchStoreTest {
    @Test void stolenLeaseCannotSilentlyLoseReturnedProviderOrder() {
        var jdbc = mock(JdbcTemplate.class);
        var intent = MpPaymentTestFixtures.intent();
        when(jdbc.update(contains("order_id=COALESCE"), any(Object[].class))).thenReturn(0);
        assertThrows(IllegalStateException.class,
            () -> new MpDispatchStore(jdbc).order(intent, "expired-lease", "ORDaccepted"));
    }
}
