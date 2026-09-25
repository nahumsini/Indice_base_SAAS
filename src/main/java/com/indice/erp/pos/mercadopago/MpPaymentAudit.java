package com.indice.erp.pos.mercadopago;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@lombok.RequiredArgsConstructor
public class MpPaymentAudit {
    private final JdbcTemplate jdbc;
    public void record(MpIntent intent, String event, String status) {
        recordAs(intent, MpAuditActor.system(), event, status);
    }
    public void recordAs(MpIntent intent, MpAuditActor actor, String event, String status) {
        recordAs(intent.companyId(), actor, intent.id(), event, status);
    }

    public void record(long companyId, Long actorId, Long intentId, String event, String status) {
        recordAs(companyId, actorId == null ? MpAuditActor.system() : MpAuditActor.user(actorId),
            intentId, event, status);
    }
    public void recordAs(long companyId, MpAuditActor actor, Long intentId, String event, String status) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_audit_events
            (company_id,intent_id,actor_user_id,actor_type,event_type,status)
            VALUES (?,?,?,?,?,?)
            """, companyId, intentId, actor.userId(), actor.type(), event, status);
    }
    public void review(MpIntent intent, MpAuditActor actor, String event, String status,
            String reason, long version) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_audit_events
            (company_id,intent_id,actor_user_id,actor_type,event_type,status,reason,record_version)
            VALUES (?,?,?,?,?,?,?,?)
            """, intent.companyId(), intent.id(), actor.userId(), actor.type(), event, status, reason, version);
    }
    public void refund(MpRefundRecord refund, MpAuditActor actor, String event, String status) {
        jdbc.update("""
            INSERT INTO pos_mercado_pago_audit_events
            (company_id,intent_id,actor_user_id,actor_type,event_type,status,record_version)
            VALUES (?,?,?,?,?,?,?)
            """, refund.companyId(), refund.intentId(), actor.userId(), actor.type(),
            event, status, refund.version());
    }
}
