package com.indice.erp.pos.payment;

import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.payment.dto.PosPaymentResponse;
import com.indice.erp.pos.status.PaymentMethod;
import com.indice.erp.pos.status.PaymentStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {

    public PaymentRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new PaymentRecord(
            rs.getLong("id"), rs.getLong("company_id"), rs.getLong("ticket_id"), rs.getLong("shift_id"),
            rs.getLong("cash_register_id"), PaymentMethod.valueOf(rs.getString("payment_method")),
            PosSqlSupport.nullableLong(rs, "payment_account_id"), rs.getBigDecimal("amount"),
            rs.getString("currency_code"), rs.getString("reference"), PaymentStatus.valueOf(rs.getString("status")),
            PosSqlSupport.instant(rs, "paid_at"), rs.getLong("created_by_user_id"), rs.getString("metadata_json")
        );
    }

    public PosPaymentResponse toResponse(PaymentRecord record) {
        return new PosPaymentResponse(
            record.id(), record.companyId(), record.ticketId(), record.shiftId(), record.cashRegisterId(),
            record.paymentMethod(), record.paymentAccountId(), record.amount(), record.currencyCode(),
            record.reference(), record.status(), record.paidAt(), record.createdByUserId(),
            PosJsonSupport.toJsonNode(record.metadataJson())
        );
    }
}
