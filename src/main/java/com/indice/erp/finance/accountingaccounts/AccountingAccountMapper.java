package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.accountingaccounts.dto.AccountingAccountResponse;
import com.indice.erp.finance.accountingaccounts.dto.CreateAccountingAccountRequest;
import com.indice.erp.finance.accountingaccounts.dto.UpdateAccountingAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class AccountingAccountMapper {

    public AccountingAccountRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new AccountingAccountRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            rs.getString("code"),
            rs.getString("name"),
            AccountingAccountGroup.valueOf(rs.getString("group_key")),
            rs.getString("description"),
            AccountingAccountStatus.valueOf(rs.getString("status")),
            nullableLong(rs, "created_by_user_id"),
            nullableLong(rs, "updated_by_user_id"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            instant(rs, "deleted_at"),
            rs.getLong("version"),
            rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public AccountingAccountResponse toResponse(AccountingAccountRecord record) {
        return new AccountingAccountResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.code(), record.name(),
            record.groupKey(), record.description(), record.status(), record.createdByUserId(),
            record.updatedByUserId(), record.createdAt(), record.updatedAt(), record.deletedAt(),
            record.version(), FinanceJsonSupport.toJsonNode(record.customFieldsJson()),
            FinanceJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    public AccountingAccountCommand toCreateCommand(
            FinanceContext context,
            CreateAccountingAccountRequest request,
            AccountingAccountScopedAssignment assignment) {
        return newCommand(context, assignment, request.code(), request.name(), request.groupKey(),
            request.description(), request.status(), FinanceJsonSupport.toJson(request.customFields()),
            FinanceJsonSupport.toJson(request.metadata()), true);
    }

    public AccountingAccountCommand toUpdateCommand(
            FinanceContext context,
            UpdateAccountingAccountRequest request,
            AccountingAccountScopedAssignment assignment) {
        return newCommand(context, assignment, request.code(), request.name(), request.groupKey(),
            request.description(), request.status(), FinanceJsonSupport.toJson(request.customFields()),
            FinanceJsonSupport.toJson(request.metadata()), false);
    }

    private AccountingAccountCommand newCommand(
            FinanceContext context,
            AccountingAccountScopedAssignment assignment,
            String code,
            String name,
            AccountingAccountGroup groupKey,
            String description,
            AccountingAccountStatus status,
            String customFieldsJson,
            String metadataJson,
            boolean create) {
        return new AccountingAccountCommand(
            assignment.unitId(), assignment.businessId(), normalizeCode(code), trim(name), groupKey,
            trimToNull(description), status == null ? AccountingAccountStatus.ACTIVE : status,
            create ? context.userId() : null, create ? null : context.userId(), customFieldsJson, metadataJson
        );
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private String normalizeCode(String value) {
        var trimmed = trim(value);
        return trimmed == null ? null : trimmed.toUpperCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToNull(String value) {
        var trimmed = trim(value);
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
