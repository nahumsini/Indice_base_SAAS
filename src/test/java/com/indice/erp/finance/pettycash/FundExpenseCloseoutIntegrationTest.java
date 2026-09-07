package com.indice.erp.finance.pettycash;

import static org.assertj.core.api.Assertions.assertThat;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class FundExpenseCloseoutIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired PettyCashRepository repository;
    @Autowired ExpenseService expenses;

    @Test
    void custodyFundingDoesNotConsumeBudgetAndAuthorizationRecordsPaymentOnlyOnce() {
        var token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", token);
        long company = id("companies", "name", token);
        jdbc.update("INSERT INTO users (email, password_hash) VALUES (?, 'isolated-test-no-login')", token + "@example.test");
        long user = id("users", "email", token + "@example.test");
        var context = new FinanceContext(user, company, "Test", "admin", true, FinanceScope.corporateOffice());
        jdbc.update("""
            INSERT INTO finance_budgets (company_id, name, period_start, period_end, status, currency_code)
            VALUES (?, ?, '2026-09-01', '2026-09-30', 'ACTIVE', 'USD')
            """, company, token);
        long budget = id("finance_budgets", "name", token);
        jdbc.update("""
            INSERT INTO finance_budget_lines
              (company_id, budget_id, name, planned_amount, available_amount, health_status, currency_code)
            VALUES (?, ?, ?, 1000, 1000, 'ON_TRACK', 'USD')
            """, company, budget, token);
        long budgetLine = id("finance_budget_lines", "name", token);
        repository.applyMovementToBudgetLine(context, budgetLine, PettyCashMovementType.INITIAL_FUNDING, new BigDecimal("1200"));
        assertThat(amount("finance_budget_lines", "available_amount", budgetLine)).isEqualByComparingTo("1000");
        assertThat(amount("finance_budget_lines", "petty_cash_issued_amount", budgetLine)).isEqualByComparingTo("1200");
        jdbc.update("""
            INSERT INTO finance_petty_cash_funds
              (company_id, budget_id, budget_line_id, name, currency_code, limit_amount,
               current_balance_amount, cut_off_day, status, fund_type)
            VALUES (?, ?, ?, ?, 'USD', 1200, 900, 15, 'OPEN', 'INTERNAL_COMPANY')
            """, company, budget, budgetLine, token);
        long fund = id("finance_petty_cash_funds", "name", token);
        jdbc.update("""
            INSERT INTO finance_petty_cash_statements
              (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end,
               cut_off_date, currency_code, status, fund_type_snapshot, estimated_usage_amount)
            VALUES (?, ?, ?, '2026-09', '2026-09-01', '2026-09-30', '2026-09-30',
                    'USD', 'CUT_PENDING', 'INTERNAL_COMPANY', 300)
            """, company, fund, token);
        long statement = id("finance_petty_cash_statements", "folio", token);
        jdbc.update("""
            INSERT INTO finance_petty_cash_settlement_lines
              (company_id, petty_cash_fund_id, petty_cash_statement_id, description, subtotal_amount,
               tax_amount, total_amount, currency_code, expense_date, attachment_count, status)
            VALUES (?, ?, ?, ?, 200, 0, 200, 'USD', '2026-09-05', 1, 'RECEIPT_ATTACHED')
            """, company, fund, statement, token);
        long receipt = id("finance_petty_cash_settlement_lines", "description", token);
        var fundRecord = repository.findFundById(context, fund).orElseThrow();
        var statementRecord = repository.findStatementById(context, statement).orElseThrow();
        var line = repository.findSettlementLineById(context, receipt).orElseThrow();
        long expense = repository.insertExpenseFromSettlementLine(context, fundRecord, statementRecord, line);
        repository.linkSettlementLineExpense(context, receipt, expense);
        expenses.recordCustodySettlement(context, expense, receipt);
        expenses.recordCustodySettlement(context, expense, receipt);
        repository.applySettlementLineExpenseToStatement(context, statement, new BigDecimal("200"));
        repository.applySettlementLineToBudgetLine(context, budgetLine, new BigDecimal("200"));
        assertThat(amount("finance_budget_lines", "available_amount", budgetLine)).isEqualByComparingTo("800");
        assertThat(amount("finance_budget_lines", "actual_expense_amount", budgetLine)).isEqualByComparingTo("200");
        assertThat(repository.findStatementById(context, statement).orElseThrow().status()).isEqualTo(PettyCashStatementStatus.PARTIALLY_SETTLED);
        assertThat(amount("finance_petty_cash_funds", "current_balance_amount", fund)).isEqualByComparingTo("900");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_expense_payments WHERE company_id = ? AND expense_id = ?", Integer.class, company, expense)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT SUM(amount) FROM finance_expense_payments WHERE company_id = ? AND expense_id = ?", BigDecimal.class, company, expense)).isEqualByComparingTo("200");
    }

    private long id(String table, String field, String value) {
        return jdbc.queryForObject("SELECT id FROM " + table + " WHERE " + field + " = ?", Long.class, value);
    }
    private BigDecimal amount(String table, String field, long id) {
        return jdbc.queryForObject("SELECT " + field + " FROM " + table + " WHERE id = ?", BigDecimal.class, id);
    }
}
