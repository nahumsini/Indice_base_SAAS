package com.indice.erp.finance.budgets;

import com.indice.erp.finance.shared.FinanceContext;
import java.sql.PreparedStatement;
import java.sql.Types;

final class BudgetStatementBinder {

    private BudgetStatementBinder() {
    }

    static void bindInsert(PreparedStatement statement, FinanceContext context, BudgetCommand command)
            throws java.sql.SQLException {
        statement.setLong(1, context.companyId());
        setNullableLong(statement, 2, command.unitId());
        setNullableLong(statement, 3, command.businessId());
        bindMutableFields(statement, command, 4);
        setNullableLong(statement, 10, command.createdByUserId());
        statement.setString(11, command.customFieldsJson());
        statement.setString(12, command.metadataJson());
    }

    static void bindUpdate(PreparedStatement statement, FinanceContext context, long budgetId,
            BudgetCommand command) throws java.sql.SQLException {
        setNullableLong(statement, 1, command.unitId());
        setNullableLong(statement, 2, command.businessId());
        bindMutableFields(statement, command, 3);
        setNullableLong(statement, 9, command.updatedByUserId());
        statement.setString(10, command.customFieldsJson());
        statement.setString(11, command.metadataJson());
        statement.setLong(12, context.companyId());
        statement.setLong(13, budgetId);
    }

    private static void bindMutableFields(PreparedStatement statement, BudgetCommand command, int start)
            throws java.sql.SQLException {
        statement.setString(start, command.name());
        statement.setString(start + 1, command.description());
        statement.setObject(start + 2, command.periodStart());
        statement.setObject(start + 3, command.periodEnd());
        statement.setString(start + 4, command.currencyCode());
        statement.setString(start + 5, command.status().name());
    }

    private static void setNullableLong(PreparedStatement statement, int index, Long value)
            throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
        } else {
            statement.setLong(index, value);
        }
    }
}
