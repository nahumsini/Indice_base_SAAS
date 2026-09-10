package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.indice.erp.finance.FinanceApiException;

@Repository
class BudgetExpenseOccurrenceRepository {
    private final JdbcTemplate jdbc;

    BudgetExpenseOccurrenceRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // Same first lock as Expense creation, correction, payment and deletion; never invert its order.
    void lockCompany(FinanceContext context) {
        jdbc.queryForObject("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, context.companyId());
    }

    List<Long> companiesAfter(long after, int limit) {
        return jdbc.query("""
            SELECT DISTINCT line.company_id FROM finance_budget_lines line
            WHERE line.company_id > ? AND line.deleted_at IS NULL AND line.status = 'ACTIVE'
              AND JSON_UNQUOTE(JSON_EXTRACT(line.metadata_json, '$.source')) = 'expenses-frontend'
            ORDER BY line.company_id LIMIT ?
            """, (rs, n) -> rs.getLong(1), after, limit);
    }

    List<Long> candidates(FinanceContext context, long after, int limit, LocalDate periodEnd) {
        var params = scopeParams(context);
        params.add(after); params.add(periodEnd.toString()); params.add(limit);
        return jdbc.query("""
            SELECT line.id FROM finance_budget_lines line
            JOIN finance_budgets budget ON budget.id = line.budget_id AND budget.company_id = line.company_id
            LEFT JOIN finance_budget_expense_occurrences occurrence
              ON occurrence.company_id = line.company_id AND occurrence.budget_line_id = line.id
            WHERE line.company_id = ? AND
            """ + FinanceSqlSupport.scopePredicate("line", context.scope()) + """
              AND line.id > ? AND line.deleted_at IS NULL AND line.status = 'ACTIVE'
              AND budget.deleted_at IS NULL AND budget.status = 'ACTIVE'
              AND JSON_UNQUOTE(JSON_EXTRACT(line.metadata_json, '$.source')) = 'expenses-frontend'
              AND (JSON_UNQUOTE(JSON_EXTRACT(line.custom_fields_json, '$.dueDate')) IS NULL
                   OR JSON_UNQUOTE(JSON_EXTRACT(line.custom_fields_json, '$.dueDate')) NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                   OR JSON_UNQUOTE(JSON_EXTRACT(line.custom_fields_json, '$.dueDate')) <= ?)
              AND (occurrence.budget_line_id IS NULL OR
                   (occurrence.status = 'REVIEW' AND occurrence.source_version <> line.version))
            ORDER BY line.id LIMIT ?
            """, (rs, n) -> rs.getLong(1), params.toArray());
    }

    boolean resolved(FinanceContext context, long lineId) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM finance_budget_expense_occurrences
            WHERE company_id = ? AND budget_line_id = ? AND status IN ('GENERATED', 'EXISTING')
            """, Long.class, context.companyId(), lineId) > 0;
    }

    Instant activation() {
        return jdbc.queryForObject("SELECT activated_at FROM finance_budget_expense_rollout WHERE id = 1",
            (rs, n) -> rs.getTimestamp(1).toInstant());
    }

    boolean validParent(BudgetLineRecord line, LocalDate due) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM finance_budgets
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
              AND currency_code = ? AND ? BETWEEN period_start AND period_end
              AND (unit_id IS NULL OR unit_id <=> ?) AND (business_id IS NULL OR business_id <=> ?)
            """, Long.class, line.companyId(), line.budgetId(), line.currencyCode(), due,
            line.unitId(), line.businessId()) > 0;
    }

    Long existingExpense(BudgetLineRecord line) {
        // Include soft-deleted/cancelled/paid rows: deletion must never resurrect an obligation.
        return jdbc.query("""
            SELECT id FROM finance_expenses WHERE company_id = ? AND budget_line_id = ? ORDER BY id LIMIT 1
            """, (rs, n) -> rs.getLong(1), line.companyId(), line.id()).stream().findFirst().orElse(null);
    }

    boolean possibleManualExpense(BudgetLineRecord line, LocalDate due, String concept) {
        return jdbc.queryForObject("""
            SELECT COUNT(*) FROM finance_expenses
            WHERE company_id = ? AND budget_line_id IS NULL AND unit_id <=> ? AND business_id <=> ?
              AND currency_code = ? AND LOWER(TRIM(concept)) = LOWER(TRIM(?))
              AND (expense_date BETWEEN ? AND ? OR due_date BETWEEN ? AND ?)
            """, Long.class, line.companyId(), line.unitId(), line.businessId(), line.currencyCode(), concept,
            due.withDayOfMonth(1), due.withDayOfMonth(due.lengthOfMonth()),
            due.withDayOfMonth(1), due.withDayOfMonth(due.lengthOfMonth())) > 0;
    }

    boolean strictAssignment(BudgetLineRecord line) {
        if (line.unitId() != null && jdbc.queryForObject(
                "SELECT COUNT(*) FROM units WHERE company_id = ? AND id = ?", Long.class,
                line.companyId(), line.unitId()) == 0) return false;
        return line.businessId() == null || jdbc.queryForObject("""
            SELECT COUNT(*) FROM businesses WHERE company_id = ? AND id = ? AND unit_id <=> ?
            """, Long.class, line.companyId(), line.businessId(), line.unitId()) > 0;
    }

    Long accountingAccount(BudgetLineRecord line, String value) {
        if (value == null || value.isBlank()) return null;
        var ids = jdbc.query("""
            SELECT id FROM finance_accounting_accounts WHERE company_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
              AND (CAST(id AS CHAR) = ? OR CONCAT(code, ' - ', name) = ?)
            """, (rs, n) -> rs.getLong(1), line.companyId(), value.trim(), value.trim());
        if (ids.size() != 1) throw FinanceApiException.badRequest("Invalid budget accounting account.");
        return ids.getFirst();
    }

    void record(FinanceContext context, BudgetLineRecord line, LocalDate due, Long expenseId, String status, String reason) {
        jdbc.update("""
            INSERT INTO finance_budget_expense_occurrences
              (company_id, budget_line_id, scheduled_date, expense_id, status, reason, source_version, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE scheduled_date = VALUES(scheduled_date), expense_id = VALUES(expense_id),
              status = VALUES(status), reason = VALUES(reason), source_version = VALUES(source_version)
            """, context.companyId(), line.id(), due, expenseId, status, reason, line.version(), context.userId());
    }

    List<BudgetExpenseSyncResult.Review> reviews(FinanceContext context) {
        return jdbc.query("""
            SELECT line.id, line.name, occurrence.reason FROM finance_budget_expense_occurrences occurrence
            JOIN finance_budget_lines line ON line.id = occurrence.budget_line_id AND line.company_id = occurrence.company_id
            WHERE line.company_id = ? AND occurrence.status = 'REVIEW' AND line.deleted_at IS NULL AND
            """ + FinanceSqlSupport.scopePredicate("line", context.scope()) + " ORDER BY line.id",
            (rs, n) -> new BudgetExpenseSyncResult.Review(rs.getLong(1), rs.getString(2), rs.getString(3)),
            scopeParams(context).toArray());
    }

    private ArrayList<Object> scopeParams(FinanceContext context) {
        var params = new ArrayList<Object>(); params.add(context.companyId());
        if (context.scope().type() == FinanceScope.Type.UNIT_HEADQUARTERS) params.add(context.scope().unitId());
        if (context.scope().type() == FinanceScope.Type.BUSINESS_OFFICE) params.add(context.scope().businessId());
        return params;
    }
}
