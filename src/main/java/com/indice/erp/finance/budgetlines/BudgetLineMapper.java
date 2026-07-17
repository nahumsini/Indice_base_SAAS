package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.budgetlines.dto.BudgetLineResponse;
import com.indice.erp.finance.budgetlines.dto.CreateBudgetLineRequest;
import com.indice.erp.finance.budgetlines.dto.UpdateBudgetLineRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import com.indice.erp.finance.status.BudgetHealthStatus;
import com.indice.erp.finance.status.BudgetStatus;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class BudgetLineMapper {

    public BudgetLineRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new BudgetLineRecord(
            rs.getLong("id"), rs.getLong("company_id"), nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"), rs.getLong("budget_id"), rs.getString("name"),
            rs.getString("category_key"), rs.getBigDecimal("planned_amount"),
            rs.getBigDecimal("committed_amount"), rs.getBigDecimal("actual_expense_amount"),
            rs.getBigDecimal("petty_cash_issued_amount"), rs.getBigDecimal("petty_cash_settled_amount"),
            rs.getBigDecimal("available_amount"), BudgetHealthStatus.valueOf(rs.getString("health_status")),
            rs.getString("currency_code"), BudgetStatus.valueOf(rs.getString("status")),
            rs.getString("description"), rs.getInt("attachment_count"), nullableLong(rs, "created_by_user_id"),
            nullableLong(rs, "updated_by_user_id"), instant(rs, "created_at"), instant(rs, "updated_at"),
            instant(rs, "deleted_at"), rs.getLong("version"), rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public BudgetLineResponse toResponse(BudgetLineRecord record) {
        return new BudgetLineResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.budgetId(),
            record.name(), record.categoryKey(), record.plannedAmount(), record.committedAmount(),
            record.actualExpenseAmount(), record.pettyCashIssuedAmount(), record.pettyCashSettledAmount(),
            record.availableAmount(), record.healthStatus(), record.currencyCode(), record.status(),
            record.description(), record.attachmentCount(), record.createdByUserId(), record.updatedByUserId(), record.createdAt(),
            record.updatedAt(), record.deletedAt(), record.version(),
            FinanceJsonSupport.toJsonNode(record.customFieldsJson()), FinanceJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    public BudgetLineCommand toCreateCommand(
            FinanceContext context,
            CreateBudgetLineRequest request,
            BudgetLineScopedAssignment assignment) {
        var planned = request.plannedAmount();
        var available = available(planned, zero(), zero(), zero(), zero());
        return command(context, assignment, request.budgetId(), request.name(), request.categoryKey(), planned,
            zero(), zero(), zero(), zero(), available, health(planned, available), request.currencyCode(),
            request.status(), request.description(), true, request.customFields(), request.metadata());
    }

    public BudgetLineCommand toUpdateCommand(
            FinanceContext context,
            UpdateBudgetLineRequest request,
            BudgetLineScopedAssignment assignment,
            BudgetLineRecord current) {
        var planned = request.plannedAmount();
        var available = available(planned, current.committedAmount(), current.actualExpenseAmount(),
            current.pettyCashIssuedAmount(), current.pettyCashSettledAmount());
        return command(context, assignment, request.budgetId(), request.name(), request.categoryKey(), planned,
            current.committedAmount(), current.actualExpenseAmount(), current.pettyCashIssuedAmount(),
            current.pettyCashSettledAmount(), available, health(planned, available), request.currencyCode(),
            request.status(), request.description(), false, request.customFields(), request.metadata());
    }

    private BudgetLineCommand command(
            FinanceContext context, BudgetLineScopedAssignment assignment, Long budgetId, String name,
            String categoryKey, BigDecimal planned, BigDecimal committed, BigDecimal actual, BigDecimal issued,
            BigDecimal settled, BigDecimal available, BudgetHealthStatus health, String currencyCode,
            BudgetStatus status, String description, boolean create, Object customFields, Object metadata) {
        return new BudgetLineCommand(assignment.unitId(), assignment.businessId(), budgetId, trim(name),
            trimToNull(categoryKey), planned, committed, actual, issued, settled, available, health,
            normalizeCurrency(currencyCode), status == null ? BudgetStatus.ACTIVE : status, trimToNull(description),
            create ? context.userId() : null, create ? null : context.userId(), FinanceJsonSupport.toJson(customFields),
            FinanceJsonSupport.toJson(metadata));
    }

    private BigDecimal available(BigDecimal planned, BigDecimal committed, BigDecimal actual, BigDecimal issued,
            BigDecimal settled) {
        return BudgetLineAmounts.availableAmount(planned, committed, actual, issued, settled);
    }

    private BudgetHealthStatus health(BigDecimal planned, BigDecimal available) {
        return BudgetLineAmounts.healthStatus(planned, available);
    }

    private BigDecimal zero() {
        return BudgetLineAmounts.zero();
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
