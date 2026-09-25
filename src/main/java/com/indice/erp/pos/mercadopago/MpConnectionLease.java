package com.indice.erp.pos.mercadopago;

import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
class MpConnectionLease {
    private final JdbcTemplate jdbc;
    private final MpPaymentAudit audit;

    boolean claim(MpConnection connection, String lease, Instant until) {
        return jdbc.update("""
            UPDATE pos_mercado_pago_connections SET refresh_lease_id=?,refresh_lease_until=?
            WHERE company_id=? AND id=? AND version=? AND state='CONNECTED' AND refresh_lease_id IS NULL
            """, lease, Timestamp.from(until), connection.companyId(), connection.id(), connection.version()) == 1;
    }
    @Transactional
    public boolean rotated(MpConnection connection, String lease, String access, String refresh, Instant expiry, String scopes) {
        boolean updated = jdbc.update("""
            UPDATE pos_mercado_pago_connections SET access_token_ciphertext=?,refresh_token_ciphertext=?,
            expires_at=?,scopes=?,version=version+1,refresh_lease_id=NULL,refresh_lease_until=NULL,updated_at=CURRENT_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND version=? AND refresh_lease_id=? AND state='CONNECTED'
            """, access, refresh, Timestamp.from(expiry), scopes, connection.companyId(), connection.id(), connection.version(), lease) == 1;
        if (updated) audit.record(connection.companyId(), null, null, "CREDENTIALS_REFRESHED", "CONNECTED");
        return updated;
    }
    @Transactional
    public void reconnect(MpConnection connection, String lease) {
        int updated = jdbc.update("""
            UPDATE pos_mercado_pago_connections SET state='RECONNECT_REQUIRED',version=version+1,updated_at=CURRENT_TIMESTAMP(6)
            WHERE company_id=? AND id=? AND version=? AND refresh_lease_id=?
            """, connection.companyId(), connection.id(), connection.version(), lease);
        if (updated == 1) audit.record(connection.companyId(), null, null, "CREDENTIALS_REFRESH_FAILED", "RECONNECT_REQUIRED");
    }
}
