package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.terminal.TerminalBindingRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareTerminalMutationReader {
    private final JdbcTemplate jdbc;
    private final TerminalBindingRepository bindings;
    SquareTerminalMutationReader(JdbcTemplate jdbc, TerminalBindingRepository bindings) {
        this.jdbc = jdbc;
        this.bindings = bindings;
    }
    SquareRecords.Terminal require(PosContext context, long id) {
        var terminal = jdbc.query("""
            SELECT terminal.*, location.square_location_id FROM pos_square_terminals terminal
            JOIN pos_square_locations location ON location.id = terminal.square_location_row_id
              AND location.company_id = terminal.company_id
            WHERE terminal.company_id = ? AND terminal.id = ? FOR UPDATE
            """, (rs, row) -> new SquareRecords.Terminal(rs.getLong("id"), rs.getLong("company_id"),
                rs.getLong("square_location_row_id"), rs.getString("square_location_id"), rs.getString("square_device_code_id"),
                rs.getString("square_device_id"), rs.getString("name"), rs.getString("status"), null), context.companyId(), id)
            .stream().findFirst().orElseThrow(() -> PosApiException.notFound("Square terminal was not found."));
        var assigned = bindings.assignedRegisters(context, "SQUARE", id);
        if (assigned.size() > 1) throw PosApiException.conflict("Square terminal has ambiguous register bindings.");
        return new SquareRecords.Terminal(terminal.id(), terminal.companyId(), terminal.locationRowId(), terminal.squareLocationId(),
            terminal.deviceCodeId(), terminal.deviceId(), terminal.name(), terminal.status(), assigned.isEmpty() ? null : assigned.getFirst());
    }
}
