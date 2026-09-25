package com.indice.erp.pos.mercadopago;

import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MpRefundTransition {
    private final MpRefundWorkStatus statuses; private final MpRefundRequestStore requests;
    private final MpPaymentAudit audit;
    MpRefundTransition(MpRefundWorkStatus statuses, MpRefundRequestStore requests, MpPaymentAudit audit) {
        this.statuses=statuses; this.requests=requests; this.audit=audit;
    }
    @Transactional
    public Optional<MpRefundRecord> complete(MpRefundRecord refund, String lease,
            MpAuditActor actor, String status, String error, Instant next) {
        if (!statuses.complete(refund, lease, status, error, next)) return Optional.empty();
        return audited(refund, actor, status);
    }
    @Transactional
    public Optional<MpRefundRecord> checked(MpRefundRecord refund, String lease,
            String status, String error, Instant next, boolean auditable) {
        if (!statuses.checked(refund, lease, status, error, next)) return Optional.empty();
        var current = current(refund);
        if (auditable) audit.refund(current, MpAuditActor.scheduled(), "REFUND_" + status, status);
        return Optional.of(current);
    }
    @Transactional
    public Optional<MpRefundRecord> unresolved(MpRefundRecord refund, String status, String error) {
        if (!statuses.unresolved(refund, status, error)) return Optional.empty();
        return audited(refund, MpAuditActor.scheduled(), status);
    }
    private Optional<MpRefundRecord> audited(MpRefundRecord refund, MpAuditActor actor, String status) {
        var current=current(refund); audit.refund(current, actor, "REFUND_" + status, status);
        return Optional.of(current);
    }
    private MpRefundRecord current(MpRefundRecord refund) {
        return requests.find(refund.companyId(), refund.id()).orElseThrow();
    }
}
