package com.indice.erp.pos.ticket;

import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.status.TicketStatus;
import com.indice.erp.pos.ticket.dto.PosTicketItemResponse;
import com.indice.erp.pos.ticket.dto.PosTicketResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.stereotype.Component;

@Component
public class TicketMapper {

    public TicketRecord mapTicket(ResultSet rs, int rowNum) throws SQLException {
        return new TicketRecord(
            rs.getLong("id"), rs.getLong("company_id"), PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"), rs.getLong("warehouse_id"),
            rs.getLong("cash_register_id"), rs.getLong("shift_id"), PosSqlSupport.nullableLong(rs, "customer_id"),
            PosSqlSupport.nullableLong(rs, "sales_record_id"), rs.getString("ticket_number"),
            TicketStatus.valueOf(rs.getString("status")), rs.getString("channel"), rs.getString("currency_code"),
            rs.getBigDecimal("subtotal_amount"), rs.getBigDecimal("discount_amount"), rs.getBigDecimal("tax_amount"),
            rs.getBigDecimal("total_amount"), rs.getBigDecimal("paid_amount"), rs.getBigDecimal("balance_amount"),
            rs.getString("customer_name_snapshot"), rs.getString("customer_tax_id_snapshot"), rs.getString("notes"),
            PosSqlSupport.instant(rs, "completed_at"), rs.getLong("created_by_user_id"),
            PosSqlSupport.nullableLong(rs, "updated_by_user_id"), PosSqlSupport.instant(rs, "created_at"),
            PosSqlSupport.instant(rs, "updated_at"), rs.getLong("version"), rs.getString("custom_fields_json"),
            rs.getString("metadata_json")
        );
    }

    public TicketItemRecord mapItem(ResultSet rs, int rowNum) throws SQLException {
        return new TicketItemRecord(
            rs.getLong("id"), rs.getLong("company_id"), rs.getLong("ticket_id"),
            PosSqlSupport.nullableLong(rs, "product_id"), rs.getString("sku_snapshot"),
            rs.getString("product_name_snapshot"), rs.getString("product_type_snapshot"),
            rs.getBigDecimal("quantity"), rs.getBigDecimal("unit_price"), rs.getBigDecimal("discount_amount"),
            rs.getBigDecimal("tax_amount"), rs.getBigDecimal("line_total_amount"), rs.getString("currency_code"),
            rs.getString("metadata_json"), PosSqlSupport.instant(rs, "created_at")
        );
    }

    public PosTicketResponse toResponse(TicketRecord record) {
        return new PosTicketResponse(
            record.id(), record.companyId(), record.unitId(), record.businessId(), record.warehouseId(),
            record.cashRegisterId(), record.shiftId(), record.customerId(), record.salesRecordId(),
            record.ticketNumber(), record.status(), record.channel(), record.currencyCode(), record.subtotalAmount(),
            record.discountAmount(), record.taxAmount(), record.totalAmount(), record.paidAmount(),
            record.balanceAmount(), record.customerNameSnapshot(), record.customerTaxIdSnapshot(), record.notes(),
            record.completedAt(), record.createdByUserId(), record.updatedByUserId(), record.createdAt(),
            record.updatedAt(), record.version(), PosJsonSupport.toJsonNode(record.customFieldsJson()),
            PosJsonSupport.toJsonNode(record.metadataJson())
        );
    }

    public PosTicketItemResponse toResponse(TicketItemRecord record) {
        return new PosTicketItemResponse(
            record.id(), record.companyId(), record.ticketId(), record.productId(), record.skuSnapshot(),
            record.productNameSnapshot(), record.productTypeSnapshot(), record.quantity(), record.unitPrice(),
            record.discountAmount(), record.taxAmount(), record.lineTotalAmount(), record.currencyCode(),
            PosJsonSupport.toJsonNode(record.metadataJson()), record.createdAt()
        );
    }
}
