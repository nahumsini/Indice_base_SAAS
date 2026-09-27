package com.indice.erp.pos.mercadopago;

import com.indice.erp.pos.checkout.VerifiedTerminalCheckout;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MpPaymentFinalizer {
    private final MpIntentStore intents;
    private final MpIntentWriter writer;
    private final VerifiedTerminalCheckout checkout;
    private final TerminalPaymentGuard guard;
    private final MpJson json;
    private final MpPaymentAudit audit;

    public MpPaymentFinalizer(MpIntentStore intents, MpIntentWriter writer,
            VerifiedTerminalCheckout checkout, TerminalPaymentGuard guard,
            MpJson json, MpPaymentAudit audit) {
        this.intents = intents;
        this.writer = writer;
        this.checkout = checkout;
        this.guard = guard;
        this.json = json;
        this.audit = audit;
    }
    @Transactional
    public void finalizeApproved(MpIntent candidate) {
        finalizeApproved(candidate, MpAuditActor.system());
    }
    @Transactional
    public void finalizeApproved(MpIntent candidate, MpAuditActor actor) {
        guard.lockRegister(candidate.context(), candidate.cashRegisterId());
        var intent = intents.lock(candidate.companyId(), candidate.id());
        if (!intent.status().equals("APPROVED") || intent.posTicketId() != null
                || intent.paymentId() == null || intent.refundPending()) return;
        var request = json.read(intent.checkoutJson(), MpCreatePayment.class);
        var result = checkout.checkout(intent.context(), MpCheckoutRequest.from(request,
            intent.amount(), "Mercado Pago " + intent.paymentId()), "MERCADO_PAGO",
            intent.id(), intent.shiftId());
        writer.finalized(intent, result.ticket().id());
        audit.recordAs(intent, actor, "SALE_COMPLETED", "APPROVED");
    }
}
