package com.indice.erp.pos.square;

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
class SquareOAuthStateStore {
    private final JdbcTemplate jdbc;

    @Transactional
    public SquareConnectionRepository.OAuthState consume(PosContext context, String hash, String environment, Instant now) {
        int changed = jdbc.update("""
            UPDATE pos_square_oauth_states SET status='CONSUMED',consumed_at=?
            WHERE company_id=? AND user_id=? AND environment=? AND state_hash=?
            AND status='PENDING' AND expires_at>?
            """, Timestamp.from(now), context.companyId(), context.userId(), environment, hash, Timestamp.from(now));
        if (changed != 1) throw PosApiException.badRequest("Square OAuth state is invalid or expired.");
        return jdbc.query("""
            SELECT id,company_id,user_id,environment FROM pos_square_oauth_states
            WHERE company_id=? AND user_id=? AND environment=? AND state_hash=? AND status='CONSUMED'
            """, (rs, index) -> new SquareConnectionRepository.OAuthState(rs.getLong("id"),
                rs.getLong("company_id"), rs.getLong("user_id"), rs.getString("environment")),
            context.companyId(), context.userId(), environment, hash).getFirst();
    }
}
