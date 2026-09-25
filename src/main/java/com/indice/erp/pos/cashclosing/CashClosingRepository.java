package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.cashmovement.CashMovementType;
import com.indice.erp.pos.shift.ShiftRecord;
import java.math.BigDecimal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CashClosingRepository {
    private final JdbcTemplate jdbc;
    private final ClosingTicketTotals tickets;
    private final ClosingPaymentTotals payments;
    private final ClosingMovementTotals movements;
    private final ClosingRecordInsert insertion;
    private final TerminalRefundAmounts refunds;
    public CashClosingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.tickets = new ClosingTicketTotals(jdbc);
        this.payments = new ClosingPaymentTotals(jdbc);
        this.movements = new ClosingMovementTotals(jdbc);
        this.insertion = new ClosingRecordInsert(jdbc);
        this.refunds = new TerminalRefundAmounts(jdbc);
    }
    public boolean existsClosing(PosContext context, long shiftId) {
        var count = jdbc.queryForObject("SELECT COUNT(*) FROM pos_cash_closings "
            + "WHERE company_id = ? AND shift_id = ? AND deleted_at IS NULL", Long.class, context.companyId(), shiftId);
        return count != null && count > 0;
    }
    public CashClosingAmounts calculateAmounts(PosContext context, ShiftRecord shift) {
        var totals = movements.find(context, shift.id());
        return new CashClosingAmounts(shift.openingAmount() == null ? BigDecimal.ZERO : shift.openingAmount(),
            payments.cash(context, shift.id()), totals.getOrDefault(CashMovementType.CASH_IN, BigDecimal.ZERO),
            totals.getOrDefault(CashMovementType.CASH_OUT, BigDecimal.ZERO), totals.getOrDefault(CashMovementType.SAFE_DROP, BigDecimal.ZERO),
            totals.getOrDefault(CashMovementType.CORRECTION, BigDecimal.ZERO), tickets.sales(context, shift.id()),
            refunds.sum(context, shift.id()), tickets.count(context, shift.id()), payments.summary(context, shift.id()));
    }
    public long insertClosing(PosContext context, ShiftRecord shift, CashClosingAmounts amounts, CashClosingCommand command) {
        return insertion.insert(context, shift, amounts, command);
    }
    String paymentsSummaryJson(CashClosingAmounts amounts) {
        return PosJsonSupport.toJson(amounts.paymentsSummary());
    }
}
