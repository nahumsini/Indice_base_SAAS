package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.math.BigDecimal;
import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;

class ClosingTicketTotals {
    private final JdbcTemplate jdbc;
    ClosingTicketTotals(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    BigDecimal sales(PosContext context, long shiftId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(ticket.total_amount), 0) FROM pos_tickets ticket "
            + predicate(context), BigDecimal.class, params(context, shiftId));
    }
    int count(PosContext context, long shiftId) {
        var count = jdbc.queryForObject("SELECT COUNT(*) FROM pos_tickets ticket " + predicate(context),
            Integer.class, params(context, shiftId));
        return count == null ? 0 : count;
    }
    private String predicate(PosContext context) {
        return "WHERE ticket.company_id = ? AND ticket.shift_id = ? AND ticket.status = 'COMPLETED' "
            + "AND ticket.deleted_at IS NULL AND " + PosSqlSupport.scopePredicate("ticket", context.scope());
    }
    static Object[] params(PosContext context, long shiftId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(shiftId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params.toArray();
    }
}
