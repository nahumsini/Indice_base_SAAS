package com.indice.erp.pos.cashmovement;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashmovement.dto.CashMovementCreateRequest;
import com.indice.erp.pos.cashmovement.dto.CashMovementResponse;
import com.indice.erp.pos.shift.ShiftRecord;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class CashMovementMapper {

    public CashMovementRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new CashMovementRecord(
            rs.getLong("id"), rs.getLong("company_id"), PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"), rs.getLong("warehouse_id"),
            rs.getLong("cash_register_id"), rs.getLong("shift_id"),
            CashMovementType.valueOf(rs.getString("movement_type")), rs.getBigDecimal("amount"),
            rs.getString("currency_code"), rs.getString("reason"), rs.getString("reference"),
            rs.getLong("created_by_user_id"), PosSqlSupport.instant(rs, "created_at"),
            rs.getString("metadata_json")
        );
    }

    public CashMovementResponse toResponse(CashMovementRecord record) {
        return new CashMovementResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.warehouseId(),
            record.cashRegisterId(), record.shiftId(), record.movementType(), record.amount(),
            record.currencyCode(), record.reason(), record.reference(), record.createdByUserId(),
            record.createdAt(), PosJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    public CashMovementCommand toCommand(PosContext context, ShiftRecord shift, CashMovementCreateRequest request) {
        return new CashMovementCommand(
            shift.unitId(), shift.businessId(), shift.warehouseId(), shift.cashRegisterId(), shift.id(),
            movementType(request.movementType()), request.amount(), normalizeCurrency(request.currencyCode()),
            trimToNull(request.reason()), truncate(request.reference(), 160), context.userId(),
            PosJsonSupport.toJson(request.metadata())
        );
    }

    CashMovementType movementType(String value) {
        try {
            return CashMovementType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (RuntimeException ex) {
            throw PosApiException.badRequest("Invalid cash movement type.");
        }
    }

    String normalizeCurrency(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }

    private String truncate(String value, int maxLength) {
        var trimmed = trimToNull(value);
        return trimmed == null || trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}
