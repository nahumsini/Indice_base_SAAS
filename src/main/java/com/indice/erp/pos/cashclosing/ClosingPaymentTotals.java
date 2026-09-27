package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary;
import com.indice.erp.pos.status.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

class ClosingPaymentTotals {
    private final JdbcTemplate jdbc;
    ClosingPaymentTotals(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    BigDecimal cash(PosContext context, long shiftId) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(payment.amount), 0) " + source(context)
            + " AND payment.payment_method = 'CASH'", BigDecimal.class, ClosingTicketTotals.params(context, shiftId));
    }
    List<PaymentMethodSummary> summary(PosContext context, long shiftId) {
        return jdbc.query("SELECT payment.payment_method, COALESCE(SUM(payment.amount), 0) amount, COUNT(*) count "
            + source(context) + " GROUP BY payment.payment_method ORDER BY payment.payment_method ASC",
            (rs, row) -> new PaymentMethodSummary(PaymentMethod.valueOf(rs.getString("payment_method")),
                rs.getBigDecimal("amount"), rs.getLong("count")), ClosingTicketTotals.params(context, shiftId));
    }
    private String source(PosContext context) {
        return "FROM pos_payments payment JOIN pos_tickets ticket ON ticket.id = payment.ticket_id "
            + "AND ticket.company_id = payment.company_id WHERE payment.company_id = ? AND payment.shift_id = ? "
            + "AND payment.status = 'CAPTURED' AND ticket.status = 'COMPLETED' AND ticket.deleted_at IS NULL AND "
            + PosSqlSupport.scopePredicate("ticket", context.scope());
    }
}
