package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.pos.PosSqlSupport;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundAdjustmentEvidence {
    private final JdbcTemplate jdbc;
    public TerminalRefundAdjustmentEvidence(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    TerminalRefundResolutionEvidence load(long companyId, long adjustmentId) {
        return jdbc.query("""
            SELECT payment.id payment_id,settlement.id settlement_id,
              payment.payment_account_id,settlement.destination_payment_account_id,settlement.status
            FROM pos_terminal_refund_adjustments adjustment
            LEFT JOIN pos_payments payment ON payment.company_id=adjustment.company_id
              AND payment.id=COALESCE(adjustment.pos_payment_id,(SELECT MIN(candidate.id)
                FROM pos_payments candidate WHERE candidate.company_id=adjustment.company_id
                  AND candidate.ticket_id=adjustment.pos_ticket_id AND candidate.shift_id=adjustment.shift_id
                  AND candidate.payment_method='CARD' AND candidate.status='CAPTURED'
                  AND candidate.reference=CASE adjustment.provider_code
                    WHEN 'MERCADO_PAGO' THEN CONCAT('Mercado Pago ',adjustment.provider_payment_id)
                    WHEN 'SQUARE' THEN CONCAT('Square ',adjustment.provider_payment_id) END))
            LEFT JOIN pos_cash_closing_settlements settlement ON settlement.company_id=adjustment.company_id
              AND settlement.cash_closing_id=adjustment.cash_closing_id
              AND settlement.payment_method='CARD' AND settlement.currency_code=adjustment.currency_code
            WHERE adjustment.company_id=? AND adjustment.id=?
            """, (rs, row) -> new TerminalRefundResolutionEvidence(
                PosSqlSupport.nullableLong(rs, "payment_id"), PosSqlSupport.nullableLong(rs, "settlement_id"),
                PosSqlSupport.nullableLong(rs, "payment_account_id"),
                PosSqlSupport.nullableLong(rs, "destination_payment_account_id"), rs.getString("status")),
            companyId, adjustmentId).stream().findFirst().orElse(new TerminalRefundResolutionEvidence(null, null, null, null, null));
    }
}
