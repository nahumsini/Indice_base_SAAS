package com.indice.erp.pos.mercadopago;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
class MpTerminalWriter {
    private final JdbcTemplate jdbc;

    void assign(long company, long register, long terminal) {
        jdbc.update("UPDATE pos_mercado_pago_terminals SET cash_register_id=?,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",
            register, company, terminal);
    }
    void unassign(long company, long register) {
        jdbc.update("UPDATE pos_mercado_pago_terminals SET cash_register_id=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND cash_register_id=?",
            company, register);
    }
}
