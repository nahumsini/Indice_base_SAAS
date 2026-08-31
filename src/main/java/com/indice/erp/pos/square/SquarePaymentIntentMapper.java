package com.indice.erp.pos.square;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.stereotype.Component;

@Component
public class SquarePaymentIntentMapper {

    public SquareRecords.PaymentIntent map(ResultSet rs, int row) throws SQLException {
        return new SquareRecords.PaymentIntent(
            rs.getLong("id"), rs.getLong("company_id"), rs.getLong("cash_register_id"),
            rs.getLong("shift_id"), rs.getLong("terminal_id"), rs.getString("square_location_id"),
            rs.getString("square_device_id"), rs.getString("idempotency_key"),
            rs.getString("square_checkout_id"), rs.getString("square_payment_id"),
            SquareTerminalPaymentStatus.valueOf(rs.getString("status")),
            rs.getBigDecimal("amount"), rs.getString("currency_code"),
            rs.getString("checkout_payload_sha256"), rs.getString("checkout_request_json"),
            rs.getString("failure_message"), getLong(rs, "pos_ticket_id"),
            rs.getLong("created_by_user_id"), rs.getString("created_by_role"),
            rs.getString("scope_type"), getLong(rs, "scope_unit_id"), getLong(rs, "scope_business_id"),
            PosSqlSupport.instant(rs, "created_at"), PosSqlSupport.instant(rs, "updated_at"),
            PosSqlSupport.instant(rs, "expires_at"));
    }

    private Long getLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getObject(column);
        return value == null ? null : rs.getLong(column);
    }
}
