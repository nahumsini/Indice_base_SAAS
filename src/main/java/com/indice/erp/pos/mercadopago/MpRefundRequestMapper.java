package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

@Component
class MpRefundRequestMapper implements RowMapper<MpRefundRecord> {
    public MpRefundRecord mapRow(ResultSet row, int index) throws SQLException {
        return new MpRefundRecord(row.getLong("id"), row.getLong("company_id"), row.getLong("intent_id"),
            row.getString("request_key"), row.getBigDecimal("amount"), row.getBigDecimal("baseline_amount"),
            row.getString("request_json"), row.getString("payload_hash"), row.getString("status"),
            (Long) row.getObject("requested_by_user_id"), row.getString("requested_by_role"),
            row.getString("requested_scope_type"), (Long) row.getObject("requested_scope_unit_id"),
            (Long) row.getObject("requested_scope_business_id"), row.getString("work_lease_id"),
            PosSqlSupport.instant(row, "work_lease_until"), row.getInt("submission_attempts"),
            row.getInt("recovery_attempts"), PosSqlSupport.instant(row, "next_attempt_at"),
            row.getString("last_error_code"), PosSqlSupport.instant(row, "last_provider_check_at"),
            row.getLong("version"));
    }
}
