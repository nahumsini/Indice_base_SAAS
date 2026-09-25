package com.indice.erp.pos.terminal;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Repository
public class TerminalRegisterLock {
    private final JdbcTemplate jdbc;
    public TerminalRegisterLock(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    public void lock(PosContext context, long registerId) {
        requireTransaction();
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(registerId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        var ids = jdbc.queryForList("SELECT r.id FROM pos_cash_registers r "
            + "WHERE r.company_id = ? AND r.id = ? AND r.deleted_at IS NULL AND "
            + PosSqlSupport.scopePredicate("r", context.scope()) + " FOR UPDATE", Long.class, params.toArray());
        if (ids.isEmpty()) throw PosApiException.notFound("Cash register was not found.");
    }
    public void lockTerminal(PosContext context, String provider, long terminalId) {
        requireTransaction();
        var table = switch (provider) {
            case "SQUARE" -> "pos_square_terminals";
            case "MERCADO_PAGO" -> "pos_mercado_pago_terminals";
            default -> throw PosApiException.badRequest("Unsupported terminal provider.");
        };
        if (jdbc.queryForList("SELECT id FROM " + table + " WHERE company_id = ? AND id = ? FOR UPDATE",
                Long.class, context.companyId(), terminalId).isEmpty()) {
            throw PosApiException.notFound("Payment terminal was not found.");
        }
    }
    static void requireTransaction() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Terminal coordination requires an active transaction.");
        }
    }
}
