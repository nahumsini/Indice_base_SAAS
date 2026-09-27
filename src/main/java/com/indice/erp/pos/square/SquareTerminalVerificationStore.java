package com.indice.erp.pos.square;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class SquareTerminalVerificationStore {
    private final JdbcTemplate jdbc;
    SquareTerminalVerificationStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    void verified(long company, long terminal) {
        jdbc.update("""
            UPDATE pos_square_terminals SET verification_status='READY',
              provider_verified_at=CURRENT_TIMESTAMP(6),version=version+1
            WHERE company_id=? AND id=? AND status='PAIRED'
            """, company, terminal);
    }
    void unavailable(long company, long terminal) {
        state(company, terminal, "UNAVAILABLE");
    }
    private void state(long company, long terminal, String status) {
        jdbc.update("UPDATE pos_square_terminals SET verification_status=?,version=version+1 "
            + "WHERE company_id=? AND id=?", status, company, terminal);
    }
}
