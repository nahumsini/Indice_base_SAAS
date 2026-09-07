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
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(42L), eq(LocalDate.of(2026, 8, 1)), eq(LocalDate.of(2026, 9, 1)));
        org.assertj.core.api.Assertions.assertThat(sql.getValue())
            .contains("FROM finance_expenses")
            .contains("company_id = ?")
            .contains("expense_date >= ?")
            .contains("expense_date < ?")
            .doesNotContain("42");
    }

    @Test
    void readsCardSalesFromThePersistedClosingPaymentSnapshot() {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new BasicModuleKpiCurrencyRepository(jdbc);

        repository.load(
            BasicModuleKpiMetric.POS_CLOSING_CARD_SALES,
            42L,
            null,
            null,
            List.of(15L),
            true
        );

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(42L), eq(15L));
        org.assertj.core.api.Assertions.assertThat(sql.getValue())
            .contains("FROM pos_cash_closings c")
            .contains("JSON_TABLE")
            .contains("payment.payment_method = 'CARD'")
            .contains("c.id IN (?)")
            .contains("c.company_id = ?");
    }

    @Test
    void readsVarianceAndRefundMetricsFromThePersistedClosing() {
        assertClosingMetricSql(
            BasicModuleKpiMetric.POS_CLOSING_ABSOLUTE_DIFFERENCE,
            "ABS(c.over_short_amount)"
        );
        assertClosingMetricSql(
            BasicModuleKpiMetric.POS_CLOSING_SHORTAGE,
            "c.over_short_amount < 0"
        );
        assertClosingMetricSql(
            BasicModuleKpiMetric.POS_CLOSING_OVERAGE,
            "c.over_short_amount > 0"
        );
        assertClosingMetricSql(
            BasicModuleKpiMetric.POS_CLOSING_REFUNDS,
            "c.total_refunds_amount"
        );
    }

    private void assertClosingMetricSql(BasicModuleKpiMetric metric, String expectedExpression) {
        var jdbc = mock(JdbcTemplate.class);
        var repository = new BasicModuleKpiCurrencyRepository(jdbc);

        repository.load(metric, 42L, null, null, List.of(15L), true);

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(42L), eq(15L));
        org.assertj.core.api.Assertions.assertThat(sql.getValue())
            .contains(expectedExpression)
            .contains("c.id IN (?)")
            .contains("c.company_id = ?");
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

    @Test
    void accountingKpisExcludeExternallyManagedFunds() {
        var balanceJdbc = mock(JdbcTemplate.class);
        var statementJdbc = mock(JdbcTemplate.class);
        var movementJdbc = mock(JdbcTemplate.class);
        var settlementJdbc = mock(JdbcTemplate.class);

        new BasicModuleKpiCurrencyRepository(balanceJdbc).load(
            BasicModuleKpiMetric.PETTY_CASH_BALANCE, 42L, null, null, List.of(), false
        );
        new BasicModuleKpiCurrencyRepository(statementJdbc).load(
            BasicModuleKpiMetric.PETTY_CASH_STATEMENT_VERIFIED, 42L, null, null, List.of(), false
        );
        new BasicModuleKpiCurrencyRepository(movementJdbc).load(
            BasicModuleKpiMetric.PETTY_CASH_MOVEMENT_AMOUNT, 42L, null, null, List.of(), false
        );
        new BasicModuleKpiCurrencyRepository(settlementJdbc).load(
            BasicModuleKpiMetric.PETTY_CASH_SETTLEMENT_AMOUNT, 42L, null, null, List.of(), false
        );

        var balanceSql = ArgumentCaptor.forClass(String.class);
        var statementSql = ArgumentCaptor.forClass(String.class);
        var movementSql = ArgumentCaptor.forClass(String.class);
        var settlementSql = ArgumentCaptor.forClass(String.class);
        verify(balanceJdbc).query(balanceSql.capture(), any(RowMapper.class), eq(42L));
        verify(statementJdbc).query(statementSql.capture(), any(RowMapper.class), eq(42L));
        verify(movementJdbc).query(movementSql.capture(), any(RowMapper.class), eq(42L));
        verify(settlementJdbc).query(settlementSql.capture(), any(RowMapper.class), eq(42L));

        org.assertj.core.api.Assertions.assertThat(balanceSql.getValue())
            .contains("fund_type = 'INTERNAL_COMPANY'");
        org.assertj.core.api.Assertions.assertThat(statementSql.getValue())
            .contains("fund_type_snapshot = 'INTERNAL_COMPANY'");
        org.assertj.core.api.Assertions.assertThat(movementSql.getValue())
            .contains("JOIN finance_petty_cash_statements statement_record")
            .contains("statement_record.fund_type_snapshot = 'INTERNAL_COMPANY'")
            .contains("movement.company_id = ?");
        org.assertj.core.api.Assertions.assertThat(settlementSql.getValue())
            .contains("JOIN finance_petty_cash_statements statement_record")
            .contains("statement_record.fund_type_snapshot = 'INTERNAL_COMPANY'")
            .contains("settlement_line.company_id = ?");
    }
}
