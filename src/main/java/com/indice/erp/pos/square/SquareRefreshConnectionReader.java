package com.indice.erp.pos.square;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareRefreshConnectionReader {
    private final JdbcTemplate jdbc;
    SquareRefreshConnectionReader(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    Optional<SquareRecords.Connection> find(long company, String environment) {
        return query("WHERE company_id=? AND environment=? AND status='CONNECTED'",
            company, environment);
    }
    Optional<SquareRecords.Connection> find(long id) {
        return query("WHERE id=? AND status='CONNECTED'", id);
    }
    private Optional<SquareRecords.Connection> query(String where, Object... values) {
        return jdbc.query("""
            SELECT id,company_id,merchant_id,access_token_protected,refresh_token_protected,
              token_expires_at,token_version FROM pos_square_connections
            """ + where, (rs, row) -> {
                var expires = rs.getTimestamp("token_expires_at");
                return new SquareRecords.Connection(rs.getLong("id"), rs.getLong("company_id"),
                    rs.getString("merchant_id"), rs.getString("access_token_protected"),
                    rs.getString("refresh_token_protected"),
                    expires == null ? null : expires.toInstant(), rs.getLong("token_version"));
            }, values).stream().findFirst();
    }
}
