package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountResponse;
import com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class PaymentAccountMapper {

    public PaymentAccountRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new PaymentAccountRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            rs.getString("name"),
            PaymentAccountType.valueOf(rs.getString("type")),
            rs.getString("currency_code"),
            rs.getBigDecimal("opening_balance"),
            rs.getBigDecimal("current_balance"),
            rs.getBigDecimal("pending_balance"),
            PaymentAccountStatus.valueOf(rs.getString("status")),
            rs.getString("description"),
            rs.getString("system_key"),
            rs.getBoolean("is_system_managed"),
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

    public PaymentAccountResponse toResponse(PaymentAccountRecord record) {
        return new PaymentAccountResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.name(),
            record.type(), record.currencyCode(), record.openingBalance(), record.currentBalance(),
            record.pendingBalance(), record.currentBalance().add(record.pendingBalance()),
            record.status(), record.description(), record.systemKey(), record.systemManaged(),
            record.createdByUserId(), record.updatedByUserId(),
            record.createdAt(), record.updatedAt(), record.deletedAt(), record.version(),
            FinanceJsonSupport.toJsonNode(record.customFieldsJson()), FinanceJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    public PaymentAccountCommand toCreateCommand(
            FinanceContext context,
            CreatePaymentAccountRequest request,
            PaymentAccountScopedAssignment assignment) {
        var openingBalance = request.openingBalance();
        return new PaymentAccountCommand(
            assignment.unitId(), assignment.businessId(), trim(request.name()), request.type(),
            normalizeCurrency(request.currencyCode()), openingBalance, java.math.BigDecimal.ZERO,
            statusOrActive(request.status()), trimToNull(request.description()), context.userId(), null,
            FinanceJsonSupport.toJson(request.customFields()), FinanceJsonSupport.toJson(request.metadata())
        );
    }

    public PaymentAccountCommand toUpdateCommand(
            FinanceContext context,
            UpdatePaymentAccountRequest request,
            PaymentAccountScopedAssignment assignment) {
        return new PaymentAccountCommand(
            assignment.unitId(), assignment.businessId(), trim(request.name()), request.type(),
            normalizeCurrency(request.currencyCode()), null, null, statusOrActive(request.status()),
            trimToNull(request.description()), null, context.userId(),
            FinanceJsonSupport.toJson(request.customFields()), FinanceJsonSupport.toJson(request.metadata())
        );
    }

    private PaymentAccountStatus statusOrActive(PaymentAccountStatus status) {
        return status == null ? PaymentAccountStatus.ACTIVE : status;
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
