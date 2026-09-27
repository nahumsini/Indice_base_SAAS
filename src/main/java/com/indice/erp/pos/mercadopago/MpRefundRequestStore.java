package com.indice.erp.pos.mercadopago;

import java.math.BigDecimal;
import java.util.Optional;
import com.indice.erp.pos.PosContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpRefundRequestStore {
    private final JdbcTemplate jdbc;
    private final MpRefundRequestMapper mapper;
    public Optional<MpRefundRecord> find(long companyId, long id) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_refund_requests WHERE company_id=? AND id=?",
            mapper, companyId, id).stream().findFirst();
    }
    public Optional<MpRefundRecord> byKey(long companyId, String key) {
        return jdbc.query("SELECT * FROM pos_mercado_pago_refund_requests WHERE company_id=? AND request_key=?",
            mapper, companyId, key).stream().findFirst();
    }

    public MpRefundRecord create(PosContext context, MpIntent intent, MpRefundRequest request,
            BigDecimal amount, BigDecimal baseline, String json, String hash) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_refund_requests
            (company_id,intent_id,request_key,amount,baseline_amount,request_json,payload_hash,reason,
             requested_by_user_id,requested_by_role,requested_scope_type,
             requested_scope_unit_id,requested_scope_business_id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, intent.companyId(), intent.id(), request.idempotencyKey(), amount,
            baseline, json, hash, request.reason(), context.userId(), context.role(),
            context.scope().type().name(), context.scope().unitId(), context.scope().businessId());
        return byKey(intent.companyId(), request.idempotencyKey()).orElseThrow();
    }

    public void confirm(MpIntent intent, BigDecimal cumulative) {
        jdbc.update("""
            UPDATE pos_mercado_pago_refund_requests SET status='CONFIRMED',work_lease_id=NULL,
            work_lease_until=NULL,last_error_code=NULL,last_provider_check_at=UTC_TIMESTAMP(6),
            version=version+1,updated_at=UTC_TIMESTAMP(6)
            WHERE company_id=? AND intent_id=? AND baseline_amount+amount<=?
            AND status IN ('WAITING','SUBMITTING','PENDING','UNCERTAIN','RECONCILIATION_REQUIRED','DEAD_LETTER')
            """, intent.companyId(), intent.id(), cumulative);
    }
}
