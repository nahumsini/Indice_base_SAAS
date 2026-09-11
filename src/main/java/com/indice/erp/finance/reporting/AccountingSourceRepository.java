package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class AccountingSourceRepository {

    private final JdbcTemplate jdbcTemplate;
    private final com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones;

    AccountingSourceRepository(JdbcTemplate jdbcTemplate, com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timezones) {
        this.jdbcTemplate = jdbcTemplate;
        this.timezones = timezones;
    }

    boolean sourceInScope(long companyId, AccountingPostingModels.DiscoveryIssue issue, Long unitId, Long businessId) {
        if (unitId == null && businessId == null) return true;
        String owner = switch (issue.sourceType()) {
            case "SALE" -> "sales_records owner";
            case "INVENTORY_RECEIPT" -> "pos_inventory_receipts owner";
            case "CREDIT_SALE" -> "finance_credit_sales owner";
            case "EXPENSE" -> "finance_expenses owner";
            case "EXPENSE_PAYMENT" -> "finance_expenses owner JOIN finance_expense_payments payment ON payment.company_id = owner.company_id AND payment.expense_id = owner.id";
            case "RECEIVABLE_PAYMENT" -> "finance_receivable_accounts owner JOIN finance_receivable_payments payment ON payment.company_id = owner.company_id AND payment.receivable_id = owner.id";
            case "PAYROLL_ACCRUAL", "PAYROLL_PAYMENT" -> "payroll_run_lines owner";
            default -> null;
        };
        if (owner == null) return true;
        boolean payroll = issue.sourceType().startsWith("PAYROLL_");
        String sourceId = payroll ? "owner.run_id" : issue.sourceType().endsWith("_PAYMENT") ? "payment.id" : "owner.id";
        var args = new java.util.ArrayList<Object>(); args.add(companyId); args.add(issue.sourceId());
        String sql = "SELECT COUNT(*) FROM " + owner + " WHERE owner.company_id = ? AND " + sourceId + " = ?";
        if (unitId != null) { sql += payroll ? " AND owner.unit_id_snapshot = ?" : " AND owner.unit_id = ?"; args.add(unitId); }
        if (businessId != null) { sql += payroll ? " AND owner.business_id_snapshot = ?" : " AND owner.business_id = ?"; args.add(businessId); }
        if (jdbcTemplate.queryForObject(sql, Integer.class, args.toArray()) > 0) return true;
        args.set(1, issue.sourceModule() + ":" + issue.sourceType() + ":" + issue.sourceId());
        return jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM finance_journal_entries entry JOIN finance_journal_lines line
              ON line.company_id = entry.company_id AND line.entry_id = entry.id
            WHERE entry.company_id = ? AND entry.source_event_key = ?
            """ + (unitId == null ? "" : " AND line.unit_id = ?") + (businessId == null ? "" : " AND line.business_id = ?"),
            Integer.class, args.toArray()) > 0;
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
                   ) on_credit,
                   COALESCE((SELECT receivable.original_amount FROM finance_receivable_accounts receivable
                     WHERE receivable.company_id = sale.company_id AND receivable.sales_record_id = sale.id
                       AND receivable.deleted_at IS NULL AND receivable.status <> 'CANCELLED' LIMIT 1),
                     (SELECT SUM(payment.amount) FROM pos_payments payment JOIN pos_tickets ticket
                       ON ticket.company_id = payment.company_id AND ticket.id = payment.ticket_id
                       WHERE ticket.company_id = sale.company_id AND ticket.sales_record_id = sale.id
                         AND payment.payment_method = 'CREDIT' AND payment.status = 'CAPTURED'),
                     CASE WHEN LOWER(sale.payment_method) IN ('credit', 'credito', 'crédito') THEN sale.total_amount ELSE 0 END) credit_amount,
                   COALESCE((SELECT SUM(payment.amount) FROM pos_payments payment JOIN pos_tickets ticket
                     ON ticket.company_id = payment.company_id AND ticket.id = payment.ticket_id
                     WHERE ticket.company_id = sale.company_id AND ticket.sales_record_id = sale.id
                       AND payment.payment_method <> 'CREDIT' AND payment.status = 'CAPTURED'),
                     (SELECT SUM(movement.available_delta) FROM finance_payment_account_movements movement
                       WHERE movement.company_id = sale.company_id AND movement.source_type = 'SALE_COLLECTION'
                         AND CAST(movement.source_id AS UNSIGNED) = sale.id),
                     CASE WHEN LOWER(sale.finance_status) = 'approved'
                       AND LOWER(sale.payment_method) NOT IN ('credit', 'credito', 'crédito')
                       AND NOT EXISTS (SELECT 1 FROM finance_receivable_accounts receivable
                         WHERE receivable.company_id = sale.company_id AND receivable.sales_record_id = sale.id
                           AND receivable.deleted_at IS NULL AND receivable.status <> 'CANCELLED')
                       THEN sale.total_amount ELSE 0 END) cash_amount
            FROM sales_records sale
            WHERE sale.company_id = ?
              AND sale.deleted_at IS NULL
              AND sale.sale_date BETWEEN ? AND ?
              AND (
                (LOWER(sale.commercial_status) = 'approved' AND (
                  LOWER(sale.finance_status) = 'approved' OR EXISTS (
                    SELECT 1 FROM finance_receivable_accounts credit
                    WHERE credit.company_id = sale.company_id AND credit.sales_record_id = sale.id
                      AND credit.deleted_at IS NULL AND credit.status <> 'CANCELLED'
                  )
                )) OR (
                  LOWER(sale.commercial_status) = 'completed' AND EXISTS (
                    SELECT 1 FROM pos_tickets ticket
                    WHERE ticket.company_id = sale.company_id AND ticket.sales_record_id = sale.id
                      AND ticket.status = 'COMPLETED'
                  )
                )
              )
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
                rs.getBoolean("on_credit"), money(rs.getBigDecimal("credit_amount")), money(rs.getBigDecimal("cash_amount"))
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
              AND expense.status IN ('APPROVED', 'PARTIALLY_PAID', 'PAID', 'CLOSED')
              AND expense.total_amount > 0
              AND NOT EXISTS (SELECT 1 FROM payroll_run_lines payroll_line JOIN payroll_runs payroll_run
                ON payroll_run.company_id = payroll_line.company_id AND payroll_run.id = payroll_line.run_id
                WHERE payroll_line.company_id = expense.company_id AND payroll_line.payable_expense_id = expense.id
                  AND payroll_run.status IN ('approved', 'paid'))
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
              AND payment.reversed_at IS NULL
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
                   receivable.unit_id, receivable.business_id,
                   ROUND((payment.amount + COALESCE((SELECT SUM(prior.amount) FROM finance_receivable_payments prior
                     WHERE prior.company_id = payment.company_id AND prior.receivable_id = payment.receivable_id AND prior.id < payment.id), 0))
                     * receivable.original_amount / NULLIF(receivable.total_payable_amount, 0), 4)
                   - ROUND(COALESCE((SELECT SUM(prior.amount) FROM finance_receivable_payments prior
                     WHERE prior.company_id = payment.company_id AND prior.receivable_id = payment.receivable_id AND prior.id < payment.id), 0)
                     * receivable.original_amount / NULLIF(receivable.total_payable_amount, 0), 4) principal_amount
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
                nullableLong(rs, "business_id"),
                rs.getBigDecimal("principal_amount")
            ), companyId, from, to);
    }

    List<CreditSaleSource> findStandaloneCreditSales(long companyId, LocalDate from, LocalDate to) {
        return jdbcTemplate.query("""
            SELECT id, sale_number, sale_date, original_amount, financed_amount, currency_code, unit_id, business_id
            FROM finance_credit_sales WHERE company_id = ? AND deleted_at IS NULL AND sales_record_id IS NULL
              AND pos_ticket_id IS NULL AND status IN ('APPROVED', 'ACTIVE', 'COMPLETED') AND sale_date BETWEEN ? AND ?
            ORDER BY sale_date, id
            """, (rs, row) -> new CreditSaleSource(rs.getLong("id"), rs.getString("sale_number"), rs.getObject("sale_date", LocalDate.class),
                rs.getBigDecimal("original_amount"), rs.getBigDecimal("financed_amount"), rs.getString("currency_code"),
                nullableLong(rs, "unit_id"), nullableLong(rs, "business_id")), companyId, from, to);
    }

    List<InventoryReceiptSource> findInventoryReceipts(long companyId, LocalDate from, LocalDate to) {
        var zone = timezones.resolve(companyId);
        return jdbcTemplate.query("""
            SELECT receipt.id, receipt.receipt_number, receipt.created_at, receipt.unit_id, receipt.business_id,
                   receipt.subtotal_amount, receipt.tax_amount, receipt.total_amount, receipt.currency_code,
                   (EXISTS (SELECT 1 FROM pos_cash_movements cash WHERE cash.company_id = receipt.company_id
                     AND cash.id = receipt.cash_movement_id AND cash.amount = receipt.total_amount
                     AND cash.currency_code COLLATE utf8mb4_unicode_ci = receipt.currency_code COLLATE utf8mb4_unicode_ci AND cash.movement_type = 'CASH_OUT')
                    OR EXISTS (SELECT 1 FROM finance_payment_account_movements cash WHERE cash.company_id = receipt.company_id
                     AND cash.id = receipt.treasury_movement_id AND cash.available_delta = -receipt.total_amount
                     AND cash.currency_code COLLATE utf8mb4_unicode_ci = receipt.currency_code COLLATE utf8mb4_unicode_ci)) payment_verified
            FROM pos_inventory_receipts receipt WHERE receipt.company_id = ? AND receipt.status IN ('POSTED', 'REVERSED')
              AND receipt.created_at >= ? AND receipt.created_at < ? ORDER BY receipt.created_at, receipt.id
            """, (rs, row) -> new InventoryReceiptSource(rs.getLong("id"), rs.getString("receipt_number"),
                rs.getTimestamp("created_at").toInstant().atZone(zone).toLocalDate(), nullableLong(rs, "unit_id"), nullableLong(rs, "business_id"),
                rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("tax_amount"), rs.getBigDecimal("total_amount"),
                rs.getString("currency_code"), rs.getBoolean("payment_verified")), companyId,
            java.sql.Timestamp.from(from.atStartOfDay(zone).toInstant()), java.sql.Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant()));
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
                    : rs.getTimestamp("paid_at").toLocalDateTime().toLocalDate(),
                payrollLines(companyId, rs.getLong("id"))
            ), companyId, from, to, from, to);
    }

    private List<PayrollLineSource> payrollLines(long companyId, long runId) {
        return jdbcTemplate.query("""
            SELECT line.id, line.unit_id_snapshot, line.business_id_snapshot, line.currency_code_snapshot,
                   line.gross_amount, line.deductions_amount, line.employer_contributions_amount, line.net_amount,
                   line.payable_expense_id,
                   (line.payable_expense_id IS NULL OR (expense.id IS NOT NULL AND expense.deleted_at IS NULL
                     AND expense.status IN ('APPROVED', 'PARTIALLY_PAID', 'PAID', 'CLOSED')
                     AND expense.currency_code COLLATE utf8mb4_unicode_ci = line.currency_code_snapshot COLLATE utf8mb4_unicode_ci
                     AND expense.total_amount = line.net_amount)) valid_payable
            FROM payroll_run_lines line LEFT JOIN finance_expenses expense
              ON expense.company_id = line.company_id AND expense.id = line.payable_expense_id
            WHERE line.company_id = ? AND line.run_id = ? AND COALESCE(LOWER(line.payment_route), 'payroll') <> 'none' ORDER BY line.id
            """, (rs, row) -> new PayrollLineSource(rs.getLong("id"), nullableLong(rs, "unit_id_snapshot"),
                nullableLong(rs, "business_id_snapshot"), rs.getString("currency_code_snapshot"),
                money(rs.getBigDecimal("gross_amount")), money(rs.getBigDecimal("deductions_amount")),
                money(rs.getBigDecimal("employer_contributions_amount")), money(rs.getBigDecimal("net_amount")),
                nullableLong(rs, "payable_expense_id"), rs.getBoolean("valid_payable")), companyId, runId);
    }

    boolean isActiveExpenseAccount(long companyId, long accountId) {
        Integer count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM finance_accounting_accounts
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
              AND account_type IN ('EXPENSE', 'ASSET') AND is_postable = TRUE
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
        boolean onCredit,
        BigDecimal creditAmount,
        BigDecimal cashAmount
    ) {
        SaleSource(long id, String number, LocalDate date, BigDecimal total, BigDecimal tax, BigDecimal margin,
                   String currency, Long unitId, Long businessId, String linesJson, boolean onCredit) {
            this(id, number, date, total, tax, margin, currency, unitId, businessId, linesJson, onCredit,
                onCredit ? total : BigDecimal.ZERO, onCredit ? BigDecimal.ZERO : total);
        }
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
        Long businessId,
        BigDecimal principalAmount
    ) {
    }

    record CreditSaleSource(long id, String number, LocalDate date, BigDecimal total, BigDecimal financedAmount,
                            String currency, Long unitId, Long businessId) {}

    record PayrollSource(
        long id,
        LocalDate periodEnd,
        String status,
        BigDecimal gross,
        BigDecimal deductions,
        BigDecimal employerContributions,
        BigDecimal net,
        LocalDate paidDate,
        List<PayrollLineSource> lines
    ) {
    }

    record PayrollLineSource(long id, Long unitId, Long businessId, String currency, BigDecimal gross,
                             BigDecimal deductions, BigDecimal employerContributions, BigDecimal net,
                             Long payableExpenseId, boolean validPayable) {
        PayrollLineSource(long id, Long unitId, Long businessId, String currency, BigDecimal gross,
                          BigDecimal deductions, BigDecimal employerContributions, BigDecimal net) {
            this(id, unitId, businessId, currency, gross, deductions, employerContributions, net, null, true);
        }
    }
    record InventoryReceiptSource(long id, String number, LocalDate date, Long unitId, Long businessId,
                                  BigDecimal subtotal, BigDecimal tax, BigDecimal total, String currency, boolean paymentVerified) {}
}
