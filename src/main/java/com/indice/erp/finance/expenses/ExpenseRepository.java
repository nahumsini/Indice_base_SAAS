package com.indice.erp.finance.expenses;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceSqlSupport;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.status.ExpenseStatus;
import com.indice.erp.finance.status.PaymentStatus;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class ExpenseRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ExpenseMapper mapper;

    ExpenseRepository(JdbcTemplate jdbcTemplate, ExpenseMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    List<ExpenseRecord> findAll(FinanceContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        appendScopeParam(params, context.scope());

        return jdbcTemplate.query(
            """
            SELECT
            """ + ExpenseSql.SELECT_COLUMNS + """
            FROM finance_expenses expense
            WHERE expense.company_id = ?
              AND expense.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("expense", context.scope()) + """
            ORDER BY expense.expense_date DESC, expense.id DESC
            """,
            mapper::mapRow,
            params.toArray()
        );
    }

    Optional<ExpenseRecord> findById(FinanceContext context, long expenseId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(expenseId);
        appendScopeParam(params, context.scope());

        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + ExpenseSql.SELECT_COLUMNS + """
            FROM finance_expenses expense
            WHERE expense.company_id = ?
              AND expense.id = ?
              AND expense.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("expense", context.scope()) + """
            """,
            mapper::mapRow,
            params.toArray()
        );
        return rows.stream().findFirst();
    }

    ExpenseRecord insert(FinanceContext context, ExpenseDraftCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                INSERT INTO finance_expenses
                (company_id, unit_id, business_id, folio, provider_id, budget_line_id, accounting_account_id,
                 payment_account_id, purchase_order_id, concept, description, expense_type, subtotal_amount, tax_amount, total_amount,
                 paid_amount, balance_amount, currency_code, expense_date, due_date, requested_by_user_id,
                 approved_by_user_id, performed_by_user_id, status, payment_status, attachment_count,
                 created_by_user_id, custom_fields_json, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            );
            bindInsert(statement, context, command);
            return statement;
        }, keyHolder);

        var expenseId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return findById(context, expenseId).orElseThrow();
    }

    boolean update(FinanceContext context, long expenseId, ExpenseDraftCommand command) {
        var updated = jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                UPDATE finance_expenses
                SET unit_id = ?,
                    business_id = ?,
                    provider_id = ?,
                    budget_line_id = ?,
                    accounting_account_id = ?,
                    payment_account_id = ?,
                    purchase_order_id = ?,
                    folio = ?,
                    concept = ?,
                    description = ?,
                    expense_type = ?,
                    subtotal_amount = ?,
                    tax_amount = ?,
                    total_amount = ?,
                    paid_amount = ?,
                    balance_amount = ?,
                    currency_code = ?,
                    expense_date = ?,
                    due_date = ?,
                    requested_by_user_id = ?,
                    approved_by_user_id = ?,
                    performed_by_user_id = ?,
                    payment_date = NULL,
                    close_date = NULL,
                    payment_status = ?,
                    updated_by_user_id = ?,
                    custom_fields_json = ?,
                    metadata_json = ?,
                    version = version + 1
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                  AND status = ?
                """
            );
            bindUpdate(statement, context, expenseId, command);
            return statement;
        });
        return updated > 0;
    }

    boolean softDelete(FinanceContext context, long expenseId) {
        var updated = jdbcTemplate.update(
            """
            UPDATE finance_expenses
            SET deleted_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                version = version + 1
            WHERE company_id = ?
              AND id = ?
              AND deleted_at IS NULL
              AND status = ?
            """,
            context.userId(),
            context.companyId(),
            expenseId,
            ExpenseStatus.DRAFT.name()
        );
        return updated > 0;
    }

    private void bindInsert(PreparedStatement statement, FinanceContext context, ExpenseDraftCommand command)
            throws java.sql.SQLException {
        statement.setLong(1, context.companyId());
        setNullableLong(statement, 2, command.unitId());
        setNullableLong(statement, 3, command.businessId());
        statement.setString(4, command.folio());
        setNullableLong(statement, 5, command.providerId());
        setNullableLong(statement, 6, command.budgetLineId());
        setNullableLong(statement, 7, command.accountingAccountId());
        setNullableLong(statement, 8, command.paymentAccountId());
        setNullableLong(statement, 9, command.purchaseOrderId());
        statement.setString(10, command.concept());
        statement.setString(11, command.description());
        statement.setString(12, command.expenseType().name());
        statement.setBigDecimal(13, command.subtotalAmount());
        statement.setBigDecimal(14, command.taxAmount());
        statement.setBigDecimal(15, command.totalAmount());
        statement.setBigDecimal(16, command.paidAmount());
        statement.setBigDecimal(17, command.balanceAmount());
        statement.setString(18, command.currencyCode());
        statement.setDate(19, Date.valueOf(command.expenseDate()));
        setNullableDate(statement, 20, command.dueDate());
        setNullableLong(statement, 21, command.requestedByUserId());
        setNullableLong(statement, 22, command.approvedByUserId());
        setNullableLong(statement, 23, command.performedByUserId());
        statement.setString(24, ExpenseStatus.DRAFT.name());
        statement.setString(25, PaymentStatus.UNPAID.name());
        statement.setInt(26, 0);
        setNullableLong(statement, 27, command.createdByUserId());
        statement.setString(28, command.customFieldsJson());
        statement.setString(29, command.metadataJson());
    }

    private void bindUpdate(
            PreparedStatement statement,
            FinanceContext context,
            long expenseId,
            ExpenseDraftCommand command) throws java.sql.SQLException {
        setNullableLong(statement, 1, command.unitId());
        setNullableLong(statement, 2, command.businessId());
        setNullableLong(statement, 3, command.providerId());
        setNullableLong(statement, 4, command.budgetLineId());
        setNullableLong(statement, 5, command.accountingAccountId());
        setNullableLong(statement, 6, command.paymentAccountId());
        setNullableLong(statement, 7, command.purchaseOrderId());
        statement.setString(8, command.folio());
        statement.setString(9, command.concept());
        statement.setString(10, command.description());
        statement.setString(11, command.expenseType().name());
        statement.setBigDecimal(12, command.subtotalAmount());
        statement.setBigDecimal(13, command.taxAmount());
        statement.setBigDecimal(14, command.totalAmount());
        statement.setBigDecimal(15, command.paidAmount());
        statement.setBigDecimal(16, command.balanceAmount());
        statement.setString(17, command.currencyCode());
        statement.setDate(18, Date.valueOf(command.expenseDate()));
        setNullableDate(statement, 19, command.dueDate());
        setNullableLong(statement, 20, command.requestedByUserId());
        setNullableLong(statement, 21, command.approvedByUserId());
        setNullableLong(statement, 22, command.performedByUserId());
        statement.setString(23, PaymentStatus.UNPAID.name());
        setNullableLong(statement, 24, command.updatedByUserId());
        statement.setString(25, command.customFieldsJson());
        statement.setString(26, command.metadataJson());
        statement.setLong(27, context.companyId());
        statement.setLong(28, expenseId);
        statement.setString(29, ExpenseStatus.DRAFT.name());
    }

    private void appendScopeParam(List<Object> params, FinanceScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> params.add(scope.unitId());
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }

    private void setNullableLong(PreparedStatement statement, int index, Long value) throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
        } else {
            statement.setLong(index, value);
        }
    }

    private void setNullableDate(PreparedStatement statement, int index, LocalDate value) throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, Types.DATE);
        } else {
            statement.setDate(index, Date.valueOf(value));
        }
    }
}
