package com.indice.erp.pos.settlement;

import org.springframework.jdbc.core.JdbcTemplate;

final class TerminalRefundReversalWriter {
    private final JdbcTemplate jdbc;
    private final TerminalRefundAdjustmentAdmission adjustments;
    TerminalRefundReversalWriter(JdbcTemplate jdbc, TerminalRefundAdjustmentAdmission adjustments) {
        this.jdbc = jdbc; this.adjustments = adjustments;
    }
    void record(TerminalRefundRecord value) {
        var square = "SQUARE".equals(value.providerCode());
        if (!square && !"MERCADO_PAGO".equals(value.providerCode()))
            throw new IllegalArgumentException("Terminal refund provider is invalid.");
        adjustments.lockShift(value.companyId(), value.shiftId());
        jdbc.update("""
            INSERT INTO pos_terminal_payment_reversals
            (company_id,provider_code,intent_id,square_intent_id,pos_ticket_id,payment_id,shift_id,
             amount,cumulative_amount,currency_code,provider_refund_id,accounting_state)
            SELECT ?,?,?,?,?,?,?,?,?,?,?,
              CASE WHEN s.closed_at IS NULL THEN 'PRE_CUT' ELSE 'RECONCILIATION_REQUIRED' END
            FROM pos_shifts s WHERE s.company_id=? AND s.id=?
            ON DUPLICATE KEY UPDATE id=pos_terminal_payment_reversals.id
            """, value.companyId(), value.providerCode(), square ? null : value.intentId(),
            square ? value.intentId() : null, value.ticketId(), value.providerPaymentId(), value.shiftId(),
            value.amount(), value.cumulativeAmount(), value.currencyCode(), value.providerRefundId(),
            value.companyId(), value.shiftId());
        adjustments.admit(value.companyId(), value.providerCode(), value.providerRefundId());
    }
}
