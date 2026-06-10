package com.indice.erp.finance.providers;

import com.indice.erp.finance.shared.FinanceContext;
import java.sql.PreparedStatement;
import java.sql.Types;

final class ProviderStatementBinder {

    private ProviderStatementBinder() {
    }

    static void bindInsert(PreparedStatement statement, FinanceContext context, ProviderCommand command)
            throws java.sql.SQLException {
        statement.setLong(1, context.companyId());
        setNullableLong(statement, 2, command.unitId());
        setNullableLong(statement, 3, command.businessId());
        statement.setString(4, command.name());
        statement.setString(5, command.legalName());
        statement.setString(6, command.taxId());
        statement.setString(7, command.email());
        statement.setString(8, command.phone());
        statement.setString(9, command.contactName());
        setNullableInteger(statement, 10, command.paymentTermsDays());
        statement.setString(11, command.status().name());
        statement.setString(12, command.notes());
        setNullableLong(statement, 13, command.createdByUserId());
        statement.setString(14, command.customFieldsJson());
        statement.setString(15, command.metadataJson());
    }

    static void bindUpdate(
            PreparedStatement statement,
            FinanceContext context,
            long providerId,
            ProviderCommand command) throws java.sql.SQLException {
        setNullableLong(statement, 1, command.unitId());
        setNullableLong(statement, 2, command.businessId());
        statement.setString(3, command.name());
        statement.setString(4, command.legalName());
        statement.setString(5, command.taxId());
        statement.setString(6, command.email());
        statement.setString(7, command.phone());
        statement.setString(8, command.contactName());
        setNullableInteger(statement, 9, command.paymentTermsDays());
        statement.setString(10, command.status().name());
        statement.setString(11, command.notes());
        setNullableLong(statement, 12, command.updatedByUserId());
        statement.setString(13, command.customFieldsJson());
        statement.setString(14, command.metadataJson());
        statement.setLong(15, context.companyId());
        statement.setLong(16, providerId);
    }

    private static void setNullableLong(PreparedStatement statement, int index, Long value)
            throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, Types.BIGINT);
        } else {
            statement.setLong(index, value);
        }
    }

    private static void setNullableInteger(PreparedStatement statement, int index, Integer value)
            throws java.sql.SQLException {
        if (value == null) {
            statement.setNull(index, Types.INTEGER);
        } else {
            statement.setInt(index, value);
        }
    }
}
