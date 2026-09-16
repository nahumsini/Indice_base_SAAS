package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.hr.HrOperationalScope;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class SalesKpiWorkspaceScopeTest {

    @Test
    void directSourcesAreTenantAndBusinessScopedInTheQuery() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        repository.kpiContacts(41L, HrOperationalScope.businessOffice(7L, 19L));
        repository.kpiOpportunities(41L, HrOperationalScope.businessOffice(7L, 19L));
        repository.kpiSales(41L, HrOperationalScope.businessOffice(7L, 19L));

        assertThat(jdbc.calls).hasSize(3);
        for (var call : jdbc.calls) {
            assertThat(call.sql()).contains("company_id = ?").contains("business_id = ?");
            assertThat(call.args()).containsExactly(41L, 19L);
        }
    }

    @Test
    void quoteScopeUsesItsOpportunityOwnerAndContactFallbackWithoutTrustingQuoteFields() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        repository.kpiQuotes(41L, HrOperationalScope.unitHeadquarters(7L));

        var call = jdbc.calls.getFirst();
        assertThat(call.sql())
            .contains("FROM sales_quotes")
            .contains("EXISTS (SELECT 1 FROM sales_opportunities owner")
            .contains("sales_quotes.opportunity_id")
            .contains("sales_quotes.opportunity_id IS NULL")
            .contains("EXISTS (SELECT 1 FROM sales_contacts owner")
            .contains("owner.unit_id = ?");
        assertThat(call.args()).containsExactly(41L, 7L, 7L, 7L, 7L);
    }

    @Test
    void unassignedScopeFailsClosedForRowsAndFilterOptions() {
        var jdbc = new CapturingJdbcTemplate();
        var repository = new SalesRepository(jdbc, new ObjectMapper());

        repository.kpiContacts(41L, HrOperationalScope.unassigned());

        assertThat(jdbc.calls.getFirst().sql()).contains("AND 1 = 0");
        assertThat(repository.kpiUnits(41L, HrOperationalScope.unassigned())).isEmpty();
        assertThat(repository.kpiBusinesses(41L, HrOperationalScope.unassigned())).isEmpty();
        assertThat(jdbc.calls).hasSize(1);
    }

    private record QueryCall(String sql, Object[] args) {}

    private static final class CapturingJdbcTemplate extends JdbcTemplate {
        private final List<QueryCall> calls = new ArrayList<>();

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            calls.add(new QueryCall(sql, args));
            return List.of();
        }
    }
}
