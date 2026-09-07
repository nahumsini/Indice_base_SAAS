package com.indice.erp.kpis.currency;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(BasicModuleKpiCurrencyRepository.class)
class KpiMonetaryFlowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired BasicModuleKpiCurrencyRepository repository;
    long companyId;
    String token;

    @BeforeEach
    void setUp() {
        token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", token);
        companyId = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, token);
    }

    @Test
    void expensePaymentsBelongToPaymentPeriodAndKeepNativeCurrency() {
        jdbc.update("""
            INSERT INTO finance_expenses
              (company_id, folio, concept, expense_type, subtotal_amount, total_amount,
               paid_amount, balance_amount, currency_code, expense_date, payment_date, status, payment_status)
            VALUES (?, ?, 'Period crossing', 'VARIABLE', 116, 116, 40, 76, 'USD',
                    '2026-08-31', '2026-09-06', 'PARTIALLY_PAID', 'PARTIALLY_PAID')
            """, companyId, token);
        long expenseId = jdbc.queryForObject("SELECT id FROM finance_expenses WHERE company_id = ? AND folio = ?",
            Long.class, companyId, token);
        jdbc.update("""
            INSERT INTO finance_expense_payments
              (company_id, expense_id, amount, currency_code, payment_date, source)
            VALUES (?, ?, 40, 'USD', '2026-09-06', 'RECORDED')
            """, companyId, expenseId);
        var september = repository.load(BasicModuleKpiMetric.EXPENSE_PAID, companyId,
            LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), List.of(expenseId), true);
        assertThat(september).singleElement().satisfies(value -> {
            assertThat(value.amount()).isEqualByComparingTo("40");
            assertThat(value.currency()).isEqualTo("USD");
        });
        assertThat(repository.load(BasicModuleKpiMetric.EXPENSE_PAID, companyId,
            LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31), List.of(expenseId), true)).isEmpty();
        assertThat(repository.load(BasicModuleKpiMetric.EXPENSE_PAID, companyId + 1000000,
            null, null, List.of(expenseId), true)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT paid_amount FROM finance_expenses WHERE id = ?",
            BigDecimal.class, expenseId)).isEqualByComparingTo("40");
    }

    @Test
    void cancelledSalesDoNotInflateAnyMonetarySalesMeasure() {
        jdbc.update("""
            INSERT INTO sales_records
              (company_id, sale_number, customer_name, sale_date, total_amount, tax_total,
               commission_amount, currency, commercial_status)
            VALUES (?, ?, 'Customer', '2026-09-06', 116, 16, 5, 'CAD', 'cancelled')
            """, companyId, token);
        for (var metric : List.of(BasicModuleKpiMetric.SALES_TOTAL,
                BasicModuleKpiMetric.SALES_TAX, BasicModuleKpiMetric.SALES_COMMISSION)) {
            assertThat(repository.load(metric, companyId, null, null, List.of(), false)).isEmpty();
        }
    }

    @Test
    void timestampPeriodsIncludeTheWholeLastDayAndExcludeTheNextDay() {
        jdbc.update("""
            INSERT INTO finance_credit_policies
              (company_id, customer_name, currency_code, credit_line_amount, available_credit_amount, status,
               created_at)
            VALUES (?, ?, 'BRL', 100, 100, 'ACTIVE', '2026-09-30 23:59:59'),
                   (?, ?, 'BRL', 200, 200, 'ACTIVE', '2026-10-01 00:00:00')
            """, companyId, token + "-last", companyId, token + "-next");
        var result = repository.load(BasicModuleKpiMetric.CREDIT_POLICY_LINE, companyId,
            LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30), List.of(), false);
        assertThat(result).singleElement().satisfies(value -> {
            assertThat(value.amount()).isEqualByComparingTo("100");
            assertThat(value.currency()).isEqualTo("BRL");
        });
    }
}
