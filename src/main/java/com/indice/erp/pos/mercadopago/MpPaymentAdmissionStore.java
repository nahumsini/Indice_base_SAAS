package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@lombok.RequiredArgsConstructor
public class MpPaymentAdmissionStore {
    private final JdbcTemplate jdbc;
    private final MpPaymentAdmissionReader reader;
    public MpPaymentAdmission claim(PosContext context, MpCreatePayment request, String hash) {
        return claim(context, request.idempotencyKey(), request.cashRegisterId(), hash);
    }
    public MpPaymentAdmission claim(PosContext context, String key, long registerId, String hash) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_payment_admissions
            (company_id,idempotency_key,cash_register_id,created_by_user_id,unit_id,business_id,
             scope_type,scope_unit_id,scope_business_id,payload_hash,status)
            SELECT r.company_id,?,r.id,?,r.unit_id,r.business_id,?,?,?,?,'RESERVED'
            FROM pos_cash_registers r WHERE r.company_id=? AND r.id=? AND r.deleted_at IS NULL
            ON DUPLICATE KEY UPDATE id=pos_mercado_pago_payment_admissions.id
            """, key, context.userId(), context.scope().type().name(),
            context.scope().unitId(), context.scope().businessId(), hash, context.companyId(), registerId);
        var admission = reader.lock(context.companyId(), key);
        admission.requireOwner(context, registerId);
        return admission;
    }
    public MpPaymentNotSubmittedException reject(PosContext context, MpPaymentAdmission admission, PosApiException error) {
        return reject(context, admission, "PREFLIGHT_REJECTED", error);
    }
    public MpPaymentNotSubmittedException reject(PosContext context, MpPaymentAdmission admission, String reason, PosApiException error) {
        var message = error.getMessage().substring(0, Math.min(error.getMessage().length(), 500));
        var changed = jdbc.update("UPDATE pos_mercado_pago_payment_admissions "
            + "SET status='REJECTED',reason=?,message=?,status_code=? "
            + "WHERE company_id=? AND idempotency_key=? AND cash_register_id=? "
            + "AND created_by_user_id=? AND payload_hash=? AND status='RESERVED'",
            reason, message, error.status().value(), context.companyId(), admission.key(),
            admission.registerId(), context.userId(), admission.payloadHash());
        if (changed != 1) throw PosApiException.conflict("Payment admission could not be resolved.");
        return new MpPaymentNotSubmittedException(error.status(), admission.key(), message);
    }
}
