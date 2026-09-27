package com.indice.erp.pos.mercadopago;

import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpCompanyActivationStore {
    private final JdbcTemplate jdbc;
    MpCompanyActivation change(MpConnection connection, MpActivationState state,
            long actor, String reason, long expectedVersion, Instant now) {
        var timestamp = Timestamp.from(now);
        var activation = connection.activation().transition(state, actor, reason, now);
        int changed = jdbc.update("""
            UPDATE pos_mercado_pago_connections SET live_activation_state=?,
            live_activation_actor_user_id=?,live_activation_reason=?,live_activation_changed_at=?,
            live_activated_at=?,live_suspended_at=?,
            live_activation_version=live_activation_version+1,version=version+1,
            updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=? AND environment='production'
            AND live_activation_version=?
            """, state.name(), actor, reason, timestamp, sql(activation.activatedAt()), sql(activation.suspendedAt()),
            connection.companyId(), connection.id(), expectedVersion);
        if (changed != 1) throw new IllegalStateException("Merchant activation changed concurrently.");
        return activation;
    }
    private Timestamp sql(Instant value) { return value == null ? null : Timestamp.from(value); }
}
