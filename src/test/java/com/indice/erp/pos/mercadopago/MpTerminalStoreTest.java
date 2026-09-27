package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpTerminalStoreTest {
    @Test void hiddenTerminalIsScopedToCompanyConnectionEnvironmentAndBusiness() {
        var jdbc = mock(JdbcTemplate.class);
        var store = new MpTerminalStore(jdbc, new MpProperties(), new MpTerminalMapper(new MpProperties(), MpTestFixtures.CLOCK));
        var context = new PosContext(11L, 42L, "Test", "admin", true, PosScope.businessOffice(7L, 8L));
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of());
        assertThrows(PosApiException.class, () -> store.require(context, 5, false));
        var sql = ArgumentCaptor.forClass(String.class);
        var params = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), params.capture());
        assertArrayEquals(new Object[]{42L, "sandbox", 8L, 5L}, params.getValue());
        assertTrue(sql.getValue().contains("c.company_id=t.company_id"));
        assertTrue(sql.getValue().contains("r.company_id=t.company_id"));
        assertTrue(sql.getValue().contains("r.business_id = ?"));
        assertTrue(sql.getValue().contains("r.deleted_at IS NULL"));
    }
    @Test void assignedLookupRequiresCompanyScopedBinding() {
        var jdbc = mock(JdbcTemplate.class);
        var store = new MpTerminalStore(jdbc, new MpProperties(), new MpTerminalMapper(new MpProperties(), MpTestFixtures.CLOCK));
        assertThrows(PosApiException.class, () -> store.requireBinding(MpTestFixtures.context(), 9));
        verify(jdbc).query(contains("t.cash_register_id=?"),
            any(RowMapper.class), eq(42L), eq("sandbox"), eq(9L));
    }
}
