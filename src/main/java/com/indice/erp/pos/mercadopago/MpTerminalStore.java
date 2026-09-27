package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class MpTerminalStore {
    private final JdbcTemplate jdbc;
    private final MpProperties properties;
    private final MpTerminalMapper mapper;

    public List<MpTerminal> list(PosContext context) { return query(context, " ORDER BY t.id", List.of()); }
    public MpTerminal require(PosContext context, long id, boolean lock) {
        return query(context, " AND t.id=?" + (lock ? " FOR UPDATE" : ""), List.of(id)).stream().findFirst()
            .orElseThrow(() -> PosApiException.notFound("Point terminal is unavailable."));
    }
    public MpTerminal requireBinding(PosContext context, long registerId) {
        return query(context, " AND t.cash_register_id=?", List.of(registerId)).stream().findFirst()
            .orElseThrow(() -> PosApiException.conflict("Register has no assigned Point terminal."));
    }
    public MpTerminal requireVerified(PosContext context, long registerId, MpTerminalVerificationProof proof) {
        var terminal = query(context, " AND t.id=? AND t.cash_register_id=? FOR UPDATE",
            List.of(proof.terminalId(), registerId)).stream().findFirst()
            .orElseThrow(() -> PosApiException.conflict("Register has no assigned Point terminal."));
        proof.requireSame(terminal);
        MpTerminalEligibility.requireReady(terminal, registerId);
        return terminal;
    }
    private List<MpTerminal> query(PosContext context, String suffix, List<?> extra) {
        var params = new ArrayList<Object>(List.of(context.companyId(), properties.environment()));
        PosSqlSupport.appendScopeParams(params, context.scope());
        params.addAll(extra);
        String sql = """
            SELECT t.* FROM pos_mercado_pago_terminals t JOIN pos_mercado_pago_connections c
            ON c.id=t.connection_id AND c.company_id=t.company_id
            WHERE t.company_id=? AND c.environment=? AND c.state='CONNECTED'
            AND (t.cash_register_id IS NULL OR EXISTS (SELECT 1 FROM pos_cash_registers r
            WHERE r.id=t.cash_register_id AND r.company_id=t.company_id AND r.deleted_at IS NULL AND
            """ + PosSqlSupport.scopePredicate("r", context.scope()) + "))" + suffix;
        return jdbc.query(sql, mapper::map, params.toArray());
    }
}
