package com.indice.erp.finance.budgets;

import com.indice.erp.finance.budgets.dto.BudgetResponse;
import com.indice.erp.finance.budgets.dto.CreateBudgetRequest;
import com.indice.erp.finance.budgets.dto.UpdateBudgetRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import com.indice.erp.finance.status.BudgetStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class BudgetMapper {

    public BudgetRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new BudgetRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getObject("period_start", LocalDate.class),
            rs.getObject("period_end", LocalDate.class),
            rs.getString("currency_code"),
            BudgetStatus.valueOf(rs.getString("status")),
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

    public BudgetResponse toResponse(BudgetRecord record) {
        return new BudgetResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.name(),
            record.description(), record.periodStart(), record.periodEnd(), record.currencyCode(),
            record.status(), record.createdByUserId(), record.updatedByUserId(), record.createdAt(),
            record.updatedAt(), record.deletedAt(), record.version(),
            FinanceJsonSupport.toJsonNode(record.customFieldsJson()),
            FinanceJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    public BudgetCommand toCreateCommand(
            FinanceContext context,
            CreateBudgetRequest request,
            BudgetScopedAssignment assignment) {
        return command(context, assignment, request.name(), request.description(), request.periodStart(),
            request.periodEnd(), request.currencyCode(), request.status(), true, request.customFields(),
            request.metadata());
    }

    public BudgetCommand toUpdateCommand(
            FinanceContext context,
            UpdateBudgetRequest request,
            BudgetScopedAssignment assignment) {
        return command(context, assignment, request.name(), request.description(), request.periodStart(),
            request.periodEnd(), request.currencyCode(), request.status(), false, request.customFields(),
            request.metadata());
    }

    private BudgetCommand command(
            FinanceContext context,
            BudgetScopedAssignment assignment,
            String name,
            String description,
            LocalDate periodStart,
            LocalDate periodEnd,
            String currencyCode,
            BudgetStatus status,
            boolean create,
            Object customFields,
            Object metadata) {
        return new BudgetCommand(
            assignment.unitId(), assignment.businessId(), trim(name), trimToNull(description), periodStart, periodEnd,
            normalizeCurrency(currencyCode), status == null ? BudgetStatus.ACTIVE : status,
            create ? context.userId() : null, create ? null : context.userId(),
            FinanceJsonSupport.toJson(customFields), FinanceJsonSupport.toJson(metadata)
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

    private String normalizeCurrency(String value) {
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
