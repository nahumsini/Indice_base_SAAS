package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.finance.shared.FinanceScope;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class AccountingAccountRepository {

    private final JdbcTemplate jdbcTemplate;
    private final AccountingAccountMapper mapper;

    AccountingAccountRepository(JdbcTemplate jdbcTemplate, AccountingAccountMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    List<AccountingAccountRecord> findAll(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + AccountingAccountSql.SELECT_COLUMNS + """
            FROM finance_accounting_accounts account
            WHERE account.company_id = ?
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            ORDER BY account.code ASC, account.id ASC
            """,
            mapper::mapRow,
            params.toArray()
        );
    }

    Optional<AccountingAccountRecord> findById(FinanceContext context, long accountId) {
        var params = scopedParams(context);
        params.add(1, accountId);
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + AccountingAccountSql.SELECT_COLUMNS + """
            FROM finance_accounting_accounts account
            WHERE account.company_id = ?
              AND account.id = ?
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            """,
            mapper::mapRow,
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    AccountingAccountRecord insert(FinanceContext context, AccountingAccountCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                AccountingAccountSql.INSERT,
                Statement.RETURN_GENERATED_KEYS
            );
            AccountingAccountStatementBinder.bindInsert(statement, context, command);
            return statement;
        }, keyHolder);
        var accountId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context, accountId).orElseThrow();
    }

    boolean update(FinanceContext context, long accountId, AccountingAccountCommand command) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(AccountingAccountSql.UPDATE);
            AccountingAccountStatementBinder.bindUpdate(statement, context, accountId, command);
            return statement;
        });
        return updated > 0;
    }

    boolean existsByCode(FinanceContext context, String code, Long excludedAccountId) {
        return existsByField(context, "code", code, excludedAccountId);
    }

    boolean existsByName(FinanceContext context, String name, Long excludedAccountId) {
        return existsByField(context, "name", name, excludedAccountId);
    }

    boolean softDelete(FinanceContext context, long accountId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_accounting_accounts
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
            """,
            context.userId(),
            context.companyId(),
            accountId
        );
        return updated > 0;
    }

    private boolean existsByField(FinanceContext context, String column, String value, Long excludedAccountId) {
        var sql = "SELECT COUNT(*) FROM finance_accounting_accounts WHERE company_id = ? AND deleted_at IS NULL AND "
            + column + " = ?";
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(value);
        if (excludedAccountId != null) {
            sql += " AND id <> ?";
            params.add(excludedAccountId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
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
