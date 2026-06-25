package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class BudgetLineRepository {

    private final JdbcTemplate jdbcTemplate;
    private final BudgetLineMapper mapper;

    BudgetLineRepository(JdbcTemplate jdbcTemplate, BudgetLineMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    List<BudgetLineRecord> findAll(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + BudgetLineSql.SELECT_COLUMNS + """
            FROM finance_budget_lines line
            WHERE line.company_id = ?
              AND line.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("line", context.scope()) + """
            ORDER BY line.name ASC, line.id ASC
            """,
            mapper::mapRow,
            params.toArray()
        );
    }

    Optional<BudgetLineRecord> findById(FinanceContext context, long budgetLineId) {
        var params = scopedParams(context);
        params.add(1, budgetLineId);
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + BudgetLineSql.SELECT_COLUMNS + """
            FROM finance_budget_lines line
            WHERE line.company_id = ?
              AND line.id = ?
              AND line.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("line", context.scope()) + """
            """,
            mapper::mapRow,
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    BudgetLineRecord insert(FinanceContext context, BudgetLineCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(BudgetLineSql.INSERT, Statement.RETURN_GENERATED_KEYS);
            BudgetLineStatementBinder.bindInsert(statement, context, command);
            return statement;
        }, keyHolder);
        var budgetLineId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context, budgetLineId).orElseThrow();
    }

    boolean update(FinanceContext context, long budgetLineId, BudgetLineCommand command) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(BudgetLineSql.UPDATE);
            BudgetLineStatementBinder.bindUpdate(statement, context, budgetLineId, command);
            return statement;
        });
        return updated > 0;
    }

    boolean existsByName(FinanceContext context, String name, Long excludedBudgetLineId) {
        var sql = "SELECT COUNT(*) FROM finance_budget_lines WHERE company_id = ? AND deleted_at IS NULL"
            + " AND name = ?";
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(name);
        if (excludedBudgetLineId != null) {
            sql += " AND id <> ?";
            params.add(excludedBudgetLineId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }

    boolean softDelete(FinanceContext context, long budgetLineId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_budget_lines
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            budgetLineId
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
