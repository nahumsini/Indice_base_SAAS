package com.indice.erp.pos.terminal;

import com.indice.erp.pos.PosContext;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class TerminalBindingQueries {
    private final JdbcTemplate jdbc;
    TerminalBindingQueries(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    List<TerminalBinding> find(PosContext context, long registerId, boolean lock) {
        var suffix = lock ? " FOR UPDATE" : "";
        var rows = new ArrayList<TerminalBinding>();
        rows.addAll(jdbc.query("""
            SELECT 'SQUARE' provider_code, t.id, t.name, t.status FROM pos_square_register_terminals b
            JOIN pos_square_terminals t ON t.id = b.terminal_id AND t.company_id = b.company_id
            WHERE b.company_id = ? AND b.cash_register_id = ? AND b.active = TRUE
            """ + suffix, (rs, row) -> new TerminalBinding(rs.getString("provider_code"), rs.getLong("id"),
                rs.getString("name"), rs.getString("status")), context.companyId(), registerId));
        rows.addAll(jdbc.query("""
            SELECT id, name, status FROM pos_mercado_pago_terminals
            WHERE company_id = ? AND cash_register_id = ? AND status <> 'DISABLED'
            """ + suffix, (rs, row) -> new TerminalBinding("MERCADO_PAGO", rs.getLong("id"),
                rs.getString("name"), rs.getString("status")), context.companyId(), registerId));
        return rows;
    }
    List<Long> assignedRegisters(PosContext context, String provider, long terminalId) {
        var sql = "SQUARE".equals(provider)
            ? "SELECT cash_register_id FROM pos_square_register_terminals WHERE company_id = ? AND terminal_id = ? AND active = TRUE FOR UPDATE"
            : "SELECT cash_register_id FROM pos_mercado_pago_terminals WHERE company_id = ? AND id = ? AND cash_register_id IS NOT NULL FOR UPDATE";
        return jdbc.queryForList(sql, Long.class, context.companyId(), terminalId);
    }
}
