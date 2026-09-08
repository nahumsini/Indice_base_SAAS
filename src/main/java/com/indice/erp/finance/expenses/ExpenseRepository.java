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
import java.util.Locale;
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
            """ + ExpenseSql.FUND_JOIN + """
            WHERE """ + ExpenseSql.COMPANY_EXPENSE + """
              AND expense.company_id = ?
              AND expense.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("expense", context.scope()) + """
            ORDER BY expense.expense_date DESC, expense.id DESC
            """,
            mapper::mapRow,
            params.toArray()
        );
    }

    Optional<ExpenseRecord> findById(FinanceContext context, long expenseId) {
        return findById(context, expenseId, false);
    }

    Optional<ExpenseRecord> findByIdForUpdate(FinanceContext context, long expenseId) {
        return findById(context, expenseId, true);
    }

    private Optional<ExpenseRecord> findById(FinanceContext context, long expenseId, boolean lockForUpdate) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(expenseId);
        appendScopeParam(params, context.scope());

        var sql =
            """
            SELECT
            """ + ExpenseSql.SELECT_COLUMNS + """
            FROM finance_expenses expense
            """ + ExpenseSql.FUND_JOIN + """
            WHERE """ + ExpenseSql.COMPANY_EXPENSE + """
              AND expense.company_id = ?
              AND expense.id = ?
              AND expense.deleted_at IS NULL
              AND """ + FinanceSqlSupport.scopePredicate("expense", context.scope())
                + (lockForUpdate ? " FOR UPDATE" : "");
        var rows = jdbcTemplate.query(
            sql,
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

    void lockCompanyForCreation(FinanceContext context) {
        var ids = jdbcTemplate.queryForList("SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, context.companyId());
        if (ids.isEmpty()) throw com.indice.erp.finance.FinanceApiException.notFound("Company not found.");
    }

    int updateAccountingAccount(FinanceContext context, ExpenseRecord existing, Long accountId) {
        return jdbcTemplate.update("""
            UPDATE finance_expenses SET accounting_account_id = ?, updated_by_user_id = ?, version = version + 1,
                custom_fields_json = JSON_SET(COALESCE(custom_fields_json, JSON_OBJECT()), '$.accountingAccount', ?),
                metadata_json = JSON_SET(COALESCE(metadata_json, JSON_OBJECT()), '$.accountingClassificationChanges',
                    JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(metadata_json, '$.accountingClassificationChanges'), JSON_ARRAY()),
                        '$', JSON_OBJECT('previousAccountId', ?, 'accountId', ?, 'userId', ?, 'changedAt', UTC_TIMESTAMP(6))))
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL AND version = ?
            """, accountId, context.userId(), accountId,
            existing.accountingAccountId(), accountId, context.userId(),
            context.companyId(), existing.id(), existing.version());
    }

    String nextFolio(long companyId, String documentPrefix, int year, int collisionOffset) {
        var normalizedPrefix = documentPrefix.trim().toUpperCase(Locale.ROOT);
        var folioPrefix = normalizedPrefix + "-" + year + "-";
        var sequenceStart = folioPrefix.length() + 1;
        var nextSequence = jdbcTemplate.queryForObject(
            """
            SELECT COALESCE(MAX(CAST(SUBSTRING(folio, ?) AS UNSIGNED)), 0) + 1 + ?
            FROM finance_expenses
            WHERE company_id = ?
              AND folio LIKE ?
            """,
            Integer.class,
            sequenceStart,
            collisionOffset,
            companyId,
            folioPrefix + "%"
        );
        var sequence = nextSequence == null ? 1 : nextSequence;
        return folioPrefix + String.format(Locale.ROOT, "%03d", sequence);
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
	                    updated_by_user_id = ?,
	                    custom_fields_json = ?,
	                    metadata_json = ?,
                    version = version + 1
	                WHERE company_id = ?
	                  AND id = ?
	                  AND deleted_at IS NULL
	                  AND status NOT IN (?, ?)
	                """
	            );
            bindUpdate(statement, context, expenseId, command);
            return statement;
        });
        return updated > 0;
    }

    boolean softDelete(FinanceContext context, long expenseId, ExpenseStatus expectedStatus) {
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
            expectedStatus.name()
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
	        setNullableLong(statement, 23, command.updatedByUserId());
	        statement.setString(24, command.customFieldsJson());
	        statement.setString(25, command.metadataJson());
	        statement.setLong(26, context.companyId());
	        statement.setLong(27, expenseId);
	        statement.setString(28, ExpenseStatus.CANCELLED.name());
	        statement.setString(29, ExpenseStatus.REJECTED.name());
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
