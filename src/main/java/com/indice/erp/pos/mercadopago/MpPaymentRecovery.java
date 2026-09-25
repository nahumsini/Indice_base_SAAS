package com.indice.erp.pos.mercadopago;

import org.springframework.stereotype.Service;

@Service
public record MpPaymentRecovery(MpMerchantTokens tokens, MpPointGateway gateway,
        MpOrderVerifier verifier, MpActionRequiredRecovery actionRequired,
        MpIntentStore store, MpIntentWriter writer, MpPaymentDispatch dispatch,
        MpPaymentFinalizer finalizer, MpPaymentAudit audit, MpEvidenceApplication application) {
    public boolean recover(MpIntent candidate) {
        return recover(candidate, MpAuditActor.system());
    }
    public boolean recover(MpIntent candidate, MpAuditActor actor) {
        return !recoverEvidence(candidate, actor).equals("UNCERTAIN");
    }
    public String recoverEvidence(MpIntent candidate) { return recoverEvidence(candidate, MpAuditActor.system()); }
    public String recoverEvidence(MpIntent candidate, MpAuditActor actor) {
        if (candidate.orderId() == null) dispatch.send(candidate, actor);
        var intent = store.find(candidate.companyId(), candidate.id()).orElseThrow();
        String freshStatus = "UNCERTAIN";
        if (intent.orderId() != null) {
            try {
                var connection = tokens.connection(intent.companyId());
                if (!connection.sellerId().equals(intent.sellerId())
                        || connection.id() != intent.connectionId() || !connection.environment().equals(intent.environment())) {
                    throw new IllegalStateException("Original merchant connection is unavailable.");
                }
                var verified = tokens.withCompanyToken(intent.companyId(), token -> {
                    var order = gateway.getOrder(token, intent.orderId());
                    return new MpVerifiedOrder(order, actionRequired.verify(intent, order, token,
                        verifier.verify(intent, order)));
                });
                if (application.apply(intent, verified, actor)) freshStatus = verified.evidence().status();
            } catch (RuntimeException exception) {
                writer.uncertain(intent, "Provider verification failed. Recover this payment before retrying.");
            }
        }
        var current = store.find(intent.companyId(), intent.id()).orElseThrow();
        if (freshStatus.equals("APPROVED") && current.status().equals("APPROVED") && current.posTicketId() == null) {
            try {
                finalizer.finalizeApproved(current, actor);
            } catch (RuntimeException exception) {
                writer.uncertain(current, "Payment received; sale completion requires recovery.");
                audit.recordAs(current, actor, "SALE_RECOVERY_REQUIRED", "APPROVED");
            }
        }
        return freshStatus;
    }
}
