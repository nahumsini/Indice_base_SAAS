package com.indice.erp.pos.returns;

final class PosReturnSql {
    private PosReturnSql() {}
    static final String FIND = """
        WITH tenant AS (SELECT ? company_id), intents AS (
          SELECT 'MERCADO_PAGO' provider_code,i.id,i.company_id,i.pos_ticket_id,i.status,i.amount,i.created_at
            FROM pos_mercado_pago_payment_intents i JOIN tenant x ON x.company_id=i.company_id
          UNION ALL
          SELECT 'SQUARE',i.id,i.company_id,i.pos_ticket_id,i.status,i.amount,i.created_at
            FROM pos_square_terminal_payment_intents i JOIN tenant x ON x.company_id=i.company_id
        ), ranked_intents AS (
          SELECT i.*,ROW_NUMBER() OVER(PARTITION BY company_id,pos_ticket_id
            ORDER BY created_at DESC,id DESC) row_num FROM intents i
        ), refunds AS (
          SELECT 'MERCADO_PAGO' provider_code,r.id,r.company_id,r.intent_id,r.request_key,r.amount,r.status,r.reason,r.updated_at,r.version
            FROM pos_mercado_pago_refund_requests r JOIN tenant x ON x.company_id=r.company_id
          UNION ALL
          SELECT 'SQUARE',r.id,r.company_id,r.intent_id,r.request_key,r.amount,r.status,r.reason,r.updated_at,r.version
            FROM pos_square_refund_requests r JOIN tenant x ON x.company_id=r.company_id
        ), ranked_refunds AS (
          SELECT r.*,ROW_NUMBER() OVER(PARTITION BY company_id,provider_code,intent_id
            ORDER BY id DESC) row_num FROM refunds r
        )
        SELECT t.id ticket_id,t.ticket_number,t.status ticket_status,t.completed_at,
          t.total_amount sale_amount,t.currency_code,i.provider_code,i.id intent_id,
          i.status provider_status,COALESCE(i.amount,0) payment_amount,
          COALESCE((SELECT SUM(v.amount) FROM pos_terminal_payment_reversals v
            WHERE v.company_id=t.company_id AND v.provider_code=i.provider_code
            AND CASE i.provider_code WHEN 'SQUARE' THEN v.square_intent_id ELSE v.intent_id END=i.id),0) refunded_amount,
          rr.id refund_id,rr.request_key,rr.amount refund_amount,rr.status refund_status,
          rr.reason refund_reason,rr.updated_at refund_updated_at,rr.version refund_version
        FROM pos_tickets t JOIN tenant ON tenant.company_id=t.company_id
        LEFT JOIN ranked_intents i ON i.company_id=t.company_id AND i.pos_ticket_id=t.id AND i.row_num=1
        LEFT JOIN ranked_refunds rr ON rr.company_id=t.company_id AND rr.provider_code=i.provider_code
          AND rr.intent_id=i.id AND rr.row_num=1
        WHERE t.ticket_number=? AND t.deleted_at IS NULL AND
        """;
}
