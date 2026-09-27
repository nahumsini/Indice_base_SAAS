package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@RequiredArgsConstructor
class MpOAuthStore {
    private final JdbcTemplate jdbc;
    private final MpPaymentAudit audit;

    @Transactional
    public void create(PosContext context, String hash, String environment, String verifier, Instant expiry) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_oauth_states
            (company_id,actor_user_id,state_hash,environment,verifier_ciphertext,expires_at)
            VALUES (?,?,?,?,?,?)
            """, context.companyId(), context.userId(), hash, environment, verifier, Timestamp.from(expiry));
        audit.record(context.companyId(), context.userId(), null, "OAUTH_STARTED", "PENDING");
    }

    @Transactional
    public MpOAuthState consume(PosContext context, String hash, Instant now) {
        var state = jdbc.query("""
            SELECT company_id,actor_user_id,environment,verifier_ciphertext
            FROM pos_mercado_pago_oauth_states WHERE company_id=? AND actor_user_id=?
            AND state_hash=? AND consumed_at IS NULL AND expires_at>? FOR UPDATE
            """, (rs, index) -> new MpOAuthState(rs.getLong("company_id"), rs.getLong("actor_user_id"),
                rs.getString("environment"), rs.getString("verifier_ciphertext")),
            context.companyId(), context.userId(), hash, Timestamp.from(now)).stream().findFirst()
            .orElseThrow(() -> PosApiException.badRequest("Merchant authorization is invalid or expired."));
        if (jdbc.update("DELETE FROM pos_mercado_pago_oauth_states WHERE company_id=? "
                + "AND actor_user_id=? AND state_hash=? AND consumed_at IS NULL",
                context.companyId(), context.userId(), hash) != 1) {
            throw PosApiException.conflict("Merchant authorization changed during completion.");
        }
        return state;
    }
}
