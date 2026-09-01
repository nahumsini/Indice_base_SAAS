package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class AccountingSourceRepository {

    private final JdbcTemplate jdbcTemplate;

    AccountingSourceRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<SaleSource> findSales(long companyId, LocalDate from, LocalDate to) {
        return jdbcTemplate.query("""
            SELECT sale.id, sale.sale_number, sale.sale_date, sale.total_amount, sale.tax_total,
                   sale.margin_total, UPPER(sale.currency) currency, sale.unit_id, sale.business_id,
                   sale.sale_lines_json,
                   EXISTS (
                     SELECT 1 FROM finance_receivable_accounts receivable
                     WHERE receivable.company_id = sale.company_id
                       AND receivable.sales_record_id = sale.id
                       AND receivable.deleted_at IS NULL
                       AND receivable.status <> 'CANCELLED'
                   ) on_credit
            FROM sales_records sale
            WHERE sale.company_id = ?
              AND sale.deleted_at IS NULL
              AND sale.sale_date BETWEEN ? AND ?
              AND LOWER(sale.commercial_status) = 'approved'
              AND LOWER(sale.finance_status) = 'approved'
            ORDER BY sale.sale_date, sale.id
            """, (rs, rowNum) -> new SaleSource(
                rs.getLong("id"),
                rs.getString("sale_number"),
                rs.getObject("sale_date", LocalDate.class),
                money(rs.getBigDecimal("total_amount")),
                money(rs.getBigDecimal("tax_total")),
                money(rs.getBigDecimal("margin_total")),
                rs.getString("currency"),
                nullableLong(rs, "unit_id"),
                nullableLong(rs, "business_id"),
                rs.getString("sale_lines_json"),
                rs.getBoolean("on_credit")
            ), companyId, from, to);
    }

    List<ExpenseSource> findExpenses(long companyId, LocalDate from, LocalDate to) {
        return jdbcTemplate.query("""
            SELECT expense.id, expense.folio, expense.expense_date, expense.total_amount,
                   UPPER(expense.currency_code) currency_code, expense.unit_id, expense.business_id,
                   expense.accounting_account_id, expense.concept
            FROM finance_expenses expense
            WHERE expense.company_id = ?
              AND expense.deleted_at IS NULL
              AND expense.expense_date BETWEEN ? AND ?
              AND expense.status IN ('APPROVED', 'ORDERED', 'PARTIALLY_PAID', 'PAID', 'CLOSED')
              AND expense.total_amount > 0
            ORDER BY expense.expense_date, expense.id
            """, (rs, rowNum) -> new ExpenseSource(
                rs.getLong("id"),
                rs.getString("folio"),
                rs.getObject("expense_date", LocalDate.class),
                money(rs.getBigDecimal("total_amount")),
                rs.getString("currency_code"),
                nullableLong(rs, "unit_id"),
                nullableLong(rs, "business_id"),
                nullableLong(rs, "accounting_account_id"),
                rs.getString("concept")
            ), companyId, from, to);
    }

    List<ExpensePaymentSource> findExpensePayments(long companyId, LocalDate from, LocalDate to) {
        return jdbcTemplate.query("""
            SELECT payment.id, payment.expense_id, expense.folio, payment.payment_date,
                   payment.amount, UPPER(payment.currency_code) currency_code,
                   expense.unit_id, expense.business_id
            FROM finance_expense_payments payment
            JOIN finance_expenses expense
              ON expense.id = payment.expense_id AND expense.company_id = payment.company_id
            WHERE payment.company_id = ?
              AND expense.deleted_at IS NULL
              AND expense.status <> 'CANCELLED'
              AND payment.payment_date BETWEEN ? AND ?
            ORDER BY payment.payment_date, payment.id
            """, (rs, rowNum) -> new ExpensePaymentSource(
                rs.getLong("id"),
                rs.getLong("expense_id"),
                rs.getString("folio"),
                rs.getObject("payment_date", LocalDate.class),
                money(rs.getBigDecimal("amount")),
                rs.getString("currency_code"),
                nullableLong(rs, "unit_id"),
                nullableLong(rs, "business_id")
            ), companyId, from, to);
    }

    List<ReceivablePaymentSource> findReceivablePayments(long companyId, LocalDate from, LocalDate to) {
        return jdbcTemplate.query("""
            SELECT payment.id, payment.receivable_id, receivable.sale_number, payment.payment_date,
                   payment.amount, UPPER(payment.currency_code) currency_code,
                   receivable.unit_id, receivable.business_id
            FROM finance_receivable_payments payment
            JOIN finance_receivable_accounts receivable
              ON receivable.id = payment.receivable_id AND receivable.company_id = payment.company_id
            WHERE payment.company_id = ?
              AND receivable.deleted_at IS NULL
              AND receivable.status <> 'CANCELLED'
              AND payment.payment_date BETWEEN ? AND ?
            ORDER BY payment.payment_date, payment.id
            """, (rs, rowNum) -> new ReceivablePaymentSource(
                rs.getLong("id"),
                rs.getLong("receivable_id"),
                rs.getString("sale_number"),
                rs.getObject("payment_date", LocalDate.class),
                money(rs.getBigDecimal("amount")),
                rs.getString("currency_code"),
                nullableLong(rs, "unit_id"),
                nullableLong(rs, "business_id")
            ), companyId, from, to);
    }

    List<PayrollSource> findPayrollRuns(long companyId, LocalDate from, LocalDate to) {
        return jdbcTemplate.query("""
            SELECT run.id, run.period_end_date, run.status, run.gross_amount,
                   run.deductions_amount, run.employer_contributions_amount, run.net_amount,
                   run.paid_at
            FROM payroll_runs run
            WHERE run.company_id = ?
              AND (run.period_end_date BETWEEN ? AND ? OR DATE(run.paid_at) BETWEEN ? AND ?)
              AND run.status IN ('approved', 'paid')
            ORDER BY run.period_end_date, run.id
            """, (rs, rowNum) -> new PayrollSource(
                rs.getLong("id"),
                rs.getObject("period_end_date", LocalDate.class),
                rs.getString("status"),
                money(rs.getBigDecimal("gross_amount")),
                money(rs.getBigDecimal("deductions_amount")),
                money(rs.getBigDecimal("employer_contributions_amount")),
                money(rs.getBigDecimal("net_amount")),
                rs.getTimestamp("paid_at") == null
                    ? null
                    : rs.getTimestamp("paid_at").toLocalDateTime().toLocalDate()
            ), companyId, from, to, from, to);
    }

    boolean isActiveExpenseAccount(long companyId, long accountId) {
        Integer count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM finance_accounting_accounts
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
              AND account_type = 'EXPENSE' AND is_postable = TRUE
            """, Integer.class, companyId, accountId);
        return count != null && count > 0;
    }

    private static Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    record SaleSource(
        long id,
        String number,
        LocalDate date,
        BigDecimal total,
        BigDecimal tax,
        BigDecimal margin,
        String currency,
        Long unitId,
        Long businessId,
        String linesJson,
        boolean onCredit
    ) {
    }

    record ExpenseSource(
        long id,
        String folio,
        LocalDate date,
        BigDecimal total,
        String currency,
        Long unitId,
        Long businessId,
        Long accountingAccountId,
        String concept
    ) {
    }

    record ExpensePaymentSource(
        long id,
        long expenseId,
        String folio,
        LocalDate date,
        BigDecimal amount,
        String currency,
        Long unitId,
        Long businessId
    ) {
    }

    record ReceivablePaymentSource(
        long id,
        long receivableId,
        String saleNumber,
        LocalDate date,
        BigDecimal amount,
        String currency,
        Long unitId,
        Long businessId
    ) {
    }

    record PayrollSource(
        long id,
        LocalDate periodEnd,
        String status,
        BigDecimal gross,
        BigDecimal deductions,
        BigDecimal employerContributions,
        BigDecimal net,
        LocalDate paidDate
    ) {
    }
}
