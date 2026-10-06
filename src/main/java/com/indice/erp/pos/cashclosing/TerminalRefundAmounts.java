package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.math.BigDecimal;
import org.springframework.jdbc.core.JdbcTemplate;

class TerminalRefundAmounts {
    private final JdbcTemplate jdbc;
    TerminalRefundAmounts(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    BigDecimal sum(PosContext context, long shiftId) {
        var terminalRefunds = jdbc.queryForObject("""
            SELECT COALESCE(SUM(reversal.amount), 0) FROM pos_terminal_payment_reversals reversal
            JOIN pos_tickets ticket ON ticket.id = reversal.pos_ticket_id AND ticket.company_id = reversal.company_id
            WHERE reversal.company_id = ? AND reversal.shift_id = ? AND ticket.shift_id = reversal.shift_id
              AND reversal.currency_code = ticket.currency_code AND ticket.status = 'COMPLETED' AND ticket.deleted_at IS NULL
              AND EXISTS (SELECT 1 FROM pos_payments payment WHERE payment.company_id = reversal.company_id
                AND payment.ticket_id = ticket.id AND payment.shift_id = reversal.shift_id
                AND payment.payment_method = 'CARD' AND payment.status = 'CAPTURED')
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()),
            BigDecimal.class, ClosingTicketTotals.params(context, shiftId));
        var fullReturns = jdbc.queryForObject("""
            SELECT COALESCE(SUM(returned.total_amount), 0) FROM pos_returns returned
            JOIN pos_tickets ticket ON ticket.id = returned.ticket_id AND ticket.company_id = returned.company_id
            WHERE returned.company_id = ? AND returned.shift_id = ? AND ticket.shift_id = returned.shift_id
              AND returned.status = 'COMPLETED' AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()),
            BigDecimal.class, ClosingTicketTotals.params(context, shiftId));
        return zeroIfNull(terminalRefunds).add(zeroIfNull(fullReturns));
    }

    java.util.List<com.indice.erp.pos.cashclosing.dto.PaymentMethodSummary> byMethod(PosContext context, long shiftId) {
        return new ClosingRefundTenderTotals(jdbc).find(context,shiftId,sum(context,shiftId));
    }
    private BigDecimal zeroIfNull(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }
}
