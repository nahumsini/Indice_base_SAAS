package com.indice.erp.pos.settlement;

import org.springframework.jdbc.core.JdbcTemplate;

record TerminalRefundAdjustmentInsert(JdbcTemplate jdbc) {
    void insert(long company, String provider, String refund) {
        jdbc.update("""
            INSERT INTO pos_terminal_refund_adjustments
              (company_id,reversal_id,provider_code,intent_id,square_intent_id,provider_payment_id,
               provider_refund_id,pos_ticket_id,pos_payment_id,shift_id,cash_closing_id,
               cash_closing_settlement_id,payment_account_id,unit_id,business_id,amount,currency_code,state,failure_code)
            SELECT r.company_id,r.id,r.provider_code,r.intent_id,r.square_intent_id,r.payment_id,
              r.provider_refund_id,r.pos_ticket_id,p.id,r.shift_id,c.id,s.id,
              COALESCE(p.payment_account_id,s.destination_payment_account_id),c.unit_id,c.business_id,
              r.amount,r.currency_code,
              CASE WHEN p.id IS NOT NULL AND s.id IS NOT NULL AND p.payment_account_id IS NOT NULL
                AND p.payment_account_id=s.destination_payment_account_id THEN 'PENDING_REVIEW'
                ELSE 'RECONCILIATION_REQUIRED' END,
              CASE WHEN p.id IS NULL THEN 'LOCAL_PAYMENT_MISSING' WHEN s.id IS NULL THEN 'SETTLEMENT_MISSING'
                WHEN p.payment_account_id IS NULL OR p.payment_account_id<>s.destination_payment_account_id
                THEN 'ACCOUNT_MISMATCH' ELSE NULL END
            FROM pos_terminal_payment_reversals r
            JOIN pos_cash_closings c ON c.company_id=r.company_id AND c.shift_id=r.shift_id AND c.deleted_at IS NULL
            LEFT JOIN pos_payments p ON p.id=(SELECT MIN(candidate.id) FROM pos_payments candidate
              WHERE candidate.company_id=r.company_id AND candidate.ticket_id=r.pos_ticket_id
                AND candidate.shift_id=r.shift_id AND candidate.payment_method='CARD'
                AND candidate.status='CAPTURED' AND candidate.reference=CASE r.provider_code
                  WHEN 'MERCADO_PAGO' THEN CONCAT('Mercado Pago ',r.payment_id)
                  WHEN 'SQUARE' THEN CONCAT('Square ',r.payment_id) END)
            LEFT JOIN pos_cash_closing_settlements s ON s.company_id=r.company_id
              AND s.cash_closing_id=c.id AND s.payment_method='CARD' AND s.currency_code=r.currency_code
            WHERE r.company_id=? AND r.provider_code=? AND r.provider_refund_id=?
              AND r.pos_ticket_id IS NOT NULL
            ON DUPLICATE KEY UPDATE id=pos_terminal_refund_adjustments.id
            """, company, provider, refund);
    }
}
