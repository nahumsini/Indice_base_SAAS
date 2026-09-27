package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointIntentScopeReaderTest {
    @Test void employeeRequestLookupBindsTenantCreatorRegisterScopeAndKey() {
        var jdbc = mock(JdbcTemplate.class);
        var reader = new MpIntentReader(jdbc, new MpIntentMapper());
        var context = new PosContext(11L, 42L, "synthetic", "cashier", true, PosScope.businessOffice(6L, 7L));
        reader.byKey(context, "original_key");
        var sql = ArgumentCaptor.forClass(String.class);
        var parameters = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).query(sql.capture(), any(MpIntentMapper.class), parameters.capture());
        assertTrue(sql.getValue().contains("r.company_id=i.company_id"));
        assertTrue(sql.getValue().contains("i.company_id=?"));
        assertTrue(sql.getValue().contains("i.created_by_user_id = ?"));
        assertTrue(sql.getValue().contains("s.company_id=i.company_id"));
        assertTrue(sql.getValue().contains("s.business_id = ?"));
        assertEquals(List.of(42L, "original_key", 11L, 7L, 1), Arrays.asList(parameters.getValue()));
    }
    @Test void tenantAdministratorPendingListRetainsTenantAndNarrowUnitScope() {
        var jdbc = mock(JdbcTemplate.class);
        var context = new PosContext(11L, 42L, "synthetic", "admin", true, PosScope.unitHeadquarters(6L));
        new MpIntentReader(jdbc, new MpIntentMapper()).pending(context, 9L, 11L, 100);
        var parameters = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).query(contains("i.company_id=?"), any(MpIntentMapper.class), parameters.capture());
        assertEquals(List.of(42L, 9L, 11L, 6L, 6L, 50), Arrays.asList(parameters.getValue()));
    }
}
