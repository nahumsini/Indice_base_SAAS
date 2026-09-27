package com.indice.erp.pos.square;

import java.sql.Timestamp;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class SquareOAuthStateCleanupStore {
    private final JdbcTemplate jdbc;
    int deleteExpired(Instant now, int limit) {
        return jdbc.update("DELETE FROM pos_square_oauth_states WHERE expires_at<=? "
            + "ORDER BY expires_at,id LIMIT ?", Timestamp.from(now), Math.clamp(limit, 1, 500));
    }
}
