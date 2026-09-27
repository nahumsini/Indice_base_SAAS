package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PosReturnRepositoryTest {
    @Test void lookupScopesTheTicketAndEveryProviderJoinToTheAuthenticatedTenant() {
        var jdbc = mock(JdbcTemplate.class);
        var context = new PosContext(11L, 42L, "Owner", "admin", true, PosScope.businessOffice(6L, 7L));
        new PosReturnRepository(jdbc).find(context, "POS-TEST");
        var sql = ArgumentCaptor.forClass(String.class);
        var args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), args.capture());
        assertTrue(sql.getValue().contains("tenant.company_id=t.company_id"));
        assertTrue(sql.getValue().contains("x.company_id=i.company_id"));
        assertTrue(sql.getValue().contains("x.company_id=r.company_id"));
        assertTrue(sql.getValue().contains("pos_mercado_pago_payment_intents"));
        assertTrue(sql.getValue().contains("pos_square_terminal_payment_intents"));
        assertTrue(sql.getValue().contains("rr.company_id=t.company_id"));
        assertTrue(sql.getValue().contains("t.business_id = ?"));
        assertEquals(List.of(42L, "POS-TEST", 7L), Arrays.asList(args.getValue()));
    }
}
