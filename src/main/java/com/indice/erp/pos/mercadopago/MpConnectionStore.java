package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosSqlSupport;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpConnectionStore {
    private final JdbcTemplate jdbc;

    Optional<MpConnection> find(long company, String environment) { return find(company, environment, false); }
    Optional<MpConnection> find(long company, String environment, boolean lock) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_connections WHERE company_id=? AND environment=?"
            + (lock ? " FOR UPDATE" : ""), (rs, index) -> new MpConnection(
                rs.getLong("id"), rs.getLong("company_id"), rs.getString("seller_id"), rs.getString("environment"),
                rs.getString("state"), rs.getString("country_code"), rs.getString("site_id"), rs.getBoolean("live_mode"),
                rs.getString("access_token_ciphertext"), rs.getString("refresh_token_ciphertext"),
                PosSqlSupport.instant(rs, "expires_at"), rs.getString("scopes"), activation(rs), rs.getLong("version"),
                rs.getString("refresh_lease_id"), PosSqlSupport.instant(rs, "refresh_lease_until")), company, environment)
            .stream().findFirst();
    }
    private MpCompanyActivation activation(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new MpCompanyActivation(rs.getString("live_activation_state"),
            PosSqlSupport.instant(rs, "live_activation_changed_at"), PosSqlSupport.instant(rs, "live_activated_at"),
            PosSqlSupport.instant(rs, "live_suspended_at"), (Long) rs.getObject("live_activation_actor_user_id"),
            rs.getString("live_activation_reason"), rs.getLong("live_activation_version"));
    }
}
