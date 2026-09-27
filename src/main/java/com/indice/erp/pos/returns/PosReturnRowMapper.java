package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.*;
import org.springframework.jdbc.core.RowMapper;

final class PosReturnRowMapper implements RowMapper<PosReturnRecord> {
    public PosReturnRecord mapRow(ResultSet rs, int row) throws SQLException {
        var refundId = PosSqlSupport.nullableLong(rs, "refund_id");
        var refund = refundId == null ? null : new PosReturnRefundState(refundId,
            rs.getString("request_key"), rs.getBigDecimal("refund_amount"),
            rs.getString("refund_status"), rs.getString("refund_reason"),
            PosSqlSupport.instant(rs, "refund_updated_at"), rs.getLong("refund_version"));
        return new PosReturnRecord(rs.getLong("ticket_id"), rs.getString("ticket_number"),
            rs.getString("ticket_status"), PosSqlSupport.instant(rs, "completed_at"),
            rs.getBigDecimal("sale_amount"), rs.getString("currency_code"),
            rs.getString("provider_code"), PosSqlSupport.nullableLong(rs, "intent_id"),
            rs.getString("provider_status"), rs.getBigDecimal("payment_amount"),
            rs.getBigDecimal("refunded_amount"), refund);
    }
}
