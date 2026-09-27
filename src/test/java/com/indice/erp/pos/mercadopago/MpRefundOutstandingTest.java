package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpRefundOutstandingTest {
    @Test void preventsDifferentRequestKeysFromOverReservingUnresolvedMoney() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(Long.class), eq(42L), eq(17L)))
            .thenReturn(List.of(19L), List.of());
        var guard = new MpRefundOutstanding(jdbc);
        assertThrows(PosApiException.class, () -> guard.assertNone(MpPaymentTestFixtures.intent()));
        assertDoesNotThrow(() -> guard.assertNone(MpPaymentTestFixtures.intent()));
        verify(jdbc, times(2)).queryForList(contains("WHERE company_id=? AND intent_id=?"),
            eq(Long.class), eq(42L), eq(17L));
    }
}
