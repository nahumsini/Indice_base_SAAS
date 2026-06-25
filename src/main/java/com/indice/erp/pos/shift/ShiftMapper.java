package com.indice.erp.pos.shift;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashregister.CashRegisterRecord;
import com.indice.erp.pos.shift.dto.ShiftOpenRequest;
import com.indice.erp.pos.shift.dto.ShiftResponse;
import com.indice.erp.pos.status.ShiftStatus;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class ShiftMapper {

    public ShiftRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new ShiftRecord(
            rs.getLong("id"), rs.getLong("company_id"), PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"), rs.getLong("warehouse_id"),
            rs.getLong("cash_register_id"), rs.getString("cash_register_name"),
            rs.getLong("opened_by_user_id"), PosSqlSupport.nullableLong(rs, "closed_by_user_id"),
            ShiftStatus.valueOf(rs.getString("status")), rs.getBigDecimal("opening_amount"),
            rs.getBigDecimal("expected_cash_amount"), rs.getBigDecimal("counted_cash_amount"),
            rs.getBigDecimal("over_short_amount"), rs.getString("currency_code"),
            PosSqlSupport.instant(rs, "opened_at"), PosSqlSupport.instant(rs, "closed_at"),
            rs.getString("opening_note"), rs.getString("closing_note"),
            rs.getLong("created_by_user_id"), PosSqlSupport.nullableLong(rs, "updated_by_user_id"),
            PosSqlSupport.instant(rs, "created_at"), PosSqlSupport.instant(rs, "updated_at"),
            rs.getLong("version"), rs.getString("custom_fields_json"), rs.getString("metadata_json")
        );
    }

    public ShiftResponse toResponse(ShiftRecord record) {
        return new ShiftResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.warehouseId(),
            record.cashRegisterId(), record.cashRegisterName(), record.openedByUserId(),
            record.closedByUserId(), record.status(), record.openingAmount(), record.expectedCashAmount(),
            record.countedCashAmount(), record.overShortAmount(), record.currencyCode(), record.openedAt(),
            record.closedAt(), record.openingNote(), record.closingNote(), record.version(),
            PosJsonSupport.toJsonNode(record.customFieldsJson()), PosJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    ShiftCommand toOpenCommand(PosContext context, CashRegisterRecord register, ShiftOpenRequest request) {
        var openingAmount = request.openingAmount() == null ? BigDecimal.ZERO : request.openingAmount();
        return new ShiftCommand(
            register.unitId(), register.businessId(), register.warehouseId(), register.id(),
            context.userId(), null, ShiftStatus.OPEN, openingAmount, openingAmount, null, null,
            normalizeCurrency(request.currencyCode()), trimToNull(request.openingNote()), null,
            context.userId(), null, PosJsonSupport.toJson(request.customFields()),
            PosJsonSupport.toJson(request.metadata())
        );
    }

    ShiftCommand toCloseCommand(PosContext context, ShiftRecord shift, BigDecimal counted, String note) {
        return new ShiftCommand(
            shift.unitId(), shift.businessId(), shift.warehouseId(), shift.cashRegisterId(),
            shift.openedByUserId(), context.userId(), ShiftStatus.CLOSED, shift.openingAmount(),
            shift.expectedCashAmount(), counted, counted.subtract(shift.expectedCashAmount()),
            shift.currencyCode(), shift.openingNote(), trimToNull(note), null, context.userId(),
            shift.customFieldsJson(), shift.metadataJson()
        );
    }

    ShiftCommand toCancelCommand(PosContext context, ShiftRecord shift, String reason) {
        return new ShiftCommand(
            shift.unitId(), shift.businessId(), shift.warehouseId(), shift.cashRegisterId(),
            shift.openedByUserId(), context.userId(), ShiftStatus.CANCELLED, shift.openingAmount(),
            shift.expectedCashAmount(), null, null, shift.currencyCode(), shift.openingNote(),
            trimToNull(reason), null, context.userId(), shift.customFieldsJson(), shift.metadataJson()
        );
    }

    private String normalizeCurrency(String value) {
        return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        var trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isBlank() ? null : trimmed;
    }
}
