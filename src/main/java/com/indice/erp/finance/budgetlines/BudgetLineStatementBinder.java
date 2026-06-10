package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.shared.FinanceContext;
import java.sql.PreparedStatement;
import java.sql.Types;

final class BudgetLineStatementBinder {

    private BudgetLineStatementBinder() {
    }

    static void bindInsert(PreparedStatement statement, FinanceContext context, BudgetLineCommand command)
            throws java.sql.SQLException {
        statement.setLong(1, context.companyId());
        setNullableLong(statement, 2, command.unitId());
        setNullableLong(statement, 3, command.businessId());
        statement.setLong(4, command.budgetId());
        bindMutableFields(statement, command, 5);
        setNullableLong(statement, 17, command.createdByUserId());
        statement.setString(18, command.customFieldsJson());
        statement.setString(19, command.metadataJson());
    }

    static void bindUpdate(PreparedStatement statement, FinanceContext context, long budgetLineId,
            BudgetLineCommand command) throws java.sql.SQLException {
        setNullableLong(statement, 1, command.unitId());
        setNullableLong(statement, 2, command.businessId());
        statement.setLong(3, command.budgetId());
        bindMutableFields(statement, command, 4);
        setNullableLong(statement, 16, command.updatedByUserId());
        statement.setString(17, command.customFieldsJson());
        statement.setString(18, command.metadataJson());
        statement.setLong(19, context.companyId());
        statement.setLong(20, budgetLineId);
    }

    private static void bindMutableFields(PreparedStatement statement, BudgetLineCommand command, int start)
            throws java.sql.SQLException {
        statement.setString(start, command.name());
        statement.setString(start + 1, command.categoryKey());
        statement.setBigDecimal(start + 2, command.plannedAmount());
        statement.setBigDecimal(start + 3, command.committedAmount());
        statement.setBigDecimal(start + 4, command.actualExpenseAmount());
        statement.setBigDecimal(start + 5, command.pettyCashIssuedAmount());
        statement.setBigDecimal(start + 6, command.pettyCashSettledAmount());
        statement.setBigDecimal(start + 7, command.availableAmount());
        statement.setString(start + 8, command.healthStatus().name());
        statement.setString(start + 9, command.currencyCode());
        statement.setString(start + 10, command.status().name());
        statement.setString(start + 11, command.description());
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
