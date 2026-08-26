package com.indice.erp.finance.expenses;

import com.indice.erp.finance.expenses.dto.ExpensePaymentResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class ExpensePaymentRepository {

    static final String SOURCE_RECORDED = "RECORDED";
    static final String SOURCE_SETTLED_ON_CREATE = "SETTLED_ON_CREATE";

    private final JdbcTemplate jdbcTemplate;

    ExpensePaymentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    boolean insert(
            FinanceContext context,
            long expenseId,
            Long paymentAccountId,
            BigDecimal amount,
            String currencyCode,
            LocalDate paymentDate,
            String source) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(expenseId);
        params.add(paymentAccountId);
        params.add(amount);
        params.add(currencyCode);
        params.add(paymentDate);
        params.add(source);
        params.add(context.userId());
        params.add(context.companyId());
        params.add(expenseId);
        appendScopeParam(params, context.scope());

        var inserted = jdbcTemplate.update(
            """
            INSERT INTO finance_expense_payments
              (company_id, expense_id, payment_account_id, amount, currency_code,
               payment_date, source, registered_by_user_id)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?
            FROM finance_expenses expense
            WHERE expense.company_id = ?
              AND expense.id = ?
              AND expense.deleted_at IS NULL
              AND %s
            """.formatted(FinanceSqlSupport.scopePredicate("expense", context.scope())),
            params.toArray()
        );
        return inserted > 0;
    }

    List<ExpensePaymentResponse> findAll(FinanceContext context, long expenseId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(expenseId);
        appendScopeParam(params, context.scope());

        return jdbcTemplate.query(
            """
            SELECT payment.id,
                   payment.expense_id,
                   payment.payment_account_id,
                   account.name AS payment_account_name,
                   account.type AS payment_account_type,
                   payment.amount,
                   payment.currency_code,
                   payment.payment_date,
                   payment.source,
                   payment.registered_by_user_id,
                   COALESCE(NULLIF(TRIM(registered_by.full_name), ''), registered_by.email) AS registered_by_name,
                   payment.created_at
            FROM finance_expense_payments payment
            JOIN finance_expenses expense
              ON expense.id = payment.expense_id
             AND expense.company_id = payment.company_id
            LEFT JOIN finance_payment_accounts account
              ON account.id = payment.payment_account_id
             AND account.company_id = payment.company_id
            LEFT JOIN users registered_by ON registered_by.id = payment.registered_by_user_id
            WHERE payment.company_id = ?
              AND payment.expense_id = ?
              AND expense.deleted_at IS NULL
              AND %s
            ORDER BY payment.payment_date DESC, payment.created_at DESC, payment.id DESC
            """.formatted(FinanceSqlSupport.scopePredicate("expense", context.scope())),
            (rs, rowNum) -> new ExpensePaymentResponse(
                rs.getLong("id"),
                rs.getLong("expense_id"),
                nullableLong(rs.getObject("payment_account_id")),
                rs.getString("payment_account_name"),
                rs.getString("payment_account_type"),
                rs.getBigDecimal("amount"),
                rs.getString("currency_code"),
                rs.getDate("payment_date").toLocalDate(),
                rs.getString("source"),
                nullableLong(rs.getObject("registered_by_user_id")),
                rs.getString("registered_by_name"),
                rs.getTimestamp("created_at").toInstant()
            ),
            params.toArray()
        );
    }

    private static Long nullableLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static void appendScopeParam(List<Object> params, FinanceScope scope) {
        if (scope.type() == FinanceScope.Type.UNIT_HEADQUARTERS) {
            params.add(scope.unitId());
        } else if (scope.type() == FinanceScope.Type.BUSINESS_OFFICE) {
            params.add(scope.businessId());
        }
    }
}
