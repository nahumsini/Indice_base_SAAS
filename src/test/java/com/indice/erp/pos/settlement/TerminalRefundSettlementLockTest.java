package com.indice.erp.pos.settlement;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TerminalRefundSettlementLockTest {
    @Test void locksTenantSettlementBeforePostingChecks() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(), any(org.springframework.jdbc.core.RowMapper.class),
            any(Object[].class))).thenReturn(List.of());
        new TerminalRefundSettlementLock(jdbc).lock(7L, 25L);
        var sql = ArgumentCaptor.forClass(String.class);
        var args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).query(sql.capture(), any(org.springframework.jdbc.core.RowMapper.class), args.capture());
        assertThat(sql.getValue()).contains("WHERE company_id=? AND id=? FOR UPDATE");
        assertThat(args.getValue()).containsExactly(7L, 25L);
    }
}
