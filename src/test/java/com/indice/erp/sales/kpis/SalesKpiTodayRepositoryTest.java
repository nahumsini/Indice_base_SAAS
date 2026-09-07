package com.indice.erp.sales.kpis;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class SalesKpiTodayRepositoryTest {

    @Test
    void scopesTodayAmountsToTenantDateAndActiveRows() {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new SalesKpiTodayRepository(jdbc);
        var date = LocalDate.of(2026, 8, 31);

        repository.salesAmounts(42L, date, com.indice.erp.hr.HrOperationalScope.corporateOffice());

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(42L), eq(date));
        org.assertj.core.api.Assertions.assertThat(sql.getValue())
            .contains("FROM sales_records")
            .contains("company_id = ?")
            .contains("sale_date = ?")
            .contains("deleted_at IS NULL")
            .contains("NOT IN ('cancelled', 'canceled', 'rejected', 'voided')")
            .doesNotContain("42")
            .doesNotContain("2026-08-31");
    }
}
