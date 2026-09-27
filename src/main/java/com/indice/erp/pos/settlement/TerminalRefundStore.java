package com.indice.erp.pos.settlement;

import com.indice.erp.pos.mercadopago.MpIntent;
import java.math.BigDecimal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundStore {
    private final JdbcTemplate jdbc;
    private final TerminalRefundReversalWriter writer;
    public TerminalRefundStore(JdbcTemplate jdbc, TerminalRefundAdjustmentAdmission adjustments) {
        this.jdbc = jdbc;
        this.writer = new TerminalRefundReversalWriter(jdbc, adjustments);
    }
    public void record(MpIntent intent, String refundId, BigDecimal amount, BigDecimal cumulative) {
        record(new TerminalRefundRecord(intent.companyId(), "MERCADO_PAGO", intent.id(),
            intent.posTicketId(), intent.paymentId(), intent.shiftId(), amount, cumulative,
            "MXN", refundId));
    }
    public void record(TerminalRefundRecord value) { writer.record(value); }
    public BigDecimal confirmed(long companyId, long intentId) {
        return confirmed(companyId, "MERCADO_PAGO", intentId);
    }
    public BigDecimal confirmed(long companyId, String provider, long intentId) {
        var column = switch (provider) {
            case "MERCADO_PAGO" -> "intent_id";
            case "SQUARE" -> "square_intent_id";
            default -> throw new IllegalArgumentException("Unsupported terminal refund provider.");
        };
        return jdbc.queryForObject(("""
            SELECT COALESCE(SUM(amount),0) FROM pos_terminal_payment_reversals
            WHERE company_id=? AND provider_code=? AND %s=?
            """).formatted(column), BigDecimal.class, companyId, provider, intentId);
    }
}
