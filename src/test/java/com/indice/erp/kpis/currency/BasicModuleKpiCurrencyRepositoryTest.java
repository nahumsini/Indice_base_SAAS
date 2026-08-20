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

    @Test
    void opportunityPipelineUsesLinkedCommercialQuotesInsteadOfManualEstimatedValue() {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new BasicModuleKpiCurrencyRepository(jdbc);

        repository.load(
            BasicModuleKpiMetric.SALES_OPPORTUNITY_PIPELINE,
            42L,
            null,
            null,
            List.of(7L, 8L),
            true
        );

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(42L), eq(7L), eq(8L));
        org.assertj.core.api.Assertions.assertThat(sql.getValue())
            .contains("FROM sales_quotes q JOIN sales_opportunities o")
            .contains("COALESCE(q.amount, 0) AS amount")
            .contains("q.currency AS currency")
            .contains("o.company_id = ?")
            .contains("o.id IN (?,?)")
            .contains("LOWER(COALESCE(o.stage, '')) NOT IN ('won', 'lost')")
            .contains("'draft', 'sent', 'viewed', 'negotiation', 'approved', 'closed_won'")
            .doesNotContain("estimated_value");
    }

    @Test
    void wonAndLostOpportunityMetricsUseTheSameLinkedQuoteSource() {
        var wonJdbc = mock(JdbcTemplate.class);
        var lostJdbc = mock(JdbcTemplate.class);

        new BasicModuleKpiCurrencyRepository(wonJdbc).load(
            BasicModuleKpiMetric.SALES_OPPORTUNITY_WON, 42L, null, null, List.of(), false
        );
        new BasicModuleKpiCurrencyRepository(lostJdbc).load(
            BasicModuleKpiMetric.SALES_OPPORTUNITY_LOST, 42L, null, null, List.of(), false
        );

        var wonSql = ArgumentCaptor.forClass(String.class);
        var lostSql = ArgumentCaptor.forClass(String.class);
        verify(wonJdbc).query(wonSql.capture(), any(RowMapper.class), eq(42L));
        verify(lostJdbc).query(lostSql.capture(), any(RowMapper.class), eq(42L));

        org.assertj.core.api.Assertions.assertThat(wonSql.getValue())
            .contains("FROM sales_quotes q JOIN sales_opportunities o")
            .contains("LOWER(COALESCE(o.stage, '')) = 'won'")
            .doesNotContain("estimated_value");
        org.assertj.core.api.Assertions.assertThat(lostSql.getValue())
            .contains("FROM sales_quotes q JOIN sales_opportunities o")
            .contains("LOWER(COALESCE(o.stage, '')) = 'lost'")
            .doesNotContain("estimated_value");
    }
}
