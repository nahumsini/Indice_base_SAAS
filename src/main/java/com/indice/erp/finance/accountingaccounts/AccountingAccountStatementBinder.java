package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.shared.FinanceContext;
import java.sql.PreparedStatement;
import java.sql.Types;

final class AccountingAccountStatementBinder {

    private AccountingAccountStatementBinder() {
    }

    static void bindInsert(
            PreparedStatement statement,
            FinanceContext context,
            AccountingAccountCommand command) throws java.sql.SQLException {
        statement.setLong(1, context.companyId());
        setNullableLong(statement, 2, command.unitId());
        setNullableLong(statement, 3, command.businessId());
        statement.setString(4, command.code());
        statement.setString(5, command.name());
        statement.setString(6, command.groupKey().name());
        statement.setString(7, command.description());
        statement.setString(8, command.status().name());
        setNullableLong(statement, 9, command.createdByUserId());
        statement.setString(10, command.customFieldsJson());
        statement.setString(11, command.metadataJson());
    }

    static void bindUpdate(
            PreparedStatement statement,
            FinanceContext context,
            long accountId,
            AccountingAccountCommand command) throws java.sql.SQLException {
        setNullableLong(statement, 1, command.unitId());
        setNullableLong(statement, 2, command.businessId());
        statement.setString(3, command.code());
        statement.setString(4, command.name());
        statement.setString(5, command.groupKey().name());
        statement.setString(6, command.description());
        statement.setString(7, command.status().name());
        setNullableLong(statement, 8, command.updatedByUserId());
        statement.setString(9, command.customFieldsJson());
        statement.setString(10, command.metadataJson());
        statement.setLong(11, context.companyId());
        statement.setLong(12, accountId);
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
