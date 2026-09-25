package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

@Component
public class MpIntentMapper implements RowMapper<MpIntent> {
    @Override
    public MpIntent mapRow(ResultSet rs, int row) throws SQLException {
        return new MpIntent(rs.getLong("id"), rs.getLong("company_id"),
            rs.getLong("cash_register_id"), rs.getLong("shift_id"),
            rs.getLong("terminal_id"), rs.getLong("connection_id"),
            rs.getString("provider_terminal_id"), rs.getString("seller_id"),
            rs.getString("environment"), rs.getString("idempotency_key"),
            rs.getString("external_reference"), rs.getString("status"),
            rs.getBigDecimal("amount"), rs.getString("currency_code"),
            rs.getString("payload_hash"), rs.getString("checkout_json"),
            rs.getString("provider_request_json"), rs.getString("order_id"),
            rs.getString("payment_id"), rs.getString("message"),
            PosSqlSupport.nullableLong(rs, "pos_ticket_id"),
            rs.getLong("created_by_user_id"), rs.getString("created_by_role"),
            rs.getString("scope_type"), PosSqlSupport.nullableLong(rs, "scope_unit_id"),
            PosSqlSupport.nullableLong(rs, "scope_business_id"),
            PosSqlSupport.instant(rs, "created_at"), PosSqlSupport.instant(rs, "expires_at"),
            rs.getLong("version"), PosSqlSupport.instant(rs, "dispatched_at"),
            rs.getString("provider_state"), rs.getBoolean("refund_pending"));
    }
}
