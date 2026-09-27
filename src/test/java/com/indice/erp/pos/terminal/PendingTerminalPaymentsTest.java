package com.indice.erp.pos.terminal;

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

class PendingTerminalPaymentsTest {
    @Test void merchantReviewPaymentsContinueToBlockTheRegister() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .thenReturn(List.of());
        var context = new PosContext(4L, 9L, "Owner", "admin", true, PosScope.corporateOffice());

        new PendingTerminalPayments(jdbc).find(context, 22L);

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(2)).query(sql.capture(), any(RowMapper.class), any(Object[].class));
        assertTrue(sql.getAllValues().stream().allMatch(value ->
            value.contains("RECONCILIATION_REQUIRED") && value.contains("company_id = ?")
                && value.contains("cash_register_id = ?")));
    }
}
