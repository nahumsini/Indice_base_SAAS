package com.indice.erp.pos.cashclosing;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.math.BigDecimal;
import org.springframework.jdbc.core.JdbcTemplate;
final class ClosingRefundTenderTotals {
    private final JdbcTemplate jdbc;
    ClosingRefundTenderTotals(JdbcTemplate jdbc) {this.jdbc=jdbc;}
    java.util.List<com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary> find(PosContext context, long shiftId, BigDecimal total) {
        var rows = jdbc.query("""
            SELECT payment.payment_method, SUM(payment.amount) amount, COUNT(*) count
            FROM pos_return_payments payment JOIN pos_returns returned
              ON returned.company_id=payment.company_id AND returned.id=payment.return_id
            JOIN pos_tickets ticket ON ticket.company_id=returned.company_id AND ticket.id=returned.ticket_id
            WHERE returned.company_id=? AND returned.shift_id=? AND ticket.shift_id=returned.shift_id
              AND returned.status='COMPLETED' AND payment.status='COMPLETED' AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()) + " GROUP BY payment.payment_method",
            (rs,n)->new com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary(
                com.indice.erp.pos.status.PaymentMethod.valueOf(rs.getString("payment_method")),rs.getBigDecimal("amount"),rs.getLong("count")),
            ClosingTicketTotals.params(context,shiftId));
        var full = rows.stream().map(com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary::amount).reduce(BigDecimal.ZERO,BigDecimal::add);
        var result = new java.util.ArrayList<>(rows);
        result.add(new com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary(com.indice.erp.pos.status.PaymentMethod.CARD,total.subtract(full),0L));
        return java.util.List.copyOf(result);
    }
}
