package com.indice.erp.pos.terminal;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalBindingRepository {
    private final TerminalBindingQueries queries;
    public TerminalBindingRepository(TerminalBindingQueries queries) {
        this.queries = queries;
    }
    public TerminalBinding find(PosContext context, long registerId) {
        return unique(queries.find(context, registerId, false));
    }
    TerminalBinding findLocked(PosContext context, long registerId) {
        return unique(queries.find(context, registerId, true));
    }
    public List<Long> assignedRegisters(PosContext context, String provider, long terminalId) {
        if (!List.of("SQUARE", "MERCADO_PAGO").contains(provider))
            throw PosApiException.badRequest("Unsupported terminal provider.");
        return queries.assignedRegisters(context, provider, terminalId);
    }
    private TerminalBinding unique(List<TerminalBinding> rows) {
        if (rows.size() > 1) throw PosApiException.conflict("Register has ambiguous terminal bindings.");
        return rows.isEmpty() ? TerminalBinding.unassigned() : rows.getFirst();
    }
}
