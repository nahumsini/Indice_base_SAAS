package com.indice.erp.pos.cashregister;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class CashRegisterRepositoryWarehouseLockTest {

    @Test
    void mutationLookupLocksTheActiveTenantWarehouseAgainstConcurrentDeletion() {
        var jdbc = new RecordingJdbcTemplate();
        var repository = new CashRegisterRepository(jdbc, mock(CashRegisterMapper.class));
        var context = new PosContext(7L, 19L, "Admin", "admin", true, PosScope.corporateOffice());

        assertThat(repository.findWarehouseForMutation(context, 74L)).isEmpty();

        assertThat(jdbc.querySql)
            .contains("warehouse.company_id = ?")
            .contains("warehouse.id = ?")
            .contains("warehouse.deleted_at IS NULL")
            .contains("LOWER(COALESCE(warehouse.status, 'active')) = 'active'")
            .endsWith("FOR UPDATE");
        assertThat(jdbc.queryArgs).containsExactly(19L, 74L);
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private String querySql;
        private Object[] queryArgs = new Object[0];

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            querySql = sql;
            queryArgs = args;
            return List.of();
        }
    }
}
