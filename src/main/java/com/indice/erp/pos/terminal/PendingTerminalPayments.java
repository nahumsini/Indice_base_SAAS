package com.indice.erp.pos.terminal;

import com.indice.erp.pos.PosContext;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PendingTerminalPayments {
    public record Attempt(String providerCode, long intentId) {}
    private final JdbcTemplate jdbc;
    public PendingTerminalPayments(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    public List<Attempt> find(PosContext context, long registerId) {
        var rows = new java.util.ArrayList<Attempt>();
        rows.addAll(jdbc.query("""
            SELECT 'SQUARE' provider_code, id FROM pos_square_terminal_payment_intents
            WHERE company_id = ? AND cash_register_id = ? AND pos_ticket_id IS NULL
              AND status IN ('WAITING', 'UNCERTAIN', 'APPROVED', 'PARTIALLY_REFUNDED',
                'RECONCILIATION_REQUIRED')
            FOR UPDATE
            """, (rs, row) -> new Attempt(rs.getString("provider_code"), rs.getLong("id")), context.companyId(), registerId));
        rows.addAll(jdbc.query("""
            SELECT 'MERCADO_PAGO' provider_code, id FROM pos_mercado_pago_payment_intents
            WHERE company_id = ? AND cash_register_id = ? AND pos_ticket_id IS NULL
              AND status IN ('WAITING', 'UNCERTAIN', 'APPROVED', 'PARTIALLY_REFUNDED',
                'RECONCILIATION_REQUIRED')
            FOR UPDATE
            """, (rs, row) -> new Attempt(rs.getString("provider_code"), rs.getLong("id")), context.companyId(), registerId));
        return rows;
    }
}
