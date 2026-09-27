package com.indice.erp.finance.terminalrefunds;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TerminalRefundAdjustmentTransitions {
    private final JdbcTemplate jdbc;
    public TerminalRefundAdjustmentTransitions(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    boolean approve(TerminalRefundAdjustment value, long actor, String reason) {
        return jdbc.update("""
            UPDATE pos_terminal_refund_adjustments SET state='APPROVED',approved_by_user_id=?,
              approved_at=UTC_TIMESTAMP(6),approval_reason=?,failure_code=NULL,failure_message=NULL,version=version+1
            WHERE company_id=? AND id=? AND state='PENDING_REVIEW' AND version=?
            """, actor, reason, value.companyId(), value.id(), value.version()) == 1;
    }
    boolean posted(TerminalRefundAdjustment value, long movementId, String balance) {
        return jdbc.update("""
            UPDATE pos_terminal_refund_adjustments SET state='POSTED',posting_balance=?,treasury_movement_id=?,
              posted_at=UTC_TIMESTAMP(6),failure_code=NULL,failure_message=NULL,version=version+1
            WHERE company_id=? AND id=? AND state IN ('APPROVED','FAILED')
              AND approved_at IS NOT NULL AND version=?
            """, balance, movementId, value.companyId(), value.id(), value.version()) == 1;
    }
    boolean failed(TerminalRefundAdjustment value, String code, String message) {
        return jdbc.update("""
            UPDATE pos_terminal_refund_adjustments SET state='FAILED',failure_code=?,failure_message=?,version=version+1
            WHERE company_id=? AND id=? AND state IN ('APPROVED','FAILED')
              AND approved_at IS NOT NULL AND version=?
            """, code, message, value.companyId(), value.id(), value.version()) == 1;
    }
    boolean reconcile(TerminalRefundAdjustment value, String code, String message) {
        return jdbc.update("""
            UPDATE pos_terminal_refund_adjustments SET state='RECONCILIATION_REQUIRED',
              failure_code=?,failure_message=?,version=version+1
            WHERE company_id=? AND id=? AND state<>'POSTED' AND version=?
            """, code, message, value.companyId(), value.id(), value.version()) == 1;
    }
    boolean resolved(TerminalRefundAdjustment value, TerminalRefundResolutionEvidence proof) {
        return jdbc.update("""
            UPDATE pos_terminal_refund_adjustments SET state='PENDING_REVIEW',pos_payment_id=?,
              cash_closing_settlement_id=?,payment_account_id=?,approved_by_user_id=NULL,
              approved_at=NULL,approval_reason=NULL,posting_balance=NULL,failure_code=NULL,
              failure_message=NULL,version=version+1
            WHERE company_id=? AND id=? AND state='RECONCILIATION_REQUIRED' AND version=?
            """, proof.paymentId(), proof.settlementId(), proof.paymentAccountId(),
            value.companyId(), value.id(), value.version()) == 1;
    }
}
