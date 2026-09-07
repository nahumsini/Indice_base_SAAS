package com.indice.erp.finance.paymentaccounts;

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
class PaymentAccountRepository {

    private final JdbcTemplate jdbcTemplate;
    private final PaymentAccountMapper mapper;

    PaymentAccountRepository(JdbcTemplate jdbcTemplate, PaymentAccountMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    List<PaymentAccountRecord> findAll(FinanceContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(
            """
            SELECT
            """ + PaymentAccountSql.SELECT_COLUMNS + """
            FROM finance_payment_accounts account
            WHERE account.company_id = ?
              AND account.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("account", context.scope()) + """
            ORDER BY account.name ASC, account.id ASC
            """,
            mapper::mapRow,
            params.toArray()
        );
    }

    Optional<PaymentAccountRecord> findById(FinanceContext context, long accountId) {
        var params = scopedParams(context);
        params.add(1, accountId);
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + PaymentAccountSql.SELECT_COLUMNS + """
            FROM finance_payment_accounts account
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

    void lockForMaintenance(FinanceContext context, long id) {
        var params = scopedParams(context); params.add(1, id);
        var rows = jdbcTemplate.query("SELECT account.id FROM finance_payment_accounts account WHERE account.company_id = ? AND account.id = ?"
            + " AND account.deleted_at IS NULL AND " + FinanceSqlSupport.scopePredicate("account", context.scope()) + " FOR UPDATE",
            (rs, row) -> rs.getLong(1), params.toArray());
        if (rows.isEmpty()) throw new java.util.NoSuchElementException("Payment account not found.");
    }

    boolean hasFinancialHistory(FinanceContext context, long id) {
        return jdbcTemplate.queryForObject("""
            SELECT EXISTS (SELECT 1 FROM finance_payment_account_movements WHERE company_id = ? AND payment_account_id = ?)
              OR EXISTS (SELECT 1 FROM finance_expense_payments WHERE company_id = ? AND payment_account_id = ?)
              OR EXISTS (SELECT 1 FROM finance_receivable_payments WHERE company_id = ? AND payment_account_id = ?)
              OR EXISTS (SELECT 1 FROM finance_petty_cash_funds WHERE company_id = ? AND payment_account_id = ?)
            """, Boolean.class, context.companyId(), id, context.companyId(), id, context.companyId(), id, context.companyId(), id);
    }

    PaymentAccountRecord insert(FinanceContext context, PaymentAccountCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(PaymentAccountSql.INSERT, Statement.RETURN_GENERATED_KEYS);
            PaymentAccountStatementBinder.bindInsert(statement, context, command);
            return statement;
        }, keyHolder);
        var accountId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context, accountId).orElseThrow();
    }

    boolean update(FinanceContext context, long accountId, PaymentAccountCommand command) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(PaymentAccountSql.UPDATE);
            PaymentAccountStatementBinder.bindUpdate(statement, context, accountId, command);
            return statement;
        });
        return updated > 0;
    }

    boolean existsByName(FinanceContext context, String name, Long excludedAccountId) {
        var sql = "SELECT COUNT(*) FROM finance_payment_accounts WHERE company_id = ? AND deleted_at IS NULL"
            + " AND name = ?";
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(name);
        if (excludedAccountId != null) {
            sql += " AND id <> ?";
            params.add(excludedAccountId);
        }
        var count = jdbcTemplate.queryForObject(sql, Long.class, params.toArray());
        return count != null && count > 0;
    }

    boolean softDelete(FinanceContext context, long accountId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_payment_accounts
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
              AND is_system_managed = FALSE
            """,
            context.userId(),
            context.companyId(),
            accountId
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
