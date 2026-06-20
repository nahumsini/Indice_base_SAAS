package com.indice.erp.pos.cashregister;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashregister.dto.CashRegisterCreateRequest;
import com.indice.erp.pos.cashregister.dto.CashRegisterResponse;
import com.indice.erp.pos.cashregister.dto.CashRegisterUpdateRequest;
import com.indice.erp.pos.context.dto.WarehouseSummary;
import com.indice.erp.pos.status.CashRegisterStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class CashRegisterMapper {

    public CashRegisterRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new CashRegisterRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"),
            rs.getLong("warehouse_id"),
            rs.getString("warehouse_name"),
            rs.getString("code"),
            rs.getString("name"),
            CashRegisterStatus.valueOf(rs.getString("status")),
            rs.getBoolean("is_active"),
            rs.getString("notes"),
            rs.getLong("created_by_user_id"),
            PosSqlSupport.nullableLong(rs, "updated_by_user_id"),
            PosSqlSupport.instant(rs, "created_at"),
            PosSqlSupport.instant(rs, "updated_at"),
            PosSqlSupport.instant(rs, "deleted_at"),
            rs.getLong("version"),
            rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public CashRegisterResponse toResponse(CashRegisterRecord record) {
        return new CashRegisterResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(),
            record.warehouseId(), record.warehouseName(), record.code(), record.name(),
            record.status(), record.active(), record.notes(), record.createdByUserId(),
            record.updatedByUserId(), record.createdAt(), record.updatedAt(), record.version(),
            PosJsonSupport.toJsonNode(record.customFieldsJson()),
            PosJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    CashRegisterCommand toCreateCommand(
            PosContext context,
            CashRegisterCreateRequest request,
            WarehouseSummary warehouse) {
        var status = normalizeStatus(request.status(), request.active());
        return new CashRegisterCommand(
            warehouse.unitId(), warehouse.businessId(), warehouse.id(), normalizeCode(request.code()),
            trim(request.name()), status, status == CashRegisterStatus.ACTIVE, trimToNull(request.notes()),
            context.userId(), null, PosJsonSupport.toJson(request.customFields()),
            PosJsonSupport.toJson(request.metadata())
        );
    }

    CashRegisterCommand toUpdateCommand(
            PosContext context,
            CashRegisterUpdateRequest request,
            WarehouseSummary warehouse) {
        var status = normalizeStatus(request.status(), request.active());
        return new CashRegisterCommand(
            warehouse.unitId(), warehouse.businessId(), warehouse.id(), normalizeCode(request.code()),
            trim(request.name()), status, status == CashRegisterStatus.ACTIVE, trimToNull(request.notes()),
            null, context.userId(), PosJsonSupport.toJson(request.customFields()),
            PosJsonSupport.toJson(request.metadata())
        );
    }

    private CashRegisterStatus normalizeStatus(CashRegisterStatus status, Boolean active) {
        if (status != null) {
            return status;
        }
        return Boolean.FALSE.equals(active) ? CashRegisterStatus.INACTIVE : CashRegisterStatus.ACTIVE;
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
