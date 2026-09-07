package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PayrollAccountingCloseoutIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired FinancialSynchronizationService synchronization;
    @Autowired FinancialReportingService reporting;

    @Test void payrollPayableRecognizesGrossCostOnceAndUsesOnlyTheExpensePaymentForCash() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        long user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')", company, user);
        long member = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ?", Long.class, company);
        jdbc.update("""
            INSERT INTO payroll_runs (company_id, grouping_mode, pay_period, period_start_date, period_end_date,
              status, paid_at, gross_amount, deductions_amount, employer_contributions_amount, net_amount)
            VALUES (?, 'company', 'monthly', '2026-08-01', '2026-08-31', 'paid', '2026-09-01 16:00:00', 1000, 200, 100, 800)
            """, company);
        long run = jdbc.queryForObject("SELECT id FROM payroll_runs WHERE company_id = ?", Long.class, company);
        jdbc.update("""
            INSERT INTO finance_expenses (company_id, folio, concept, expense_type, subtotal_amount, total_amount,
              paid_amount, balance_amount, currency_code, expense_date, status, payment_status)
            VALUES (?, ?, 'Payroll net payable', 'VARIABLE', 800, 800, 800, 0, 'MXN', '2026-08-31', 'PAID', 'PAID')
            """, company, key);
        long expense = jdbc.queryForObject("SELECT id FROM finance_expenses WHERE company_id = ?", Long.class, company);
        jdbc.update("""
            INSERT INTO payroll_run_lines (company_id, run_id, user_company_id, user_id, user_name_snapshot,
              pay_period_snapshot, salary_type_snapshot, currency_code_snapshot, payment_route, payable_expense_id,
              gross_amount, deductions_amount, employer_contributions_amount, net_amount)
            VALUES (?, ?, ?, ?, 'Synthetic payroll fixture', 'monthly', 'fixed', 'MXN', 'expenses', ?, 1000, 200, 100, 800)
            """, company, run, member, user, expense);
        jdbc.update("""
            INSERT INTO finance_expense_payments (company_id, expense_id, amount, currency_code, payment_date,
              source, idempotency_key, registered_by_user_id)
            VALUES (?, ?, 800, 'MXN', '2026-09-01', 'RECORDED', ?, ?)
            """, company, expense, key, user);
        var from = LocalDate.of(2026, 8, 1); var to = LocalDate.of(2026, 9, 2);
        var result = synchronization.synchronize(company, user, from, to);
        assertThat(result.blocked()).isZero();
        assertThat(result.posted()).isEqualTo(2);
        assertThat(synchronization.synchronize(company, user, from, to).posted()).isZero();
        var report = reporting.report(company, from, to, null, null);
        assertThat(report.headline().operatingProfit()).isEqualByComparingTo("-1100");
        assertThat(report.headline().netCashChange()).isEqualByComparingTo("-800");
        assertThat(report.sourceCoverage()).filteredOn(row -> "payroll".equals(row.module())).singleElement().satisfies(row -> {
            assertThat(row.eligible()).isEqualTo(1); assertThat(row.posted()).isEqualTo(1);
        });
        assertThat(jdbc.queryForObject("""
            SELECT SUM(line.debit_amount - line.credit_amount) FROM finance_journal_lines line
            JOIN finance_accounting_accounts account ON account.company_id = line.company_id AND account.id = line.account_id
            WHERE line.company_id = ? AND account.system_code = 'ACCOUNTS_PAYABLE'
            """, BigDecimal.class, company)).isEqualByComparingTo("0");
        assertThat(report.statements()).filteredOn(statement -> "cash-flow".equals(statement.id())).singleElement()
            .satisfies(statement -> assertThat(statement.lines()).anySatisfy(line -> {
                assertThat(line.code()).isEqualTo("PAYROLL_PAYMENTS"); assertThat(line.current()).isEqualByComparingTo("-800");
            }));
    }
}
