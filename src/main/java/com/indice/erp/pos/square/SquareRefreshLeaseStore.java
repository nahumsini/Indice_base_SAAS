package com.indice.erp.pos.square;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareRefreshLeaseStore {
    private final JdbcTemplate jdbc;
    SquareRefreshLeaseStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    boolean claim(long id, long version, String owner, Instant until) {
        return jdbc.update("""
            UPDATE pos_square_connections SET refresh_lease_owner=?,refresh_lease_until=?
            WHERE id=? AND token_version=? AND status='CONNECTED'
              AND (refresh_lease_until IS NULL OR refresh_lease_until<CURRENT_TIMESTAMP(6))
            """, owner, Timestamp.from(until), id, version) == 1;
    }
    boolean complete(long id, long version, String owner,
            SquareRecords.Connection value, Long actor) {
        return jdbc.update("""
            UPDATE pos_square_connections SET access_token_protected=?,refresh_token_protected=?,
              token_expires_at=?,token_version=token_version+1,status='CONNECTED',
              refresh_lease_owner=NULL,refresh_lease_until=NULL,updated_by_user_id=?
            WHERE id=? AND token_version=? AND refresh_lease_owner=? AND merchant_id=?
            """, value.accessToken(), value.refreshToken(), Timestamp.from(value.tokenExpiresAt()),
            actor, id, version, owner, value.merchantId()) == 1;
    }
    void release(long id, String owner) {
        jdbc.update("UPDATE pos_square_connections SET refresh_lease_owner=NULL,refresh_lease_until=NULL "
            + "WHERE id=? AND refresh_lease_owner=?", id, owner);
    }
    boolean fail(long id, long version, String owner, Long actor) {
        return jdbc.update("""
            UPDATE pos_square_connections SET status='ERROR',updated_by_user_id=?,
              refresh_lease_owner=NULL,refresh_lease_until=NULL
            WHERE id=? AND token_version=? AND refresh_lease_owner=?
            """, actor, id, version, owner) == 1;
    }
}
