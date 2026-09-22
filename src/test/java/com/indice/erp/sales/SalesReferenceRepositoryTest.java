package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.indice.erp.hr.HrOperationalScope;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class SalesReferenceRepositoryTest {
    @Test
    void rowAndCountQueriesBothApplyTenantBusinessAndBoundSearch() {
        var jdbc = new CapturingJdbc();
        var owner = new SalesReferenceRepository(jdbc);
        for (var companyId : List.of(23L, 99L)) {
            owner.customers(companyId, HrOperationalScope.businessOffice(10L, 101L), "a%' OR 1=1", 0, 10);
            var count = jdbc.calls.get(jdbc.calls.size() - 2);
            var rows = jdbc.calls.getLast();
            for (var query : List.of(count, rows)) {
                assertThat(query.sql).contains("entity.company_id = ?", "entity.business_id = ?", "deleted_at IS NULL");
                assertThat(query.sql).doesNotContain("a%' OR 1=1");
                assertThat(query.args).startsWith(companyId, 101L, "a%' OR 1=1", "a%' OR 1=1");
            }
            assertThat(rows.sql).doesNotContain("email", "phone", "fiscal", "metadata");
            assertThat(rows.sql).contains("ORDER BY entity.id ASC LIMIT ? OFFSET ?");
            assertThat(rows.args).endsWith(10, 0);
        }
    }

    @Test
    void warehouseQueriesUseUnitScopeAndUnassignedScopeCannotSeeRows() {
        var jdbc = new CapturingJdbc();
        var owner = new SalesReferenceRepository(jdbc);
        owner.warehouses(23L, HrOperationalScope.unitHeadquarters(10L), "", 0, 25);
        for (var call : jdbc.calls) {
            assertThat(call.sql).contains("TRIM(entity.business_unit_id) REGEXP '^[0-9]{1,19}$'",
                "TRIM(entity.business_id) REGEXP '^[0-9]{1,19}$'", "scope_business.company_id = entity.company_id");
            assertThat(call.sql).doesNotContain("entity.business_unit_id = ?", "scope_business.id = entity.business_id");
        }
        assertThat(jdbc.calls.getFirst().args).containsExactly(23L, 10L, 10L, "", "");
        owner.warehouses(23L, HrOperationalScope.unassigned(), "", 0, 25);
        assertThat(jdbc.calls.getLast().sql).contains("AND 1 = 0");
    }

    @Test
    void cursorBeyondCurrentAuthorizedResultIsRejectedWithoutRowQuery() {
        var jdbc = new CapturingJdbc();
        var owner = new SalesReferenceRepository(jdbc);
        assertThrows(IllegalArgumentException.class,
            () -> owner.customers(23L, HrOperationalScope.corporateOffice(), "", 2, 25));
        assertThat(jdbc.calls).hasSize(1);
    }

    private record Call(String sql, Object[] args) { }
    private static final class CapturingJdbc extends JdbcTemplate {
        final List<Call> calls = new ArrayList<>();
        @Override public <T> T queryForObject(String sql, Class<T> type, Object... args) {
            calls.add(new Call(sql, args));
            return type.cast(0);
        }
        @Override public <T> List<T> query(String sql, RowMapper<T> mapper, Object... args) {
            calls.add(new Call(sql, args));
            return List.of();
        }
    }
}
