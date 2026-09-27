package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MpPointAdmissionScopeTest {
    @Test void rejectionLookupRequiresTenantOriginalActorRegisterAndFrozenBusinessScope() {
        var jdbc = mock(JdbcTemplate.class);
        var reader = new MpPaymentAdmissionReader(jdbc);
        var context = new PosContext(11L, 42L, "Test", "cashier", true, PosScope.businessOffice(6L, 7L));
        reader.rejected(context, "original_key", 9);
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(42L), eq("original_key"), eq(9L), eq(11L), eq(7L));
        assertTrue(sql.getValue().contains("a.created_by_user_id=?"));
        assertTrue(sql.getValue().contains("a.status='REJECTED'"));
        assertTrue(sql.getValue().contains("a.business_id = ?"));
        assertFalse(sql.getValue().contains("JOIN pos_cash_registers"));
    }
    @Test void keyMutexReadAlwaysUsesTenantAndRowLock() {
        var jdbc = mock(JdbcTemplate.class);
        var reader = new MpPaymentAdmissionReader(jdbc);
        assertThrows(java.util.NoSuchElementException.class, () -> reader.lock(42, "original_key"));
        verify(jdbc).query(contains("WHERE company_id=? AND idempotency_key=? FOR UPDATE"),
            any(RowMapper.class), eq(42L), eq("original_key"));
    }
}
