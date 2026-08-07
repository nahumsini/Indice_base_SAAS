package com.indice.erp.kpis.currency;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class BasicModuleKpiCurrencyRepositoryTest {

    @Test
    void usesClosedServerSideDefinitionAndTenantScope() {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new BasicModuleKpiCurrencyRepository(jdbc);

        repository.load(
            BasicModuleKpiMetric.EXPENSE_TOTAL,
            42L,
            LocalDate.of(2026, 8, 1),
            LocalDate.of(2026, 8, 31),
            List.of(),
            false
        );

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(42L), eq(LocalDate.of(2026, 8, 1)), eq(LocalDate.of(2026, 8, 31)));
        org.assertj.core.api.Assertions.assertThat(sql.getValue())
            .contains("FROM finance_expenses")
            .contains("company_id = ?")
            .contains("expense_date >= ?")
            .contains("expense_date <= ?")
            .doesNotContain("42");
    }
}
