package com.indice.erp.finance.budgets;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class BudgetRepository {

    private final JdbcTemplate jdbcTemplate;
    private final BudgetMapper mapper;

    BudgetRepository(JdbcTemplate jdbcTemplate, BudgetMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    List<BudgetRecord> findAll(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + BudgetSql.SELECT_COLUMNS + """
            FROM finance_budgets budget
            WHERE budget.company_id = ?
              AND budget.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("budget", context.scope()) + """
            ORDER BY budget.period_start DESC, budget.name ASC, budget.id ASC
            """,
            mapper::mapRow,
            params.toArray()
        );
    }

    Optional<BudgetRecord> findById(FinanceContext context, long budgetId) {
        var params = scopedParams(context);
        params.add(1, budgetId);
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + BudgetSql.SELECT_COLUMNS + """
            FROM finance_budgets budget
            WHERE budget.company_id = ?
              AND budget.id = ?
              AND budget.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("budget", context.scope()) + """
            """,
            mapper::mapRow,
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    BudgetRecord insert(FinanceContext context, BudgetCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(BudgetSql.INSERT, Statement.RETURN_GENERATED_KEYS);
            BudgetStatementBinder.bindInsert(statement, context, command);
            return statement;
        }, keyHolder);
        var budgetId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context, budgetId).orElseThrow();
    }

    boolean update(FinanceContext context, long budgetId, BudgetCommand command) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(BudgetSql.UPDATE);
            BudgetStatementBinder.bindUpdate(statement, context, budgetId, command);
            return statement;
        });
        return updated > 0;
    }

    boolean existsByNameAndPeriod(
            FinanceContext context,
            String name,
            LocalDate periodStart,
            LocalDate periodEnd,
            Long excludedBudgetId) {
        var sql = """
            SELECT COUNT(*)
            FROM finance_budgets
            WHERE company_id = ?
              AND deleted_at IS NULL
              AND name = ?
              AND period_start = ?
              AND period_end = ?
            """;
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(name);
        params.add(periodStart);
        params.add(periodEnd);
        if (excludedBudgetId != null) {
            sql += " AND id <> ?";
            params.add(excludedBudgetId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }

    boolean softDelete(FinanceContext context, long budgetId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_budgets
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            budgetId
        );
        return updated > 0;
    }

    private ArrayList<Object> scopedParams(FinanceContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        appendScopeParam(params, context.scope());
        return params;
    }

    private void appendScopeParam(List<Object> params, FinanceScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> params.add(scope.unitId());
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }
}
