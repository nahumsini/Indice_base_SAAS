package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SquareConnectionRepository {

    private final JdbcTemplate jdbcTemplate;

    public SquareConnectionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void createOAuthState(PosContext context, String stateHash, String environment, Instant expiresAt) {
        jdbcTemplate.update("""
            INSERT INTO pos_square_oauth_states (company_id, user_id, state_hash, environment, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """, context.companyId(), context.userId(), stateHash, environment, Timestamp.from(expiresAt));
    }

    @Transactional
    public OAuthState consumeOAuthState(String stateHash, Instant now) {
        var rows = jdbcTemplate.query("""
            SELECT id, company_id, user_id, environment
            FROM pos_square_oauth_states
            WHERE state_hash = ? AND status = 'PENDING' AND expires_at > ?
            LIMIT 1 FOR UPDATE
            """, (rs, rowNum) -> new OAuthState(
                rs.getLong("id"), rs.getLong("company_id"), rs.getLong("user_id"),
                rs.getString("environment")), stateHash, Timestamp.from(now));
        if (rows.isEmpty()) return null;
        var state = rows.getFirst();
        jdbcTemplate.update("""
            UPDATE pos_square_oauth_states
            SET status = 'CONSUMED', consumed_at = ?
            WHERE id = ? AND status = 'PENDING'
            """, Timestamp.from(now), state.id());
        return state;
    }

    public void upsertConnection(OAuthState state, SquareRecords.Connection connection) {
        jdbcTemplate.update("""
            INSERT INTO pos_square_connections
              (company_id, environment, merchant_id, access_token_protected, refresh_token_protected,
               token_expires_at, status, created_by_user_id, updated_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, 'CONNECTED', ?, ?)
            ON DUPLICATE KEY UPDATE merchant_id = VALUES(merchant_id),
              access_token_protected = VALUES(access_token_protected),
              refresh_token_protected = VALUES(refresh_token_protected),
              token_expires_at = VALUES(token_expires_at), status = 'CONNECTED',
              updated_by_user_id = VALUES(updated_by_user_id)
            """, state.companyId(), state.environment(), connection.merchantId(), connection.accessToken(),
            connection.refreshToken(), timestamp(connection.tokenExpiresAt()), state.userId(), state.userId());
    }

    public Optional<SquareRecords.Connection> findConnection(PosContext context, String environment) {
        return jdbcTemplate.query("""
            SELECT id, company_id, merchant_id, access_token_protected, refresh_token_protected, token_expires_at
            FROM pos_square_connections
            WHERE company_id = ? AND environment = ? AND status = 'CONNECTED'
            """, this::mapConnection, context.companyId(), environment).stream().findFirst();
    }

    public Optional<SquareRecords.Connection> findConnection(long companyId, String environment) {
        return jdbcTemplate.query("""
            SELECT id, company_id, merchant_id, access_token_protected, refresh_token_protected, token_expires_at
            FROM pos_square_connections
            WHERE company_id = ? AND environment = ? AND status = 'CONNECTED'
            """, this::mapConnection, companyId, environment).stream().findFirst();
    }

    public void updateTokens(long connectionId, SquareRecords.Connection connection, Long actorUserId) {
        jdbcTemplate.update("""
            UPDATE pos_square_connections
            SET merchant_id = ?, access_token_protected = ?, refresh_token_protected = ?,
                token_expires_at = ?, status = 'CONNECTED', updated_by_user_id = ?
            WHERE id = ?
            """, connection.merchantId(), connection.accessToken(), connection.refreshToken(),
            timestamp(connection.tokenExpiresAt()), actorUserId, connectionId);
    }

    public void markError(long connectionId, Long actorUserId) {
        jdbcTemplate.update("""
            UPDATE pos_square_connections
            SET status = 'ERROR', updated_by_user_id = ?
            WHERE id = ?
            """, actorUserId, connectionId);
    }

    public Optional<Long> findCompanyIdByMerchant(String environment, String merchantId) {
        return jdbcTemplate.query("""
            SELECT company_id FROM pos_square_connections
            WHERE environment = ? AND merchant_id = ? AND status = 'CONNECTED'
            """, (rs, rowNum) -> rs.getLong("company_id"), environment, merchantId).stream().findFirst();
    }

    public SquareRecords.Location upsertLocation(
        PosContext context, SquareTerminalDtos.SquareLocation location) {
        jdbcTemplate.update("""
            INSERT INTO pos_square_locations
              (company_id, square_location_id, name, currency_code, country_code, created_by_user_id, updated_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name = VALUES(name), currency_code = VALUES(currency_code),
              country_code = VALUES(country_code), updated_by_user_id = VALUES(updated_by_user_id)
            """, context.companyId(), location.id(), location.name(), location.currencyCode(),
            location.countryCode(), context.userId(), context.userId());
        return findLocation(context, location.id()).orElseThrow();
    }

    public Optional<SquareRecords.Location> findLocation(PosContext context, String squareLocationId) {
        return jdbcTemplate.query("""
            SELECT id, company_id, square_location_id, name, currency_code, country_code
            FROM pos_square_locations
            WHERE company_id = ? AND square_location_id = ?
            """, this::mapLocation, context.companyId(), squareLocationId).stream().findFirst();
    }

    public List<SquareRecords.Location> listLinkedLocations(PosContext context) {
        return jdbcTemplate.query("""
            SELECT id, company_id, square_location_id, name, currency_code, country_code
            FROM pos_square_locations
            WHERE company_id = ?
            ORDER BY name, id
            """, this::mapLocation, context.companyId());
    }

    private SquareRecords.Connection mapConnection(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        var expires = rs.getTimestamp("token_expires_at");
        return new SquareRecords.Connection(
            rs.getLong("id"), rs.getLong("company_id"), rs.getString("merchant_id"),
            rs.getString("access_token_protected"), rs.getString("refresh_token_protected"),
            expires == null ? null : expires.toInstant());
    }

    private SquareRecords.Location mapLocation(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new SquareRecords.Location(
            rs.getLong("id"), rs.getLong("company_id"), rs.getString("square_location_id"),
            rs.getString("name"), rs.getString("currency_code"), rs.getString("country_code"));
    }

    private Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }

    public record OAuthState(long id, long companyId, long userId, String environment) {
    }
}
