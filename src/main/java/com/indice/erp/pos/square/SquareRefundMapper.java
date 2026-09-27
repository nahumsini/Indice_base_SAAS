package com.indice.erp.pos.square;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;

@Component
class SquareRefundMapper implements RowMapper<SquareRefundRecord> {
    public SquareRefundRecord mapRow(ResultSet r, int row) throws SQLException {
        return new SquareRefundRecord(r.getLong("id"), r.getLong("company_id"), r.getLong("intent_id"),
            r.getString("request_key"), r.getBigDecimal("amount"), r.getBigDecimal("baseline_amount"),
            r.getString("currency_code"), r.getString("request_json"), r.getString("payload_hash"),
            r.getString("reason"), r.getString("environment"), r.getString("merchant_id"),
            r.getString("provider_refund_id"), r.getString("verified_evidence_json"), r.getString("status"),
            (Long) r.getObject("requested_by_user_id"), r.getString("requested_by_role"),
            r.getString("requested_scope_type"), (Long) r.getObject("requested_scope_unit_id"),
            (Long) r.getObject("requested_scope_business_id"), r.getString("work_lease_id"),
            PosSqlSupport.instant(r, "work_lease_until"), r.getInt("submission_attempts"),
            r.getInt("manual_replay_attempts"), r.getInt("recovery_attempts"),
            PosSqlSupport.instant(r, "next_attempt_at"),
            r.getString("last_error_code"), PosSqlSupport.instant(r, "last_provider_check_at"),
            r.getLong("version"));
    }
}
