package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class SquareTerminalRepository {

    private final JdbcTemplate jdbcTemplate;

    public SquareTerminalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public SquareRecords.Terminal insert(
        PosContext context, SquareRecords.Location location, String deviceCodeId,
        String deviceCode, String name, Instant pairBy) {
        var key = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_square_terminals
                  (company_id, square_location_row_id, square_device_code_id, name,
                   pairing_code_hint, pair_by, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setLong(2, location.id());
            statement.setString(3, deviceCodeId);
            statement.setString(4, name);
            statement.setString(5, hint(deviceCode));
            statement.setTimestamp(6, timestamp(pairBy));
            statement.setLong(7, context.userId());
            return statement;
        }, key);
        return findById(context, key.getKey().longValue()).orElseThrow();
    }

    public Optional<SquareRecords.Terminal> findById(PosContext context, long terminalId) {
        return jdbcTemplate.query(select() + """
            WHERE terminal.company_id = ? AND terminal.id = ?
            """, this::map, context.companyId(), terminalId).stream().findFirst();
    }

    public List<SquareRecords.Terminal> list(PosContext context) {
        return jdbcTemplate.query(select() + """
            WHERE terminal.company_id = ?
            ORDER BY terminal.updated_at DESC, terminal.id DESC
            """, this::map, context.companyId());
    }

    public Optional<SquareRecords.Terminal> findAssigned(PosContext context, long registerId) {
        return jdbcTemplate.query(select() + """
            JOIN pos_square_register_terminals assignment
              ON assignment.terminal_id = terminal.id AND assignment.company_id = terminal.company_id
             AND assignment.active = TRUE
            WHERE terminal.company_id = ? AND assignment.cash_register_id = ?
            """, this::map, context.companyId(), registerId).stream().findFirst();
    }

    public Optional<SquareRecords.Terminal> findByDeviceCode(long companyId, String deviceCodeId) {
        return jdbcTemplate.query(select() + """
            WHERE terminal.company_id = ? AND terminal.square_device_code_id = ?
            """, this::map, companyId, deviceCodeId).stream().findFirst();
    }

    public void markPaired(long companyId, String deviceCodeId, String deviceId) {
        jdbcTemplate.update("""
            UPDATE pos_square_terminals
            SET square_device_id = ?, status = 'PAIRED', updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND square_device_code_id = ?
            """, deviceId, companyId, deviceCodeId);
    }

    public void assign(PosContext context, long cashRegisterId, long terminalId) {
        jdbcTemplate.update("""
            UPDATE pos_square_register_terminals
            SET active = FALSE, removed_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND (cash_register_id = ? OR terminal_id = ?) AND active = TRUE
            """, context.companyId(), cashRegisterId, terminalId);
        jdbcTemplate.update("""
            INSERT INTO pos_square_register_terminals
              (company_id, cash_register_id, terminal_id, assigned_by_user_id)
            VALUES (?, ?, ?, ?)
            """, context.companyId(), cashRegisterId, terminalId, context.userId());
    }

    public boolean unassign(PosContext context, long cashRegisterId) {
        return jdbcTemplate.update("""
            UPDATE pos_square_register_terminals
            SET active = FALSE, removed_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND cash_register_id = ? AND active = TRUE
            """, context.companyId(), cashRegisterId) > 0;
    }

    public boolean disable(PosContext context, long terminalId) {
        jdbcTemplate.update("""
            UPDATE pos_square_register_terminals
            SET active = FALSE, removed_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND terminal_id = ? AND active = TRUE
            """, context.companyId(), terminalId);
        return jdbcTemplate.update("""
            UPDATE pos_square_terminals
            SET status = 'DISABLED', updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND id = ?
            """, context.userId(), context.companyId(), terminalId) > 0;
    }

    public boolean replaceDeviceCode(
            PosContext context, long terminalId, String deviceCodeId, String deviceCode, Instant pairBy) {
        return jdbcTemplate.update("""
            UPDATE pos_square_terminals
            SET square_device_code_id = ?, square_device_id = NULL, pairing_code_hint = ?,
                pair_by = ?, status = 'UNPAIRED', updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND id = ? AND status <> 'DISABLED'
            """, deviceCodeId, hint(deviceCode), timestamp(pairBy), context.userId(),
            context.companyId(), terminalId) > 0;
    }

    private String select() {
        return """
            SELECT terminal.*, location.square_location_id,
                   (
                     SELECT assignment.cash_register_id
                     FROM pos_square_register_terminals assignment
                     WHERE assignment.company_id = terminal.company_id
                       AND assignment.terminal_id = terminal.id
                       AND assignment.active = TRUE
                     LIMIT 1
                   ) AS assigned_register_id
            FROM pos_square_terminals terminal
            JOIN pos_square_locations location ON location.id = terminal.square_location_row_id
            """;
    }

    private SquareRecords.Terminal map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        var assigned = rs.getObject("assigned_register_id");
        return new SquareRecords.Terminal(
            rs.getLong("id"), rs.getLong("company_id"), rs.getLong("square_location_row_id"),
            rs.getString("square_location_id"), rs.getString("square_device_code_id"),
            rs.getString("square_device_id"), rs.getString("name"), rs.getString("status"),
            assigned == null ? null : rs.getLong("assigned_register_id"));
    }

    private String hint(String code) {
        if (code == null || code.isBlank()) return null;
        var clean = code.trim();
        return clean.substring(Math.max(0, clean.length() - 4));
    }

    private Timestamp timestamp(Instant value) {
        return value == null ? null : Timestamp.from(value);
    }
}
