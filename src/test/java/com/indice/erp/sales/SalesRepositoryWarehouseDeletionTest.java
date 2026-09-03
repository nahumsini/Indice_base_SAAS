package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class SalesRepositoryWarehouseDeletionTest {

    @Test
    void deletionLockIsTenantScopedAndRequiresAnActiveWarehouse() {
        var jdbc = new WarehouseGuardJdbcTemplate(7L, 74L, 2);
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        repository.lockWarehouseForDeletion(7L, 74L);

        assertThat(jdbc.lockSql)
            .contains("FROM sales_inventory_warehouses")
            .contains("company_id = ?")
            .contains("id = ?")
            .contains("deleted_at IS NULL")
            .contains("FOR UPDATE");
        assertThat(jdbc.lockArgs).containsExactly(7L, 74L);
    }

    @Test
    void anotherTenantCannotLockOrInferTheWarehouse() {
        var jdbc = new WarehouseGuardJdbcTemplate(7L, 74L, 2);
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        assertThatThrownBy(() -> repository.lockWarehouseForDeletion(8L, 74L))
            .isInstanceOf(NoSuchElementException.class)
            .hasMessage("Inventory warehouse not found.");
    }

    @Test
    void dependentRegisterCountIsTenantScopedAndIncludesEveryNonDeletedRegister() {
        var jdbc = new WarehouseGuardJdbcTemplate(7L, 74L, 2);
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        assertThat(repository.countCashRegistersForWarehouse(7L, 74L)).isEqualTo(2);

        assertThat(jdbc.countSql)
            .contains("FROM pos_cash_registers")
            .contains("company_id = ?")
            .contains("warehouse_id = ?")
            .contains("deleted_at IS NULL")
            .doesNotContain("status =")
            .doesNotContain("is_active");
        assertThat(jdbc.countArgs).containsExactly(7L, 74L);
    }

    private static final class WarehouseGuardJdbcTemplate extends JdbcTemplate {
        private final long ownerCompanyId;
        private final long warehouseId;
        private final int registerCount;
        private String lockSql;
        private Object[] lockArgs = new Object[0];
        private String countSql;
        private Object[] countArgs = new Object[0];

        private WarehouseGuardJdbcTemplate(long ownerCompanyId, long warehouseId, int registerCount) {
            this.ownerCompanyId = ownerCompanyId;
            this.warehouseId = warehouseId;
            this.registerCount = registerCount;
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            lockSql = sql;
            lockArgs = args;
            var requestedCompanyId = ((Number) args[0]).longValue();
            var requestedWarehouseId = ((Number) args[1]).longValue();
            if (requestedCompanyId != ownerCompanyId || requestedWarehouseId != warehouseId) {
                return List.of();
            }
            return (List<T>) (List<?>) List.of(warehouseId);
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            countSql = sql;
            countArgs = args;
            return (T) Integer.valueOf(registerCount);
        }
    }
}
