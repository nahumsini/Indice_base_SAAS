package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.shared.FinanceContext;
import java.sql.PreparedStatement;
import java.sql.Types;

final class PaymentAccountStatementBinder {

    private PaymentAccountStatementBinder() {
    }

    static void bindInsert(
            PreparedStatement statement,
            FinanceContext context,
            PaymentAccountCommand command) throws java.sql.SQLException {
        statement.setLong(1, context.companyId());
        setNullableLong(statement, 2, command.unitId());
        setNullableLong(statement, 3, command.businessId());
        statement.setString(4, command.name());
        statement.setString(5, command.type().name());
        statement.setString(6, command.currencyCode());
        statement.setBigDecimal(7, command.openingBalance());
        statement.setBigDecimal(8, command.currentBalance());
        statement.setString(9, command.status().name());
        statement.setString(10, command.description());
        setNullableLong(statement, 11, command.createdByUserId());
        statement.setString(12, command.customFieldsJson());
        statement.setString(13, command.metadataJson());
    }

    static void bindUpdate(
            PreparedStatement statement,
            FinanceContext context,
            long accountId,
            PaymentAccountCommand command) throws java.sql.SQLException {
        setNullableLong(statement, 1, command.unitId());
        setNullableLong(statement, 2, command.businessId());
        statement.setString(3, command.name());
        statement.setString(4, command.type().name());
        statement.setString(5, command.currencyCode());
        statement.setString(6, command.status().name());
        statement.setString(7, command.description());
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
