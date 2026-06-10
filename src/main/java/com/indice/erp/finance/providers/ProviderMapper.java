package com.indice.erp.finance.providers;

import com.indice.erp.finance.providers.dto.CreateProviderRequest;
import com.indice.erp.finance.providers.dto.ProviderResponse;
import com.indice.erp.finance.providers.dto.UpdateProviderRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceJsonSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
public class ProviderMapper {

    public ProviderRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new ProviderRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            nullableLong(rs, "unit_id"),
            nullableLong(rs, "business_id"),
            rs.getString("name"),
            rs.getString("legal_name"),
            rs.getString("tax_id"),
            rs.getString("email"),
            rs.getString("phone"),
            rs.getString("contact_name"),
            nullableInteger(rs, "payment_terms_days"),
            ProviderStatus.valueOf(rs.getString("status")),
            rs.getString("notes"),
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

    public ProviderResponse toResponse(ProviderRecord record) {
        return new ProviderResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.name(),
            record.legalName(), record.taxId(), record.email(), record.phone(), record.contactName(),
            record.paymentTermsDays(), record.status(), record.notes(), record.createdByUserId(),
            record.updatedByUserId(), record.createdAt(), record.updatedAt(), record.deletedAt(),
            record.version(), FinanceJsonSupport.toJsonNode(record.customFieldsJson()),
            FinanceJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    public ProviderCommand toCreateCommand(
            FinanceContext context,
            CreateProviderRequest request,
            ProviderScopedAssignment assignment) {
        return newCommand(context, assignment, request.name(), request.legalName(), request.taxId(),
            request.email(), request.phone(), request.contactName(), request.paymentTermsDays(),
            request.status(), request.notes(), FinanceJsonSupport.toJson(request.customFields()),
            FinanceJsonSupport.toJson(request.metadata()), true);
    }

    public ProviderCommand toUpdateCommand(
            FinanceContext context,
            UpdateProviderRequest request,
            ProviderScopedAssignment assignment) {
        return newCommand(context, assignment, request.name(), request.legalName(), request.taxId(),
            request.email(), request.phone(), request.contactName(), request.paymentTermsDays(),
            request.status(), request.notes(), FinanceJsonSupport.toJson(request.customFields()),
            FinanceJsonSupport.toJson(request.metadata()), false);
    }

    private ProviderCommand newCommand(
            FinanceContext context,
            ProviderScopedAssignment assignment,
            String name,
            String legalName,
            String taxId,
            String email,
            String phone,
            String contactName,
            Integer paymentTermsDays,
            ProviderStatus status,
            String notes,
            String customFieldsJson,
            String metadataJson,
            boolean create) {
        return new ProviderCommand(
            assignment.unitId(), assignment.businessId(), trim(name), trimToNull(legalName), trimToNull(taxId),
            trimToNull(email), trimToNull(phone), trimToNull(contactName), paymentTermsDays,
            status == null ? ProviderStatus.ACTIVE : status, trimToNull(notes), create ? context.userId() : null,
            create ? null : context.userId(), customFieldsJson, metadataJson
        );
    }

    private Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private Integer nullableInteger(ResultSet rs, String column) throws SQLException {
        var value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    private String trimToNull(String value) {
        var trimmed = trim(value);
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
