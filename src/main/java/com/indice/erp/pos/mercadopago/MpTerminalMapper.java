package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosSqlSupport;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
record MpTerminalMapper(MpProperties properties, Clock clock) {
    MpTerminal map(ResultSet row, int index) throws SQLException {
        var verified = PosSqlSupport.instant(row, "provider_verified_at");
        var verification = effective(row.getString("verification_status"), verified);
        return new MpTerminal(row.getLong("id"), row.getLong("company_id"), row.getLong("connection_id"),
            row.getString("provider_terminal_id"), row.getString("store_id"), row.getString("pos_id"),
            row.getString("name"), row.getString("status"), row.getString("operating_mode"),
            PosSqlSupport.nullableLong(row, "cash_register_id"),
            PosSqlSupport.instant(row, "provider_last_seen_at"), verified, verification,
            row.getString("verification_failure_code"), row.getLong("version"),
            row.getString("verification_lease_id"), PosSqlSupport.instant(row, "verification_lease_until"));
    }
    private String effective(String status, Instant verified) {
        if (!"READY".equals(status)) return status;
        if (verified == null || !verified.plusSeconds(properties.verificationMaxAgeSeconds()).isAfter(clock.instant()))
            return "STALE";
        return status;
    }
}
